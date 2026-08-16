'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Receipt,
  PlusCircle,
  ArrowLeftRight,
  Layers,
  Glasses,
  PhoneCall,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import DrashtiLogo from '../shared/DrashtiLogo';
import { useAuth } from '@/context/AuthContext';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Add Sale (Billing)', href: '/sales/add', icon: PlusCircle, isHighlight: true },
  { name: 'Sales & Invoices', href: '/sales', icon: Receipt },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Prescriptions', href: '/prescriptions', icon: Eye },
  { name: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { name: 'Categories', href: '/categories', icon: Layers },
  { name: 'Eyewear Items', href: '/items', icon: Glasses },
  { name: 'Numbers Directory', href: '/numbers', icon: PhoneCall },
  { name: 'Reports & Analytics', href: '/reports', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside
      className={`hidden lg:flex flex-col fixed top-0 left-0 bottom-0 z-30 bg-slate-900 text-slate-100 border-r border-slate-800 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Top Brand Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80 bg-slate-950/60">
        {!isCollapsed ? (
          <Link href="/dashboard" className="flex items-center bg-white rounded-xl px-2.5 py-1 shadow-sm border border-slate-700/40 hover:opacity-95 transition-all">
            <img src="/drashti-optic-logo.png" alt="Drashti Optic" className="h-8 w-auto object-contain" />
          </Link>
        ) : (
          <Link href="/dashboard" className="mx-auto flex items-center justify-center bg-white rounded-xl p-1.5 shadow-sm border border-slate-700/40 hover:opacity-95 transition-all" title="Drashti Optic">
            <img src="/drashti-optic-logo.png" alt="Drashti Optic" className="h-6 w-6 object-contain" />
          </Link>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href) && item.href !== '/sales' ? true : pathname === item.href);

          if (item.isHighlight) {
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 shadow-md ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-brand-600/30'
                    : 'bg-gradient-to-r from-brand-600 to-rose-600 text-white hover:brightness-110'
                } ${isCollapsed ? 'justify-center px-0' : ''}`}
                title={item.name}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span>{item.name}</span>}
              </Link>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-slate-800 text-white font-semibold border border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              } ${isCollapsed ? 'justify-center px-0' : ''}`}
              title={item.name}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-brand-500' : 'text-slate-400'}`} />
              {!isCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Store Owner Account & Logout */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
        {!isCollapsed ? (
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-800/50 border border-slate-800">
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
              onClick={() => logout()}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center p-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-xl transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
