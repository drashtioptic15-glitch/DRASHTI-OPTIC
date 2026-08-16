'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Plus, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  onOpenMobileMenu: () => void;
}

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview & Store Analytics' },
  '/sales/add': { title: 'Fast Billing Counter', subtitle: 'Create Sale & Generate Invoice' },
  '/sales': { title: 'Sales & Invoices', subtitle: 'Manage Billing History' },
  '/customers': { title: 'Customers', subtitle: 'Customer Profiles & Records' },
  '/prescriptions': { title: 'Optical Prescriptions', subtitle: 'Customer Eye Measurements (OD/OS) & History' },
  '/transactions': { title: 'Financial Ledger', subtitle: 'Payment & Cash/Online Records' },
  '/categories': { title: 'Product Categories', subtitle: 'Manage Optical Categories' },
  '/items': { title: 'Eyewear Products', subtitle: 'Manage Frame & Lens Catalog' },
  '/numbers': { title: 'Phone Directory', subtitle: 'Contact Book & Number Management' },
  '/reports': { title: 'Reports & Analytics', subtitle: 'Sales, Product & Financial Reports' },
  '/settings': { title: 'Store Settings', subtitle: 'Store Profile, Invoices & WhatsApp' },
};

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const pathname = usePathname();
  const { user } = useAuth();

  // Find matching title
  let currentMeta: { title: string; subtitle?: string } = { title: 'Drashti Optic', subtitle: '' };
  for (const [route, meta] of Object.entries(pageTitles)) {
    if (pathname === route || (route !== '/dashboard' && pathname.startsWith(route) && route !== '/sales' ? true : pathname === route)) {
      currentMeta = meta;
      break;
    }
  }

  return (
    <header className="sticky top-0 z-20 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Left: Mobile Hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none">
            {currentMeta.title}
          </h1>
          {currentMeta.subtitle && (
            <p className="hidden sm:block text-xs text-slate-500 mt-1">{currentMeta.subtitle}</p>
          )}
        </div>
      </div>

      {/* Right: Quick Billing CTA & Store Profile */}
      <div className="flex items-center gap-3">
        {pathname !== '/sales/add' && (
          <Link
            href="/sales/add"
            className="optic-btn-primary py-2 px-3 sm:px-4 text-xs sm:text-sm font-semibold rounded-xl"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Sale</span>
          </Link>
        )}

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-rose-50 border border-rose-200 text-brand-600 flex items-center justify-center font-bold text-xs">
            <User className="w-4 h-4" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">
              {user?.name || 'Store Owner'}
            </p>
            <p className="text-[10px] text-emerald-600 font-medium">Online</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
