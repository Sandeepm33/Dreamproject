'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Navigation, MapPin, Zap, Layers, Filter, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
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
  const [selectedVillage, setSelectedVillage] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showStats, setShowStats] = useState(true);
  
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
  function ChangeView({ center, zoom, sidebarOpen }: { center: [number, number]; zoom: number; sidebarOpen: boolean }) {
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
          } catch (e) {
            console.warn('Map invalidateSize failed:', e);
          }
        }, 400);
        return () => clearTimeout(timeout);
      }
    }, [map, sidebarOpen]);

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
    setSelectedVillage(v);
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
      <div className={`relative transition-all duration-500 ease-in-out overflow-hidden rounded-3xl border border-[#2d6a4f55] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] ${
        showSidebar ? 'flex-[3]' : 'flex-1'
      }`}>
        
        {/* SYMMETRICAL RIGHT CONTROL RAIL */}
        <div className="absolute top-4 right-4 z-[2000] flex flex-col gap-3 items-end">
          {/* Spacer to clear the Leaflet control (height approx 52px) */}
          <div className="h-[52px]" />

          {/* Stats Toggle Icon (HIGH CONTRAST) */}
          <button 
            onClick={() => setShowStats(!showStats)}
            className={`w-11 h-11 flex items-center justify-center rounded-lg shadow-lg border transition-all hover:bg-gray-50 ${
              showStats ? 'bg-white text-success border-success/30' : 'bg-white text-gray-700 border-white/20'
            }`}
          >
            <Zap className={`h-5 w-5 ${showStats ? 'fill-current' : ''}`} />
          </button>

          {/* Sidebar Toggle Icon (MATCHING STYLE) */}
          {!showSidebar && (
            <button 
              onClick={() => setShowSidebar(true)}
              className="w-11 h-11 flex items-center justify-center bg-white text-gray-700 rounded-lg shadow-lg border border-white/20 hover:bg-gray-50 transition-all group"
            >
              <Layers className="h-5 w-5 group-hover:scale-110 transition-transform" />
            </button>
          )}

          {/* Stats Section - PERFECT SPACING & ACCESSIBILITY */}
          {showStats && (
            <div className="mt-2 glass-card p-5 border-[#ffffff22] bg-black/95  animate-fade-in-right min-w-[210px] rounded-2xl relative">
              <div className="flex justify-between items-center mb-5 border-b border-white/10 pb-3">
                <span className="text-[11px] text-accent font-black uppercase tracking-[0.2em]">Village Pulse</span>
                <button 
                  onClick={() => setShowStats(false)}
                  className="text-text-muted hover:text-white transition-colors p-1"
                >
                  <AlertCircle className="h-4 w-4 rotate-45" />
                </button>
              </div>
              
              <div className="flex justify-between gap-8 ">
                <div className="flex-1 space-y-2">
                  <p className="text-[9px] text-text-muted uppercase font-black opacity-40 spacing-wider">Active</p>
                  <p className="text-3xl font-black text-white leading-none tracking-tight">
                    {issues.filter((i: any) => i.status !== 'resolved').length}
                  </p>
                </div>
                <div className="flex-1 space-y-2 text-right">
                  <p className="text-[9px] text-text-muted uppercase font-black opacity-40 spacing-wider">Resolved</p>
                  <p className="text-3xl font-black text-success leading-none tracking-tight">
                    {issues.filter((i: any) => i.status === 'resolved').length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM LEFT CONTROLS */}
        <div className="absolute bottom-10 left-10 z-[1000] w-64 space-y-4">
          <div className="glass-card p-4 border-[#ffffff22] bg-black/80 shadow-lg backdrop-blur-md">
            <div className="mb-2 flex items-center gap-2 text-text-secondary font-bold text-[9px] uppercase tracking-wider">
              <Navigation className="h-3 w-3 text-accent" />
              <span>Focus</span>
            </div>
            <select 
              value={selectedVillage} 
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

            <ChangeView center={mapCenter} zoom={15} sidebarOpen={showSidebar} />

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

            {issues
              .filter((issue: any) => issue.location?.lat != null && issue.location?.lng != null)
              .map((issue: any) => (
                <Marker 
                  key={issue._id} 
                  position={[Number(issue.location.lat), Number(issue.location.lng)]}
                  icon={getMarkerIcon(issue.status)}
                >
                  <Popup className="premium-popup">
                    <div className="max-w-[200px] p-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[8px] font-bold uppercase ${issue.status === 'resolved' ? 'text-success' : 'text-accent'}`}>{issue.status}</span>
                      </div>
                      <h4 className="text-[11px] font-bold text-white leading-tight">{issue.title}</h4>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        </div>
      </div>

      {/* Side Console - Right */}
      {showSidebar && (
        <div className="w-96 glass-card flex flex-col overflow-hidden border-[#ffffff11] bg-black/20 animate-fade-in-right">
          <div className="p-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                <h3 className="text-xs font-black text-text-primary uppercase tracking-[0.2em]">Village Live Feed</h3>
              </div>
              <p className="text-[9px] text-text-muted uppercase opacity-40">Scan: {radius}KM</p>
            </div>
            <button 
              onClick={() => setShowSidebar(false)}
              className="text-text-muted hover:text-white transition-colors"
            >
              <AlertCircle className="h-4 w-4 rotate-45" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {issues.map((issue: any) => (
              <div key={issue._id} className="p-4 bg-white/5 border border-white/5 rounded-2xl hover:border-primary-light transition-all cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    issue.status === 'resolved' ? 'bg-success/20 text-success' : 'bg-accent/20 text-accent'
                  }`}>{issue.status}</span>
                  <span className="text-[8px] text-white/20">{new Date(issue.createdAt).toLocaleTimeString()}</span>
                </div>
                <h4 className="text-xs font-bold text-text-secondary group-hover:text-text-primary transition-colors leading-tight">{issue.title}</h4>
                <p className="text-[9px] text-text-muted mt-2 uppercase tracking-tighter opacity-50">{issue.category}</p>
              </div>
            ))}
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
