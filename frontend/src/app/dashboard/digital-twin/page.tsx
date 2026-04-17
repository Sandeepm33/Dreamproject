'use client';

import dynamic from 'next/dynamic';

// Use dynamic import for MapComponent to improve initial page load and avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[750px] w-full items-center justify-center glass-card border-[#2d6a4f33]">
      <div className="text-center">
        <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary-light border-t-accent"></div>
        <p className="text-text-secondary animate-pulse uppercase tracking-widest text-xs font-bold">Initializing Digital Twin...</p>
      </div>
    </div>
  )
});

export default function DigitalTwinPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold gradient-text mb-2">Live Village Digital Twin</h1>
        <p className="text-text-muted">Real-time surveillance and visualization of village status.</p>
      </div>
      
      <div className="relative">
        <MapComponent />
      </div>
      
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-text-secondary font-bold mb-3 uppercase tracking-wider text-xs">Node Status</h3>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-success animate-pulse" />
            <span className="text-sm">Main Hub Online</span>
          </div>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-text-secondary font-bold mb-3 uppercase tracking-wider text-xs">Sync Integrity</h3>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-accent" />
            <span className="text-sm">99.8% Geo-Precision</span>
          </div>
        </div>
        <div className="glass-card p-6">
          <h3 className="text-text-secondary font-bold mb-3 uppercase tracking-wider text-xs">Alert Level</h3>
          <div className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full bg-blue-500" />
            <span className="text-sm">Normal Surveillance</span>
          </div>
        </div>
      </div>
    </div>
  );
}
