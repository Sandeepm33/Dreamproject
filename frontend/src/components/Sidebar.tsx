'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { api } from '@/lib/api';

const citizenNav = [
  { href: '/dashboard/citizen', icon: '🏠', label: 'Home' },
  { href: '/dashboard/citizen/complaints', icon: '📋', label: 'My Complaints' },
  { href: '/dashboard/citizen/new-complaint', icon: '➕', label: 'Raise Issue' },
  { href: '/dashboard/citizen/track', icon: '🔍', label: 'Track Status' },
  { href: '/dashboard/citizen/notifications', icon: '🔔', label: 'Notifications', countKey: 'notifications' },
  { href: '/dashboard/citizen/profile', icon: '👤', label: 'Profile' },
];

const adminNav = [
  { href: '/dashboard/admin', icon: '📊', label: 'Overview' },
  { href: '/dashboard/admin/complaints', icon: '📋', label: 'All Complaints' },
  { href: '/dashboard/admin/assign', icon: '🎯', label: 'Assign Issues' },
  { href: '/dashboard/admin/users', icon: '👥', label: 'Manage Users' },
  { href: '/dashboard/admin/analytics', icon: '📈', label: 'Analytics' },
  { href: '/dashboard/admin/notifications', icon: '📢', label: 'Broadcast', countKey: 'notifications' },
];

const officerNav = [
  { href: '/dashboard/officer', icon: '📊', label: 'Dashboard' },
  { href: '/dashboard/officer/assigned', icon: '📋', label: 'Assigned Issues' },
  { href: '/dashboard/officer/update', icon: '✏️', label: 'Update Status' },
  { href: '/dashboard/officer/notifications', icon: '🔔', label: 'Notifications', countKey: 'notifications' },
];

