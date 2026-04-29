/**
 * FCM Service
 * Wraps firebase-admin messaging with:
 *  - single-user send
 *  - multi-user broadcast
 *  - automatic stale-token cleanup
 */
const FcmToken = require('../models/FcmToken');
const { getFirebaseAdmin } = require('../config/firebase-admin');

// Lightweight in-memory cache to prevent identical pushes to the same user within 2 seconds
const sentHistory = new Map();
const COOLDOWN_MS = 2000;

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */

/**
 * Mark tokens that firebase rejected as inactive so they get
 * cleaned up and we don't keep trying them.
 */
async function deactivateTokens(tokens) {
  if (!tokens || tokens.length === 0) return;
  try {
    await FcmToken.updateMany(
      { token: { $in: tokens } },
      { isActive: false }
    );
    console.log(`[FCM] Deactivated ${tokens.length} stale token(s)`);
  } catch (err) {
    console.error('[FCM] Error deactivating tokens:', err.message);
  }
}

/* ─────────────────────────────────────────────────────────────
   Core send function (handles up to 500 tokens per batch)
───────────────────────────────────────────────────────────── */

/**
 * @param {string[]} tokens  - Array of FCM registration tokens
 * @param {object}   payload - { title, body, data?, imageUrl? }
 * @returns {object}          - { successCount, failureCount }
 */
async function sendToTokens(tokens, payload) {
  const admin = getFirebaseAdmin();
  if (!admin) {
    console.warn('[FCM] Firebase Admin not available – skipping push');
    return { successCount: 0, failureCount: 0 };
  }

  if (!tokens || tokens.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  const { title, body, data = {}, imageUrl } = payload;

  // firebase-admin v12 uses sendEachForMulticast
  const message = {
    tokens,
    notification: {
      title,
      body,
      ...(imageUrl && { imageUrl }),
    },
    data: {
      ...Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      clickAction: data.url || '/',
    },
    webpush: {
      fcmOptions: { link: data.url || '/' },
      notification: {
        title,
        body,
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        ...(imageUrl && { image: imageUrl }),
        // Standard Web Push click action
        clickAction: data.url || '/',
      },
    },
    android: {
      notification: {
        sound: 'default',
        priority: 'high',
      },
    },
    apns: {
      payload: {
        aps: { sound: 'default' },
      },
    },
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    const staleTokens = [];

    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const code = resp.error?.code;
        // These codes mean the token is permanently invalid
        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-argument'
        ) {
          staleTokens.push(tokens[idx]);
        }
        console.error(`[FCM] Token ${idx} failed:`, code);
      }
    });

    if (staleTokens.length > 0) {
      await deactivateTokens(staleTokens);
    }

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
    };
  } catch (err) {
    console.error('[FCM] sendEachForMulticast error:', err.message);
    return { successCount: 0, failureCount: tokens.length };
  }
}

/* ─────────────────────────────────────────────────────────────
   Public API
───────────────────────────────────────────────────────────── */

/**
 * Send a push notification to a single user (all their devices).
 * @param {string} userId   - MongoDB ObjectId string
 * @param {object} payload  - { title, body, data?, imageUrl? }
 */
async function sendToUser(userId, payload) {
  try {
    const { title, body } = payload;
    const uId = String(userId);
    const dedupeKey = `${uId}:${title}:${body}`;

    // Cooldown check
    const lastSent = sentHistory.get(dedupeKey);
    if (lastSent && Date.now() - lastSent < COOLDOWN_MS) {
      console.log(`[FCM] Blocking duplicate push to ${uId} (Cooldown active)`);
      return { successCount: 0, failureCount: 0 };
    }
    sentHistory.set(dedupeKey, Date.now());

    // Clean up cache periodically (roughly 1 in 100 calls)
    if (Math.random() < 0.01) {
      const now = Date.now();
      for (const [key, timestamp] of sentHistory.entries()) {
        if (now - timestamp > COOLDOWN_MS * 5) sentHistory.delete(key);
      }
    }

    const tokenDocs = await FcmToken.find({ user: userId, isActive: true });
    if (tokenDocs.length === 0) return { successCount: 0, failureCount: 0 };

    // Deduplicate tokens by string value
    const tokens = [...new Set(tokenDocs.map(d => d.token))];
    
    console.log(`[FCM] Sending to user ${uId}. Found ${tokenDocs.length} tokens, ${tokens.length} unique.`);

    await FcmToken.updateMany(
      { user: userId, isActive: true },
      { lastUsed: new Date() }
    );

    return sendToTokens(tokens, payload);
  } catch (err) {
    console.error('[FCM] sendToUser error:', err.message);
    return { successCount: 0, failureCount: 0 };
  }
}

