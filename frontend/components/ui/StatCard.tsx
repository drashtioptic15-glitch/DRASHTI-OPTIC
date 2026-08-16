'use client';

import React from 'react';
import Link from 'next/link';
import { LucideIcon, ArrowUpRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  colorVariant?: 'brand' | 'emerald' | 'amber' | 'blue' | 'slate';
  href?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendUp = true,
  colorVariant = 'brand',
  href,
}) => {
  const iconColorClasses = {
    brand: 'bg-rose-50 text-brand-600 border-rose-100 group-hover:bg-rose-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-100',
    blue: 'bg-sky-50 text-sky-600 border-sky-100 group-hover:bg-sky-100',
    slate: 'bg-slate-100 text-slate-700 border-slate-200 group-hover:bg-slate-200',
  }[colorVariant];

  const cardContent = (
    <div className="optic-card p-3.5 sm:p-4 lg:p-5 relative flex flex-col justify-between h-full space-y-2 group-hover:border-brand-300 group-hover:shadow-md transition-all duration-200">
      {/* Top line: Title on Left, Icon Badge on Right */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 truncate group-hover:text-slate-800 transition-colors">
            {title}
          </p>
          {href && <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-brand-600 transition-colors shrink-0" />}
        </div>
        <div className={`p-1.5 sm:p-2 rounded-xl border ${iconColorClasses} shrink-0 transition-colors`}>
          <Icon className="w-4 h-4 text-current" />
        </div>
      </div>

      {/* Main Big Number */}
      <div className="py-0.5">
        <p className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate leading-none group-hover:text-brand-600 transition-colors">
          {value}
        </p>
      </div>

      {/* Bottom Subtitle / Trend */}
      {(subtitle || trend) && (
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 gap-1">
          <span className="truncate">{subtitle}</span>
          {trend && (
            <span
              className={`font-bold shrink-0 ${trendUp ? 'text-emerald-600' : 'text-rose-600'}`}
            >
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block group h-full">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
};

export default StatCard;
