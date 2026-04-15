import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

interface Location {
  lat: number;
  lng: number;
  displayName?: string;
}

export const useUserLocation = () => {
  const { user } = useAuth();
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocation = async () => {
      setLoading(true);
      
      // Try Browser-level GPRS/GPS first
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            
            // Reverse geocode to get a readable name for the HUD
            try {
              const revRes = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
              );
              const revData = await revRes.json();
              setLocation({
                lat: latitude,
                lng: longitude,
                displayName: revData.display_name || "Detected Precise Location"
              });
            } catch (e) {
              setLocation({ lat: latitude, lng: longitude, displayName: "Detected Precise Location" });
            }
            setLoading(false);
          },
          async (error) => {
            console.warn("GPRS Access Denied or Failed, falling back to Profile location:", error.message);
            await getFallbackLocation();
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      } else {
        await getFallbackLocation();
      }
    };

    const getFallbackLocation = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      // 1. Check Cache
      const cacheKey = `village_coord_${user.village || user.district || 'default'}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          setLocation(JSON.parse(cached));
          setLoading(false);
          return;
        } catch (e) {
          localStorage.removeItem(cacheKey);
        }
      }

      // 2. Geocode Village Name (The original logic)
      try {
        const query = user.village 
          ? `${user.village}, ${user.district || ''}, India`
          : `${user.district || 'Hyderabad'}, India`;

        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
        );
        const data = await response.json();

        if (data && data.length > 0) {
          const newLoc = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            displayName: data[0].display_name
          };
          setLocation(newLoc);
        } else {
          // Ultimate fallback (Hyderabad)
          setLocation({ lat: 17.3850, lng: 78.4867 });
        }
      } catch (err) {
        setError('Location unavailable');
      } finally {
        setLoading(false);
      }
    };

    fetchLocation();
  }, [user]);

  const changeVillage = async (villageName: string) => {
    setLoading(true);
    try {
      const query = `${villageName}, ${user?.district || ''}, India`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const newLoc = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
          displayName: data[0].display_name
        };
        setLocation(newLoc);
        return newLoc;
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return { location, loading, error, changeVillage };
};
