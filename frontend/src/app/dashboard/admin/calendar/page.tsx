'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { api } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';

const catIcons: any = { water: '🚰', roads: '🛣️', electricity: '⚡', sanitation: '🧹', others: '📦' };

export default function IssueCalendar() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [complaints, setComplaints] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState<Record<string, { total: number, resolved: number }>>({});
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);

  // Check role
  useEffect(() => {
    if (!loading && (!user || (user.role !== 'panchayat_secretary' && !(user.role === 'collector' || user.role === 'secretariat_office') && user.role !== 'admin'))) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  const fetchComplaintsForDate = useCallback(async (date: Date) => {
    setDataLoading(true);
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const res = await api.getComplaints({
        startDate: startOfDay.toISOString(),
        endDate: endOfDay.toISOString(),
        limit: 100
      });
      setComplaints(res.complaints || []);
    } catch (err) {
      console.error('Failed to fetch complaints:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  const fetchMonthStats = useCallback(async (date: Date) => {
    // Ideally we would have a specific endpoint for this, but for now we'll fetch all complaints for the month
    // and aggregate them. This is okay for small datasets.
    try {
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

      const res = await api.getComplaints({
        startDate: startOfMonth.toISOString(),
        endDate: endOfMonth.toISOString(),
        limit: 500
      });

      const stats: Record<string, { total: number, resolved: number }> = {};
      res.complaints?.forEach((c: any) => {
        const datesFound = new Set<string>();
        
        // Check creation date
        const createdDate = new Date(c.createdAt).toDateString();
        datesFound.add(createdDate);

        // Check all status history dates
        c.statusHistory?.forEach((h: any) => {
          datesFound.add(new Date(h.changedAt).toDateString());
        });

        // Add to stats for each unique day found within this month view
        datesFound.forEach(dateStr => {
           // We only care about dates within the current month view (conceptually handled by the set)
           // But let's verify if the date is actually in our month range if we want to be strict
           if (!stats[dateStr]) stats[dateStr] = { total: 0, resolved: 0 };
           stats[dateStr].total++;
           
           // If the issue was resolved on THIS specific day, count it as resolved for that day
           const isResolvedOnThisDay = c.status === 'resolved' && new Date(c.resolvedAt || c.updatedAt).toDateString() === dateStr;
           if (isResolvedOnThisDay) stats[dateStr].resolved++;
        });
      });
      setDailyStats(stats);
    } catch (err) {
      console.error('Failed to fetch month stats:', err);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchComplaintsForDate(selectedDate);
    }
  }, [user, selectedDate, fetchComplaintsForDate]);

  useEffect(() => {
    if (user) {
      fetchMonthStats(viewDate);
    }
  }, [user, viewDate, fetchMonthStats]);

  const changeMonth = (offset: number) => {
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
    setViewDate(next);
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    // Empty slots for first week
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty" />);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isSelected = date.toDateString() === selectedDate.toDateString();
      const isToday = date.toDateString() === new Date().toDateString();
      const stats = dailyStats[date.toDateString()];

      days.push(
        <div 
          key={d} 
          className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
          onClick={() => setSelectedDate(date)}
        >
          <span className="day-number">{d}</span>
          {stats && stats.total > 0 && (
            <div className="day-badges">
              <span className="badge-dot total" title={`${stats.total} Issues`} />
              {stats.resolved > 0 && <span className="badge-dot resolved" title={`${stats.resolved} Resolved`} />}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  if (loading || !user) return null;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 10px' }}>
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: 'Poppins', color: 'var(--text-primary)' }}>📅 {t('issueCalendar')}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
          {(user.role === 'collector' || user.role === 'secretariat_office') ? t('districtDailyTracking') : t('villageDailyTracking')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24 }}>
        {/* Left: Calendar View */}
        <div>
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => changeMonth(-1)} className="btn-icon">❮</button>
                <button onClick={() => setViewDate(new Date())} className="btn-ghost" style={{ fontSize: 12 }}>{t('today')}</button>
                <button onClick={() => changeMonth(1)} className="btn-icon">❯</button>
              </div>
            </div>

            <div className="calendar-grid">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="calendar-header-day">{day}</div>
              ))}
              {renderCalendar()}
            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="badge-dot total" /> {t('issuesReceived')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="badge-dot resolved" /> {t('issuesResolved')}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Daily Issues List */}
        <div>
          <div className="glass-card" style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {t('issuesForDate').replace('{date}', selectedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }))}
                </h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('issuesFound').replace('{count}', complaints.length.toString())}</p>
              </div>
              {dataLoading && <div className="spinner-small" />}
            </div>

            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', maxHeight: 500, paddingRight: 8 }}>
              <AnimatePresence mode="popLayout">
                {complaints.length === 0 ? (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}
                  >
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🍃</div>
                    <p>{t('noIssuesOnDay')}</p>
                  </motion.div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {complaints.map((c, idx) => {
                      const isReceived = new Date(c.createdAt).toDateString() === selectedDate.toDateString();
                      const statusUpdates = c.statusHistory?.filter((h: any) => new Date(h.changedAt).toDateString() === selectedDate.toDateString()) || [];
                      const isUpdated = statusUpdates.length > 0;

                      return (
                        <motion.div
                          key={c._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="issue-item-card"
                          onClick={() => setSelectedComplaint(c)}
                        >
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <span>{catIcons[c.category] || '📋'}</span>
                              <span style={{ fontSize:13, fontWeight:600 }}>{c.title}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                              <span className={`badge badge-${c.status === 'in_progress' ? 'inprogress' : c.status}`} style={{ fontSize: 10 }}>
                                {t(c.status === 'in_progress' ? 'inProgress' : c.status as any)}
                              </span>
                              {isUpdated && !isReceived && <span style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 700 }}>⚡ {t('statusUpdatedTitle')}</span>}
                              {isReceived && <span style={{ fontSize: 9, color: 'var(--primary-light)', fontWeight: 700 }}>🆕 {t('registered')}</span>}
                            </div>
                          </div>
                          <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-muted)' }}>
                            <span>👤 {c.citizen?.name}</span>
                            <span>📍 {c.village?.name || 'Village Area'}</span>
                          </div>
                          {isUpdated && (
                            <div style={{ marginTop: 8, padding: '4px 8px', background: 'rgba(245,158,11,0.05)', borderRadius: 6, fontSize: 10, border: '1px dashed rgba(245,158,11,0.2)' }}>
                               {statusUpdates.map((h: any, i: number) => (
                                 <div key={i}>🔄 {h.note || `Status changed to ${h.status}`}</div>
                               ))}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Complaint Detail Modal */}
      {selectedComplaint && (
        <div className="modal-overlay" onClick={() => setSelectedComplaint(null)}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: 600 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>{t('issueDetails')}</h2>
              <button onClick={() => setSelectedComplaint(null)} className="btn-icon">✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                  {catIcons[selectedComplaint.category] || '📋'}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{selectedComplaint.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ID: {selectedComplaint.complaintId}</div>
                </div>
              </div>

              <div className="glass-card" style={{ padding: 16, background: 'rgba(255,255,255,0.02)' }}>
                <p style={{ fontSize: 14, lineHeight: 1.6 }}>{selectedComplaint.description}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="label-tiny">{t('reporter').toUpperCase()}</label>
                  <div style={{ fontSize: 13 }}>{selectedComplaint.citizen?.name}</div>
                </div>
                <div>
                  <label className="label-tiny">{t('status').toUpperCase()}</label>
                  <div>
                    <span className={`badge badge-${selectedComplaint.status === 'in_progress' ? 'inprogress' : selectedComplaint.status}`}>
                      {t(selectedComplaint.status === 'in_progress' ? 'inProgress' : selectedComplaint.status as any).toUpperCase()}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="label-tiny">{t('village').toUpperCase()}</label>
                  <div style={{ fontSize: 13 }}>{selectedComplaint.village?.name || '—'}</div>
                </div>
                <div>
                  <label className="label-tiny">{t('reportedAt').toUpperCase()}</label>
                  <div style={{ fontSize: 13 }}>{new Date(selectedComplaint.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>

              <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                <button 
                  onClick={() => router.push(`/dashboard/admin/complaints?id=${selectedComplaint._id}`)} 
                  className="btn-primary" 
                  style={{ flex: 1 }}
                >
                  {t('viewFullDetails')}
                </button>
                <button onClick={() => setSelectedComplaint(null)} className="btn-ghost" style={{ flex: 1 }}>{t('close')}</button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <style jsx>{`
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 8px;
        }
        .calendar-header-day {
          text-align: center;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-muted);
          padding: 10px 0;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .calendar-day {
          aspect-ratio: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
          position: relative;
          background: rgba(255,255,255,0.02);
        }
        .calendar-day:hover {
          background: rgba(255,255,255,0.05);
          border-color: var(--border);
        }
        .calendar-day.selected {
          background: var(--primary-light);
          color: white;
          box-shadow: 0 4px 12px rgba(45, 106, 79, 0.3);
        }
        .calendar-day.today {
          border-color: var(--accent);
          color: var(--accent);
        }
        .calendar-day.today.selected {
          color: white;
        }
        .calendar-day.empty {
          cursor: default;
          background: transparent;
        }
        .day-number {
          font-size: 14px;
          font-weight: 600;
        }
        .day-badges {
          display: flex;
          gap: 3px;
          margin-top: 4px;
        }
        .badge-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
        }
        .badge-dot.total { background: #0ea5e9; }
        .badge-dot.resolved { background: #22c55e; }
        
        .issue-item-card {
          padding: 14px;
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border);
          cursor: pointer;
          transition: all 0.2s;
        }
        .issue-item-card:hover {
          background: rgba(255,255,255,0.06);
          transform: translateX(4px);
          border-color: var(--primary-light);
        }
        
        .btn-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border);
          color: var(--text-primary);
          cursor: pointer;
        }
        .btn-icon:hover {
          background: rgba(255,255,255,0.1);
        }

        .spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.1);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .label-tiny {
          font-size: 9px;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 1px;
          display: block;
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
}
