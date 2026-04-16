'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Navigation, Filter } from 'lucide-react';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useVillageIssues } from '@/hooks/useVillageIssues';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';

// Global Leaflet instance
let L: any;
if (typeof window !== 'undefined') {
  L = require('leaflet');
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  });
}

const MapComponent = () => {
  const [isClient, setIsClient] = useState(false);
  const [radius, setRadius] = useState(5);
  const [villageSelection, setVillageSelection] = useState('');
  
  const [statusFilter, setStatusFilter] = useState('All');
  const [modalImage, setModalImage] = useState<string | null>(null);
  
  const { location, loading: locLoading, changeVillage } = useUserLocation();
  const { issues, loading: issuesLoading } = useVillageIssues(location?.lat, location?.lng, radius);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const mapCenter: [number, number] = useMemo(() => {
    const lat = Number(location?.lat);
    const lng = Number(location?.lng);
    if (isNaN(lat) || isNaN(lng)) return [17.3850, 78.4867];
    return [lat, lng];
  }, [location]);

  // Safely require Leaflet components
  const { MapContainer, TileLayer, Marker, Popup, Circle: LeafletCircle, LayersControl, useMap } = (isClient ? require('react-leaflet') : {});

  // Component to handle map re-centering and size invalidation
  function ChangeView({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap();
    
    useEffect(() => {
      if (map && center) {
        const timeout = setTimeout(() => {
          try {
            map.setView(center, zoom, { animate: true });
          } catch (e) {}
        }, 100);
        return () => clearTimeout(timeout);
      }
    }, [map, center, zoom]);
    useEffect(() => {
      if (map) {
        const timeout = setTimeout(() => {
          try {
            map.invalidateSize();
          } catch (e) {}
        }, 500);
        return () => clearTimeout(timeout);
      }
    }, [map]);

    return null;
  }

  const getMarkerIcon = (status: string) => {
    if (!L) return null;
    let color = '#ef4444'; 
    if (status === 'resolved') color = '#22c55e';
    if (['assigned', 'in_progress'].includes(status)) color = '#f59e0b';

    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 15px ${color};"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });
  };

  const handleVillageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setVillageSelection(v);
    if (v) await changeVillage(v);
  };

  if (!isClient || locLoading) {
    return (
      <div className="flex h-[750px] w-full items-center justify-center glass-card border-[#2d6a4f33]">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary-light border-t-accent"></div>
          <p className="text-text-secondary animate-pulse uppercase tracking-widest text-xs font-bold">Initializing Digital Twin...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[750px] w-full animate-fade-in relative">
      {/* Map Content - Left */}
      <div className="relative flex-1 transition-all duration-500 ease-in-out overflow-hidden rounded-3xl border border-[#2d6a4f55] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)]">
        


        {/* BOTTOM LEFT CONTROLS */}
        <div className="absolute bottom-10 left-10 z-[1000] w-64 space-y-4">
          <div className="glass-card p-4 border-[#ffffff22] bg-black/80 shadow-lg backdrop-blur-md">
            <div className="mb-2 flex items-center gap-2 text-text-secondary font-bold text-[9px] uppercase tracking-wider">
              <Navigation className="h-3 w-3 text-accent" />
              <span>Focus</span>
            </div>
            <select 
              value={villageSelection} 
              onChange={handleVillageChange}
              className="w-full bg-white/5 text-[11px] py-1.5 px-3 rounded-lg border border-white/10 text-white outline-none focus:border-accent transition-colors"
            >
              <option value="" className="bg-black">Live Location</option>
              {['Medchal', 'Gundlapochampally', 'Kompally'].map(v => (
                <option key={v} value={v} className="bg-black">{v}</option>
              ))}
            </select>
          </div>

          <div className="glass-card p-4 border-[#ffffff22] bg-black/80 shadow-lg backdrop-blur-md">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-text-secondary font-bold text-[9px] uppercase tracking-wider">
                <Filter className="h-3 w-3 text-accent" />
                <span>Radius Scan</span>
              </div>
              <span className="text-accent font-black text-xs">{radius}km</span>
            </div>
            <input 
              type="range" min="2" max="25" value={radius} 
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="h-1 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-accent"
            />
          </div>

          <div className="glass-card p-4 border-[#ffffff22] bg-black/80 shadow-lg backdrop-blur-md">
            <div className="mb-2 flex items-center gap-2 text-text-secondary font-bold text-[9px] uppercase tracking-wider">
              <Filter className="h-3 w-3 text-accent" />
              <span>Filter Status</span>
            </div>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white/5 text-[11px] py-1.5 px-3 rounded-lg border border-white/10 text-white outline-none focus:border-accent transition-colors"
            >
              <option value="All" className="bg-black">All Statuses</option>
              <option value="pending" className="bg-black">Pending</option>
              <option value="in_progress" className="bg-black">In Progress</option>
              <option value="resolved" className="bg-black">Resolved</option>
            </select>
          </div>
        </div>

        {/* Map View */}
        <div className="h-full w-full grayscale-[0.1] contrast-[1.1]">
          <MapContainer 
            center={mapCenter} zoom={15} 
            style={{ height: '100%', width: '100%', background: '#0a0f0d' }}
            zoomControl={false}
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer name="Premium Dark">
                <TileLayer url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png" />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer checked name="Satellite Twin (3D)">
                <TileLayer url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" />
              </LayersControl.BaseLayer>
            </LayersControl>

            <ChangeView center={mapCenter} zoom={15} />

            <LeafletCircle 
              center={mapCenter} radius={radius * 1000} 
              pathOptions={{ fillColor: '#22c55e', fillOpacity: 0.05, color: '#22c55e', weight: 1, dashArray: '5, 5' }} 
            />

            <Marker position={mapCenter}>
              <Popup className="premium-popup">
                <div className="min-w-[120px] p-1 text-center font-sans">
                  <h3 className="text-[10px] font-black text-primary-light uppercase mb-1">Panchayat Center</h3>
                  <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{location?.displayName}</p>
                </div>
              </Popup>
            </Marker>

            {Object.values(
              issues
                .filter((issue: any) => issue.location?.lat != null && issue.location?.lng != null)
                .filter((issue: any) => statusFilter === 'All' || issue.status === statusFilter || (statusFilter === 'in_progress' && issue.status === 'assigned'))
                .reduce((acc: any, issue: any) => {
                  const key = `${issue.location.lat},${issue.location.lng}`;
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(issue);
                  return acc;
                }, {})
            ).map((group: any) => {
              const first = group[0];
              
              // Prioritize status color for group
              const hasPending = group.some((i: any) => i.status === 'pending');
              const hasInProgress = group.some((i: any) => ['in_progress', 'assigned'].includes(i.status));
              const groupStatus = hasPending ? 'pending' : hasInProgress ? 'in_progress' : 'resolved';

              return (
                <Marker 
                  key={first._id} 
                  position={[Number(first.location.lat), Number(first.location.lng)]}
                  icon={getMarkerIcon(groupStatus)}
                >
                  <Popup className="premium-popup">
                    <div className="max-w-[220px] w-[220px] max-h-[350px] overflow-y-auto custom-scrollbar p-2 flex flex-col gap-4">
                      {group.length > 1 && (
                        <div className="text-[9px] font-black tracking-widest text-center bg-white/10 text-white/70 py-1 px-2 rounded-md uppercase">
                          {group.length} Incidents Here
                        </div>
                      )}
                      
                      {group.map((issue: any, index: number) => {
                        let imageUrl = issue.image_url || issue.beforeImage || (issue.media?.[0]?.url) || null;
                        
                        // Fix relative image URLs (which usually come from backend /uploads)
                        if (imageUrl && imageUrl.startsWith('/')) {
                          const apiRoot = process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace('/api', '') : 'http://localhost:5000';
                          imageUrl = apiRoot + imageUrl;
                        }

                        const formattedTime = issue.createdAt ? new Date(issue.createdAt).toLocaleString() : 'Unknown time';
                        
                        return (
                          <div key={issue._id} className={index > 0 ? "pt-3 border-t border-white/10" : ""}>
                            <div className="flex justify-between items-center mb-1">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${issue.status === 'resolved' ? 'bg-success/20 text-success' : issue.status === 'pending' ? 'bg-error/20 text-error' : 'bg-warning/20 text-warning'}`}>
                                {issue.status}
                              </span>
                              <span className="text-[9px] text-[#888]">{formattedTime}</span>
                            </div>
                            <h4 className="text-[14px] font-bold text-white leading-tight mt-1">{issue.title}</h4>
                            
                            {issue.description && (
                              <p className="text-[11px] text-gray-300 line-clamp-2 mt-1">{issue.description}</p>
                            )}

                            {imageUrl && (
                              <div 
                                className="mt-2 w-full h-24 rounded-lg overflow-hidden cursor-pointer relative group border border-white/10"
                                onClick={() => setModalImage(imageUrl)}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={imageUrl} alt="Issue" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="text-white text-[10px] font-bold bg-black/60 px-2 py-1 rounded-md">View Full</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>


      {/* Image Modal */}
      {modalImage && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 border border-[#2d6a4f55]">
          <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center">
            <button 
              onClick={() => setModalImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-accent font-bold text-lg bg-black/50 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md"
            >
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={modalImage} alt="Full screen preview" className="max-w-full max-h-[85vh] object-contain rounded-xl border border-white/20 shadow-[-0_0_50px_rgba(0,0,0,0.8)]" />
          </div>
        </div>
      )}

      <style jsx global>{`
        /* Force Leaflet Layers Control to match our custom icons exactly */
        .leaflet-top.leaflet-right { top: 16px !important; right: 16px !important; }
        .leaflet-control-layers { 
          margin: 0 !important; 
          border: 1px solid rgba(0,0,0,0.05) !important; 
          border-radius: 8px !important; 
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1) !important;
          background: white !important;
        }
        .leaflet-control-layers-toggle { 
          width: 44px !important; 
          height: 44px !important; 
          background-size: 22px !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23374151' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolygon points='12 2 2 7 12 12 22 7 12 2'/%3E%3Cpolyline points='2 17 12 22 22 17'/%3E%3Cpolyline points='2 12 12 17 22 12'/%3E%3C/svg%3E") !important;
        }
        .leaflet-control-layers-expanded { background: #0a0f0d !important; color: white !important; padding: 12px !important; border: 1px solid rgba(255,255,255,0.1) !important; }
        
        .premium-popup .leaflet-popup-content-wrapper { background: rgba(10, 15, 13, 0.98) !important; color: white !important; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }
        .custom-div-icon { background: none !important; border: none !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
        
        @keyframes fadeInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-fade-in-right {
          animation: fadeInRight 0.4s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default MapComponent;
