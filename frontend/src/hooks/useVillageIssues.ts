import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
// import { io, Socket } from 'socket.io-client'; // User needs to install socket.io-client

interface Issue {
  _id: string;
  title: string;
  description?: string;
  category: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'rejected' | 'escalated';
  location: {
    lat: number;
    lng: number;
    village?: string;
  };
  createdAt: string;
  image_url?: string;
  media?: { url: string; type: string }[];
  beforeImage?: string;
}

export const useVillageIssues = (lat?: number, lng?: number, radius: number = 5) => {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIssues = useCallback(async () => {
    if (!lat || !lng) return;
    
    setLoading(true);
    try {
      // In a real scenario, we'd use the provided lat/lng/radius
      // The current backend getComplaints needs to be updated to support these
      const res = await api.getComplaints({ 
        lat, 
        lng, 
        radius,
        limit: 100 // Load more for map view
      });
      
      if (res.success) {
        setIssues(res.complaints);
      }
    } catch (err) {
      setError('Failed to fetch village issues');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [lat, lng, radius]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  // Socket sync
  useEffect(() => {
    if (!lat || !lng) return;

    // This is a placeholder for socket.io logic
    // const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000');
    
    // socket.on('issue_created', (newIssue: Issue) => {
    //   // Basic distance check (Euclidean as approximation)
    //   const dist = Math.sqrt(
    //     Math.pow(newIssue.location.lat - lat, 2) + 
    //     Math.pow(newIssue.location.lng - lng, 2)
    //   );
    //   // approx 1 degree = 111km. 5km = 0.045 degrees
    //   if (dist < radius / 111) {
    //     setIssues(prev => [newIssue, ...prev]);
    //   }
    // });

    // socket.on('issue_updated', (updatedIssue: Issue) => {
    //   setIssues(prev => prev.map(iss => 
    //     iss._id === updatedIssue._id ? updatedIssue : iss
    //   ));
    // });

    // return () => { socket.disconnect(); };
    
    console.log('Socket listener would be active for:', { lat, lng, radius });
  }, [lat, lng, radius]);

  return { issues, loading, error, refetch: fetchIssues };
};