interface SidebarProps {
  collapsed?: boolean;
  onCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ collapsed, onCollapse, isMobileOpen, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const [unreadCount, setUnreadCount] = useState(0);
  const [complaintCount, setComplaintCount] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await api.getNotifications();
      const unread = (res.notifications || []).filter((n: any) => !n.isRead).length;
      setUnreadCount(unread);
    } catch {}
  }, []);

  const fetchComplaintCount = useCallback(async () => {
    try {
      // For citizens: My Complaints count
      // For officers: Assigned Issues count
      // We only fetch 'total' from the first page result
      const res = await api.getComplaints({ limit: 1 });
      setComplaintCount(res.total || 0);
    } catch {}
  }, []);

  useEffect(() => {
    if (user) {
      fetchUnread();
      fetchComplaintCount();
      const interval = setInterval(() => {
        fetchUnread();
        fetchComplaintCount();
      }, 10000); 
      return () => clearInterval(interval);
    }
  }, [user, fetchUnread, fetchComplaintCount]);

  const nav = user?.role === 'citizen' ? [
    { href: '/dashboard/citizen', icon: '🏠', label: t('dashboard') },
    { href: '/dashboard/citizen/complaints', icon: '📋', label: t('myComplaints'), countKey: 'complaints' },
    { href: '/dashboard/citizen/new-complaint', icon: '➕', label: t('newComplaint') },
    { href: '/dashboard/citizen/notifications', icon: '🔔', label: t('notifications'), countKey: 'notifications' },
    { href: '/dashboard/citizen/profile', icon: '👤', label: t('profile') }
  ] : user?.role === 'officer' ? [
    { href: '/dashboard/officer', icon: '📊', label: t('dashboard') },
    { href: '/dashboard/citizen/complaints', icon: '📋', label: t('myComplaints'), countKey: 'complaints' },
    { href: '/dashboard/citizen/new-complaint', icon: '➕', label: t('newComplaint') },
    { href: '/dashboard/officer/assigned', icon: '📋', label: t('assignedIssues') },
    { href: '/dashboard/officer/notifications', icon: '🔔', label: t('notifications'), countKey: 'notifications' },
    { href: '/dashboard/citizen/profile', icon: '👤', label: t('profile') }
  ] : user?.role === 'collector' ? [
    { href: '/dashboard/admin/users', icon: '👥', label: t('manageUsers') },
    { href: '/dashboard/admin/villages', icon: '🏛️', label: t('manageVillages') },
    { href: '/dashboard/admin/analytics', icon: '📈', label: t('analyticsTitle') },
    { href: '/dashboard/admin/map', icon: '🗺️', label: t('issuesMap') },
    { href: '/dashboard/citizen/profile', icon: '👤', label: t('profile') }
  ] : user?.role === 'panchayat_secretary' ? [
    { href: '/dashboard/admin', icon: '📊', label: t('overview') },
    { href: '/dashboard/admin/complaints', icon: '📋', label: t('allComplaints') },
    { href: '/dashboard/admin/users', icon: '👥', label: t('manageUsers') },
    { href: '/dashboard/admin/gallery', icon: '🖼️', label: t('villageGallery') },
    { href: '/dashboard/admin/map', icon: '🗺️', label: t('issuesMap') },
    { href: '/dashboard/admin/notifications', icon: '📢', label: t('broadcast'), countKey: 'notifications' },
    { href: '/dashboard/citizen/profile', icon: '👤', label: t('profile') }
  ] : [
    { href: '/dashboard/admin', icon: '📊', label: t('overview') },
    { href: '/dashboard/admin/complaints', icon: '📋', label: t('allComplaints') },
    { href: '/dashboard/citizen/complaints', icon: '👤', label: t('myComplaints') },
    { href: '/dashboard/citizen/new-complaint', icon: '➕', label: t('newComplaint') },
    { href: '/dashboard/admin/users', icon: '👥', label: t('manageUsers') },
    { href: '/dashboard/admin/gallery', icon: '🖼️', label: t('villageGallery') },
    { href: '/dashboard/admin/map', icon: '🗺️', label: t('issuesMap') },
    { href: '/dashboard/admin/notifications', icon: '📢', label: t('broadcast'), countKey: 'notifications' },
    { href: '/dashboard/citizen/profile', icon: '👤', label: t('profile') }
  ];

  const handleLogout = async () => { await logout(); router.replace('/login'); };

  const roleColors: Record<string, string> = {
    citizen: '#22c55e', admin: '#f59e0b', officer: '#0ea5e9', panchayat_secretary: '#a855f7', collector: '#e11d48'
  };

  if (!user) return null;

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px 12px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, padding: '8px 4px', minHeight: 56 }}>
          <div style={{ width: 40, height: 40, minWidth: 40, background: 'linear-gradient(135deg, var(--primary-light), var(--primary))', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: 'var(--glow)' }}>
            🏛️
          </div>
          <div style={{ overflow: 'hidden', opacity: collapsed ? 0 : 1, transition: 'opacity 0.2s' }}>
            <div style={{ fontSize: 15, fontWeight: 800, fontFamily: 'Poppins', background: 'linear-gradient(135deg, #86efac, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', whiteSpace: 'nowrap' }}>{t('sgpims')}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{t('gramPanchayat')}</div>
          </div>
          <button onClick={onCollapse} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12, width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, flexShrink: 0 }}>
            {collapsed ? '❯' : '❮'}
          </button>
        </div>

          {/* User info */}
          {!collapsed && (
            <div style={{ background: 'rgba(45,106,79,0.08)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-light), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {user?.name?.[0]?.toUpperCase() || '👤'}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                  <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: roleColors[user?.role || 'citizen'], display: 'inline-block' }} />
                    <span style={{ color: roleColors[user?.role || 'citizen'], textTransform: 'capitalize' }}>{t(user?.role as any || 'citizen')}</span>
                  </div>
                </div>
              </div>
              {user?.village && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>📍 {(user.village as any)?.name || (typeof user.village === 'string' ? user.village : '')}</div>}
            </div>
          )}

          {/* Navigation */}
          <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {nav.map(item => {
              const isActive = pathname === item.href || (item.href !== '/dashboard/citizen' && item.href !== '/dashboard/admin' && item.href !== '/dashboard/officer' && pathname.startsWith(item.href));
              
              const count = item.countKey === 'notifications' ? unreadCount : item.countKey === 'complaints' ? complaintCount : 0;
              const showBadge = count > 0;

              return (
                <Link key={item.href} href={item.href} className={`sidebar-item ${isActive ? 'active' : ''}`}
                  title={collapsed ? (showBadge ? `${item.label} (${count})` : item.label) : undefined}
                  style={{ justifyContent: collapsed ? 'center' : 'flex-start', position: 'relative' }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                  {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
                  
                  {showBadge && (
                    <span style={{ 
                      position: collapsed ? 'absolute' : 'static',
                      top: collapsed ? 4 : undefined,
                      right: collapsed ? 4 : undefined,
                      marginLeft: collapsed ? 0 : 'auto',
                      background: item.countKey === 'notifications' ? 'var(--accent)' : 'var(--primary-light)',
                      color: item.countKey === 'notifications' ? 'var(--bg-dark)' : '#fff',
                      fontSize: 10,
                      fontWeight: 800,
                      minWidth: 18,
                      height: 18,
                      borderRadius: 9,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 4px',
                      boxShadow: item.countKey === 'notifications' ? '0 0 10px rgba(245, 158, 11, 0.4)' : 'none'
                    }}>
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom */}
          <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {!collapsed && (
              <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.05)', padding: 4, borderRadius: 8, border: '1px solid var(--border)' }}>
                <button onClick={() => setLanguage('en')} style={{ flex: 1, padding: '6px', fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer', border: 'none', background: language === 'en' ? 'var(--accent)' : 'transparent', color: language === 'en' ? 'var(--bg-dark)' : 'var(--text-muted)' }}>EN</button>
                <button onClick={() => setLanguage('te')} style={{ flex: 1, padding: '6px', fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer', border: 'none', background: language === 'te' ? 'var(--accent)' : 'transparent', color: language === 'te' ? 'var(--bg-dark)' : 'var(--text-muted)' }}>తెలుగు</button>
              </div>
            )}
            <button onClick={handleLogout} className="sidebar-item" style={{ width: '100%', background: 'transparent', border: 'none', justifyContent: collapsed ? 'center' : 'flex-start', color: '#ef4444' }} title={collapsed ? t('logout') : undefined}>
              <span style={{ fontSize: 18 }}>🚪</span>
              {!collapsed && <span>{t('logout')}</span>}
            </button>
          </div>
        </div>
      </aside>
  );
}
