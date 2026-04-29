'use client';
import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function ComplaintRedirect() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { id } = useParams();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'citizen') {
        router.replace(`/dashboard/citizen/complaints/${id}`);
      } else if (['admin', 'panchayat_secretary', 'collector', 'secretariat_office'].includes(user.role)) {
        router.replace(`/dashboard/admin/complaints/${id}`);
      } else if (user.role === 'officer') {
        // Officers use a modal on their dashboard, so we just send them to the dashboard
        router.replace('/dashboard/officer');
      } else {
        router.replace('/dashboard');
      }
    } else if (!loading && !user) {
      // Store the intended destination in session storage if needed, then login
      router.replace('/login');
    }
  }, [user, loading, id, router]);

  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg-primary)', color:'var(--text-muted)', fontFamily:'Poppins' }}>
      <div style={{ textAlign:'center' }}>
        <div className="skeleton" style={{ width:60, height:60, borderRadius:'50%', margin:'0 auto 20px' }}></div>
        <p style={{ fontSize:16, fontWeight:600 }}>Loading complaint...</p>
        <p style={{ fontSize:12, marginTop:8, opacity:0.7 }}>Redirecting you to the right dashboard</p>
      </div>
    </div>
  );
}
