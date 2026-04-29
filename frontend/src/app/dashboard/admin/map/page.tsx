'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { api } from '@/lib/api';

// Dynamically import the map component with no SSR to avoid leaflet window is not defined error
const IssueMap = dynamic(() => import('@/components/IssueMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-[var(--bg-card)] rounded-xl border border-[var(--border)] animate-pulse">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-[var(--primary)] border-t-[var(--accent)] animate-spin-slow"></div>
        <p className="text-[var(--text-muted)] font-medium">Loading map constraints...</p>
      </div>
    </div>
  )
});

export default function IssuesMapPage() {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (!user || !['admin', 'panchayat_secretary', 'collector', 'secretariat_office'].includes(user.role)) {
        router.replace('/login');
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) fetchComplaints();
  }, [user]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      // Fetch reasonably large number of complaints for map view
      const res = await api.getComplaints({ limit: 500 });
      setComplaints(res.complaints || []);
    } catch (err) {
      console.error("Failed to fetch complaints", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
      <div className="w-full space-y-6 flex-1 flex flex-col pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold gradient-text pb-1">Village Issues Map</h1>
            <p className="text-[var(--text-muted)] text-sm">Interactive map view of all reported issues by location.</p>
          </div>
          <div className="flex items-center gap-4 hidden sm:flex">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span> {t?.('pending') || 'Pending'}
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span> {t?.('inProgress') || 'In Progress'}
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span> {t?.('resolved') || 'Resolved'}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-[400px] rounded-xl overflow-hidden glass-card shadow-2xl relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-4">
              <div className="w-8 h-8 rounded-full border-4 border-t-4 border-[var(--primary)] border-t-[var(--accent)] animate-spin"></div>
              <p className="text-[var(--text-muted)]">Fetching geospatial data...</p>
            </div>
          ) : complaints.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center flex-col gap-4 text-[var(--text-muted)]">
              <span className="text-4xl">🗺️</span>
              <p>No issues with location data found.</p>
            </div>
          ) : (
            <IssueMap complaints={complaints} />
          )}
        </div>
      </div>
    </div>
  );
}
