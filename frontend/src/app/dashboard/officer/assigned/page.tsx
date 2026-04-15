'use client';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function OfficerAssignedPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect officer to their dashboard which shows their assigned complaints
    router.replace('/dashboard/officer');
  }, [router]);

  return null;
}
