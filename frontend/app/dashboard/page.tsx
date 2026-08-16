'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  TrendingUp,
  Receipt,
  AlertTriangle,
  ArrowUpRight,
  PlusCircle,
  Clock,
  Sparkles,
  RefreshCw,
  Wallet,
  IndianRupee,
  ShoppingBag,
  CreditCard,
  Banknote,
  Package,
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import StatCard from '@/components/ui/StatCard';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { toast } from 'sonner';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<any>(null);

  const fetchDashboard = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.get('/reports/dashboard');
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err: any) {
      toast.error('Failed to load dashboard data: ' + err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return <LoadingSpinner fullPage text="Loading Drashti Optic Store Analytics..." />;
  }

  const {
    sales = { today: 0, todayCount: 0, thisMonth: 0, thisMonthCount: 0, lifetime: 0, lifetimeCount: 0 },
    payments = { totalPaid: 0, totalDue: 0, cash: 0, online: 0 },
    customers = { total: 0, newThisMonth: 0 },
    inventory = { totalItems: 0, lowStockCount: 0 },
    recentSales = [],
    lowStockItems = [],
  } = data || {};

  return (
    <div className="space-y-6 pb-28">
      {/* Top Banner: Store Operational Hub */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Optical Store Control Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Drashti Optic Store Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Real-time optical sales, customer prescriptions, payments ledger, and inventory alerts.
            </p>
          </div>

          {/* Quick Counter Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => fetchDashboard(true)}
              disabled={refreshing}
              className="p-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-2xl border border-slate-700 transition-all active:scale-95 disabled:opacity-50"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-brand-500' : ''}`} />
            </button>

            <Link
              href="/sales/add"
              className="inline-flex items-center gap-2 px-5 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-2xl shadow-lg shadow-brand-600/30 transition-all active:scale-95 text-sm"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Fast Billing</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Row 1: Key Performance Metrics Cards (4 on desktop, 2x2 on tablet/mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(sales.today)}
          subtitle={`${sales.todayCount} invoice${sales.todayCount === 1 ? '' : 's'} today`}
          icon={Receipt}
          colorVariant="brand"
          href="/sales?filter=today"
        />
        <StatCard
          title="This Month Sales"
          value={formatCurrency(sales.thisMonth)}
          subtitle={`${sales.thisMonthCount} invoice${sales.thisMonthCount === 1 ? '' : 's'} this month`}
          icon={TrendingUp}
          colorVariant="emerald"
          href="/sales?filter=this_month"
        />
        <StatCard
          title="Total Customers"
          value={customers.total}
          subtitle={`+${customers.newThisMonth} new this month`}
          icon={Users}
          colorVariant="blue"
          href="/customers"
        />
        <StatCard
          title="Total Due / Pending"
          value={formatCurrency(payments.totalDue)}
          subtitle={`Total Paid: ${formatCurrency(payments.totalPaid)}`}
          icon={Wallet}
          colorVariant={payments.totalDue > 0 ? 'amber' : 'emerald'}
          href="/sales?filter=all&paymentStatus=Due"
        />
      </div>

      {/* Row 2: Secondary Quick Stats (Cash vs Online Split & Inventory Health) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Link
          href="/sales?filter=this_month&paymentMethod=Cash"
          className="optic-card p-4 flex items-center gap-3 hover:border-brand-300 hover:shadow-md transition-all group"
        >
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
            <Banknote className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-500 group-hover:text-slate-800 transition-colors">Cash Collected</p>
            <p className="text-base sm:text-lg font-extrabold text-slate-900 group-hover:text-brand-600 transition-colors">{formatCurrency(payments.cash)}</p>
          </div>
        </Link>

        <Link
          href="/sales?filter=this_month&paymentMethod=Online"
          className="optic-card p-4 flex items-center gap-3 hover:border-brand-300 hover:shadow-md transition-all group"
        >
          <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 group-hover:bg-sky-100 transition-colors">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-500 group-hover:text-slate-800 transition-colors">Online / UPI</p>
            <p className="text-base sm:text-lg font-extrabold text-slate-900 group-hover:text-brand-600 transition-colors">{formatCurrency(payments.online)}</p>
          </div>
        </Link>

        <Link
          href="/items"
          className="optic-card p-4 flex items-center gap-3 hover:border-brand-300 hover:shadow-md transition-all group"
        >
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 group-hover:bg-slate-200 transition-colors">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-500 group-hover:text-slate-800 transition-colors">Catalog Products</p>
            <p className="text-base sm:text-lg font-extrabold text-slate-900 group-hover:text-brand-600 transition-colors">{inventory.totalItems}</p>
          </div>
        </Link>

        <Link
          href="/sales?filter=all"
          className="optic-card p-4 flex items-center gap-3 hover:border-brand-300 hover:shadow-md transition-all group"
        >
          <div className="p-2.5 rounded-xl bg-rose-50 text-brand-600 border border-rose-100 group-hover:bg-rose-100 transition-colors">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-500 group-hover:text-slate-800 transition-colors">Total Invoices</p>
            <p className="text-base sm:text-lg font-extrabold text-slate-900 group-hover:text-brand-600 transition-colors">{sales.lifetimeCount}</p>
          </div>
        </Link>
      </div>

      {/* Row 3: Split Tables - Recent Invoices & Low Stock Items */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recent Invoices */}
        <div className="lg:col-span-8 optic-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Recent Invoices</h3>
                <p className="text-xs text-slate-500">Latest sales processed at counter</p>
              </div>
              <Link
                href="/sales"
                className="text-xs font-bold text-brand-600 hover:text-brand-700 inline-flex items-center gap-1"
              >
                <span>View All Invoices</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="table-responsive">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3 text-right">Grand Total</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentSales.length > 0 ? (
                    recentSales.map((inv: any) => {
                      const custName = inv.customerSnapshot?.name || (typeof inv.customer === 'object' && inv.customer ? inv.customer.name : '') || 'Walk-in';
                      const custMobile = inv.customerSnapshot?.mobile || (typeof inv.customer === 'object' && inv.customer ? inv.customer.mobile : '') || '-';

                      return (
                        <tr key={inv._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            {inv.invoiceNumber}
                          </td>
                          <td className="py-3 px-3">
                            <p className="font-semibold text-slate-800">{custName}</p>
                            <p className="text-[10px] text-slate-400 font-mono">📱 {custMobile}</p>
                          </td>
                        <td className="py-3 px-3 text-slate-600">{formatDate(inv.createdAt)}</td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          {formatCurrency(inv.grandTotal)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge
                            variant={
                              inv.paymentStatus === 'Paid'
                                ? 'success'
                                : inv.paymentStatus === 'Partial'
                                  ? 'warning'
                                  : 'danger'
                            }
                            size="sm"
                          >
                            {inv.paymentStatus}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link
                            href={`/sales/${inv._id}`}
                            className="font-semibold text-brand-600 hover:text-brand-700 text-xs"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No sales recorded yet today. Click Fast Billing to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <Link
              href="/sales"
              className="optic-btn-secondary w-full text-center text-xs py-2"
            >
              View All Invoices
            </Link>
          </div>
        </div>

        {/* Right: Quick Store Actions & Low Stock Alerts */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Shortcuts */}
          <div className="optic-card p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Quick Store Actions</h3>
            <p className="text-xs text-slate-500">Fast shortcuts for daily counter operations</p>

            <div className="space-y-2">
              <Link
                href="/sales/add"
                className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-brand-600 to-rose-600 text-white font-bold text-xs shadow-md shadow-brand-600/20 hover:opacity-95 transition-opacity"
              >
                <div className="flex items-center gap-2.5">
                  <Receipt className="w-4 h-4" />
                  <span>New Sale (Fast Billing)</span>
                </div>
                <ArrowUpRight className="w-4 h-4" />
              </Link>

              <Link
                href="/customers"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>Customer Directory</span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">{customers.total}</span>
              </Link>

              <Link
                href="/items"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="w-4 h-4 text-slate-500" />
                  <span>Eyewear Catalog</span>
                </div>
                <span className="text-slate-400 font-mono text-[11px]">{inventory.totalItems}</span>
              </Link>

              <Link
                href="/sales"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="w-4 h-4 text-slate-500" />
                  <span>Sales Reports & CSV</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </Link>
            </div>
          </div>

          {/* Low Stock Alerts */}
          {lowStockItems.length > 0 && (
            <div className="optic-card p-6 border-amber-200 bg-amber-50/40">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Low Stock Warning</span>
                </div>
                <Badge variant="warning" size="sm">
                  {lowStockItems.length} item{lowStockItems.length === 1 ? '' : 's'}
                </Badge>
              </div>

              <div className="space-y-2">
                {lowStockItems.map((item: any) => (
                  <div
                    key={item._id}
                    className="p-2.5 bg-white rounded-xl border border-amber-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{item.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{item.sku}</p>
                    </div>
                    <span className="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg text-[10px]">
                      {item.stock} left
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
