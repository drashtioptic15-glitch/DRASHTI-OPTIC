'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileDrawer from './MobileDrawer';
import { useAuth } from '@/context/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';

const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password'];

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();
  const { loading, isAuthenticated } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const isPublic = PUBLIC_ROUTES.some((route) => pathname?.startsWith(route));

  if (loading) {
    return <LoadingSpinner fullPage text="Initializing Drashti Optic System..." />;
  }

  if (isPublic) {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  if (!isAuthenticated) {
    return null; // Will be redirected to /login by AuthContext
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans w-full">
      {/* Desktop & Tablet Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />

      {/* Mobile Slide-out Drawer */}
      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
      />

      {/* Main Content Area Offset Container */}
      <div
        className={`flex-1 flex flex-col w-full min-w-0 transition-[padding] duration-300 ${
          isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
        }`}
      >
        {/* Top Header */}
        <Header onOpenMobileMenu={() => setIsMobileDrawerOpen(true)} />

        {/* Main Content Viewport with generous bottom clearance */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 w-full max-w-[1600px] mx-auto pb-32">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
