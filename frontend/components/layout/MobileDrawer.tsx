'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, LogOut, ShieldCheck } from 'lucide-react';
import { navItems } from './Sidebar';
import { useAuth } from '@/context/AuthContext';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Close drawer on route change
  useEffect(() => {
    onClose();
  }, [pathname]);

  // Lock body scroll only when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.removeProperty('overflow');
    }
    return () => {
      document.body.style.removeProperty('overflow');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Drawer content */}
      <div className="relative w-[280px] max-w-[85vw] h-full bg-slate-900 text-slate-100 flex flex-col z-10 shadow-2xl border-r border-slate-800 animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800 bg-slate-950/80">
          <Link href="/dashboard" onClick={onClose} className="flex items-center bg-white rounded-xl px-2.5 py-1 shadow-sm border border-slate-700/40">
            <img src="/drashti-optic-logo.png" alt="Drashti Optic" className="h-7 w-auto object-contain" />
          </Link>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Links list */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href) && item.href !== '/sales' ? true : pathname === item.href);

            if (item.isHighlight) {
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-brand-600 to-rose-600 text-white shadow-lg shadow-brand-600/30"
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold border border-slate-700'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-brand-500' : 'text-slate-400'}`} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile & logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
              DO
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name || 'Store Owner'}</p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Admin
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              logout();
            }}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileDrawer;