/**
 * Broadcast to multiple users.
 * @param {string[]} userIds  - Array of MongoDB ObjectId strings
 * @param {object}   payload  - { title, body, data?, imageUrl? }
 */
async function sendToUsers(userIds, payload) {
  try {
    if (!userIds || userIds.length === 0) return { successCount: 0, failureCount: 0 };

    const tokenDocs = await FcmToken.find({
      user: { $in: userIds },
      isActive: true,
    });

    if (tokenDocs.length === 0) return { successCount: 0, failureCount: 0 };

    const tokens = [...new Set(tokenDocs.map(d => d.token))];
    console.log(`[FCM] Broadcasting to ${userIds.length} users. Found ${tokenDocs.length} tokens, ${tokens.length} unique.`);

    // FCM multicast max 500 per call — chunk if needed
    const CHUNK_SIZE = 500;
    let totalSuccess = 0;
    let totalFailure = 0;

    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const chunk = tokens.slice(i, i + CHUNK_SIZE);
      const result = await sendToTokens(chunk, payload);
      totalSuccess += result.successCount;
      totalFailure += result.failureCount;
    }

    return { successCount: totalSuccess, failureCount: totalFailure };
  } catch (err) {
    console.error('[FCM] sendToUsers error:', err.message);
    return { successCount: 0, failureCount: 0 };
  }
}

/**
 * Broadcast to ALL users who have an active token.
 * @param {object} payload - { title, body, data?, imageUrl? }
 */
async function broadcastToAll(payload) {
  try {
    const tokenDocs = await FcmToken.find({ isActive: true });
    if (tokenDocs.length === 0) return { successCount: 0, failureCount: 0 };

    const tokens = [...new Set(tokenDocs.map(d => d.token))];
    console.log(`[FCM] Broadcasting to ALL users. Found ${tokenDocs.length} tokens, ${tokens.length} unique.`);
    const CHUNK_SIZE = 500;
    let totalSuccess = 0;
    let totalFailure = 0;

    for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
      const chunk = tokens.slice(i, i + CHUNK_SIZE);
      const result = await sendToTokens(chunk, payload);
      totalSuccess += result.successCount;
      totalFailure += result.failureCount;
    }

    return { successCount: totalSuccess, failureCount: totalFailure };
  } catch (err) {
    console.error('[FCM] broadcastToAll error:', err.message);
    return { successCount: 0, failureCount: 0 };
  }
}

/* ─────────────────────────────────────────────────────────────
   Named notification helpers (used by complaint controller)
───────────────────────────────────────────────────────────── */

async function notifyComplaintCreated(userId, complaintId, complaintCode) {
  return sendToUser(userId, {
    title: '✅ Complaint Submitted',
    body: `Your complaint ${complaintCode} has been received and is under review.`,
    data: { type: 'complaint_created', complaintId, url: `/dashboard/complaints/${complaintId}` },
  });
}

async function notifyComplaintAssigned(userId, complaintId, complaintCode, department) {
  return sendToUser(userId, {
    title: '👷 Complaint Assigned',
    body: `Your complaint ${complaintCode} has been assigned to the ${department} department.`,
    data: { type: 'complaint_assigned', complaintId, url: `/dashboard/complaints/${complaintId}` },
  });
}

async function notifyComplaintResolved(userId, complaintId, complaintCode) {
  return sendToUser(userId, {
    title: '🎉 Complaint Resolved',
    body: `Your complaint ${complaintCode} has been resolved. Please review and confirm.`,
    data: { type: 'complaint_resolved', complaintId, url: `/dashboard/complaints/${complaintId}` },
  });
}

async function notifyVotingThreshold(userIds, complaintId, complaintCode, percent) {
  return sendToUsers(userIds, {
    title: `🗳️ Voting Milestone – ${percent}%`,
    body: `Complaint ${complaintCode} has reached ${percent}% community support. It may be escalated soon.`,
    data: { type: 'vote_threshold', complaintId, url: `/dashboard/complaints/${complaintId}` },
  });
}

module.exports = {
  sendToUser,
  sendToUsers,
  broadcastToAll,
  notifyComplaintCreated,
  notifyComplaintAssigned,
  notifyComplaintResolved,
  notifyVotingThreshold,
};
