'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();

  // Close mobile sidebar and handle progress bar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
    
    // Show progress bar briefly on route change
    setIsNavigating(true);
    const timer = setTimeout(() => setIsNavigating(false), 800);
    return () => clearTimeout(timer);
  }, [pathname]);

  const toggleSidebar = () => setIsSidebarCollapsed(!isSidebarCollapsed);
  const toggleMobileSidebar = () => setIsMobileSidebarOpen(!isMobileSidebarOpen);

  return (
    <div className="dashboard-layout">
      {/* Progress Bar */}
      {isNavigating && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          height: 3, 
          background: 'var(--accent)', 
          zIndex: 9999,
          animation: 'navProgress 1s ease-out forwards',
          boxShadow: '0 0 10px var(--accent)'
        }} />
      )}

      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div 
          onClick={() => setIsMobileSidebarOpen(false)}
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.6)', 
            backdropFilter: 'blur(4px)',
            zIndex: 90 
          }} 
        />
      )}

      <Sidebar 
        collapsed={isSidebarCollapsed} 
        onCollapse={toggleSidebar}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div className={`main-content ${isSidebarCollapsed ? 'with-sidebar-collapsed' : 'with-sidebar'}`}>
        <TopBar onMenuClick={toggleMobileSidebar} />
        <div style={{ padding: '0 4px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
