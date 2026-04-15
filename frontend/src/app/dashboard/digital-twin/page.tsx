import MapComponent from '@/components/MapComponent';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

export default function DigitalTwinPage() {
  return (
    <div className="flex bg-bg-dark min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-0 md:ml-64 transition-all duration-300">
        <TopBar />
        <main className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold gradient-text mb-2">Live Village Digital Twin</h1>
            <p className="text-text-muted">Real-time surveillance and visualization of village status.</p>
          </div>
          
          <div className="animate-fade-in">
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
        </main>
      </div>
    </div>
  );
}
