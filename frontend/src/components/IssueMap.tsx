'use client';

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { getFullImageUrl } from '@/lib/api';
const customIcon = (color: string) => {
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const getStatusColor = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'PENDING':
      return 'red';
    case 'IN_PROGRESS':
    case 'ASSIGNED':
      return 'yellow';
    case 'RESOLVED':
      return 'green';
    default:
      return 'blue';
  }
};

const getStatusLabel = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'PENDING':
      return 'Pending';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'ASSIGNED':
      return 'Assigned';
    case 'RESOLVED':
      return 'Resolved';
    default:
      return status;
  }
};

interface Complaint {
  _id: string;
  title: string;
  description: string;
  location?: { lat?: number; lng?: number; address?: string };
  media?: { url: string; type: string }[];
  beforeImage?: string;
  status: string;
  village?: { name: string, _id: string } | string;
  createdAt?: string;
}

interface IssueMapProps {
  complaints: Complaint[];
  centerLat?: number;
  centerLng?: number;
}

// Component to dynamically set map center
const MapUpdater = ({ lat, lng }: { lat: number, lng: number }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
};

export default function IssueMap({ complaints, centerLat = 17.3850, centerLng = 78.4867 }: IssueMapProps) {
  const [filter, setFilter] = useState('ALL');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Filter complaints having valid coordinates
  const validComplaints = complaints.filter(c => 
    c.location && typeof c.location.lat === 'number' && typeof c.location.lng === 'number' &&
    !isNaN(c.location.lat) && !isNaN(c.location.lng)
  );

  const filteredComplaints = validComplaints.filter(c => {
    if (filter === 'ALL') return true;
    if (filter === 'PENDING') return c.status?.toUpperCase() === 'PENDING';
    if (filter === 'IN_PROGRESS') return ['IN_PROGRESS', 'ASSIGNED'].includes(c.status?.toUpperCase());
    if (filter === 'RESOLVED') return c.status?.toUpperCase() === 'RESOLVED';
    return true;
  });

  const displayLat = validComplaints.length > 0 ? validComplaints[0].location!.lat! : centerLat;
  const displayLng = validComplaints.length > 0 ? validComplaints[0].location!.lng! : centerLng;

  return (
    <div className="flex flex-col h-full w-full relative">
      <div className="absolute top-4 right-4 z-[400] glass-card p-2 rounded-lg" style={{ background: 'rgba(17, 26, 20, 0.9)' }}>
        <select 
          className="input-field py-1 px-2 border-none"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ minWidth: 120, fontSize: 13 }}
        >
          <option value="ALL">All Issues</option>
          <option value="PENDING">Pending (Red)</option>
          <option value="IN_PROGRESS">In Progress (Yellow)</option>
          <option value="RESOLVED">Resolved (Green)</option>
        </select>
      </div>

      <div className="flex-1 rounded-xl overflow-hidden shadow-lg border border-[var(--border)] relative z-0">
        <MapContainer 
          center={[displayLat, displayLng]} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapUpdater lat={displayLat} lng={displayLng} />
          
          {Object.values(
            filteredComplaints.reduce((acc, c) => {
              const key = `${c.location!.lat},${c.location!.lng}`;
              if (!acc[key]) acc[key] = [];
              acc[key].push(c);
              return acc;
            }, {} as Record<string, Complaint[]>)
          ).map(group => {
            const first = group[0];
            const lat = first.location!.lat!;
            const lng = first.location!.lng!;
            
            // Prioritize status color for group (Pending > In Progress > Resolved)
            const hasPending = group.some(c => c.status?.toUpperCase() === 'PENDING');
            const hasInProgress = group.some(c => ['IN_PROGRESS', 'ASSIGNED'].includes(c.status?.toUpperCase()));
            const groupStatus = hasPending ? 'PENDING' : hasInProgress ? 'IN_PROGRESS' : 'RESOLVED';

            return (
              <Marker 
                key={first._id} 
                position={[lat, lng]} 
                icon={customIcon(getStatusColor(groupStatus))}
              >
                <Popup className="custom-popup" minWidth={240} maxWidth={280}>
                  <div className="max-h-[350px] overflow-y-auto pr-1 flex flex-col gap-3" style={{ color: 'var(--text-primary)' }}>
                    {group.length > 1 && (
                      <div className="text-[10px] font-bold text-center bg-black/20 py-1 rounded mb-1 text-gray-400">
                        {group.length} ISSUES AT THIS LOCATION
                      </div>
                    )}
                    
                    {group.map((complaint, index) => {
                      let image = getFullImageUrl(complaint.beforeImage || (complaint.media && complaint.media.length > 0 ? complaint.media[0].url : null));

                      const formattedTime = complaint.createdAt ? new Date(complaint.createdAt).toLocaleString() : '';

                      return (
                        <div key={complaint._id} className={index > 0 ? "pt-3 border-t border-gray-700/50" : ""}>
                          <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--accent)' }}>{complaint.title}</h3>
                          <div className="mb-2 flex justify-between items-center">
                             <span className={`badge badge-${getStatusColor(complaint.status)} text-[10px]`}>
                                {getStatusLabel(complaint.status)}
                             </span>
                             {formattedTime && <span className="text-[9px] text-gray-500">{formattedTime}</span>}
                          </div>
                          {image && (
                            <div className="relative h-28 w-full mb-2 cursor-pointer overflow-hidden rounded border border-gray-700"
                                 onClick={() => setSelectedImage(image)}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={image} 
                                alt="Issue" 
                                className="object-cover w-full h-full hover:scale-110 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                 <span className="text-white text-xs bg-black/60 px-2 py-1 rounded">Click to enlarge</span>
                              </div>
                            </div>
                          )}
                          <p className="text-xs line-clamp-3 mb-1" style={{ color: 'var(--text-muted)' }}>
                            {complaint.description}
                          </p>
                          
                          <a 
                            href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 block text-center py-2 px-4 rounded border border-[#22c55e]/30 bg-[#22c55e]/10 text-[#22c55e] text-[11px] font-bold hover:bg-[#22c55e]/20 transition-all tracking-wider"
                          >
                            🗺️ GET DIRECTIONS
                          </a>

                          {complaint.village && (
                            <p className="text-[10px] text-gray-400 mt-2 border-t border-gray-700/30 pt-2">
                              📍 {typeof complaint.village === 'string' ? complaint.village : complaint.village.name}
                            </p>
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

      {/* Image Modal Preview */}
      {selectedImage && (
        <div className="fixed inset-0 z-[5000] bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm"
             onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
            <button 
              className="absolute -top-10 right-0 text-white hover:text-red-500 bg-black/50 rounded-full w-8 h-8 flex items-center justify-center transition-colors"
              onClick={() => setSelectedImage(null)}
            >
              ✕
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={selectedImage} 
              alt="Issue Enlarged" 
              className="w-full h-full object-contain rounded-lg border border-[var(--border)] shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
