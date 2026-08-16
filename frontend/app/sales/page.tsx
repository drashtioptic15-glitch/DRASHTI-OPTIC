'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Plus,
  Receipt,
  Download,
  Printer,
  Send,
  Eye,
  Trash2,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Banknote,
  CreditCard,
  RefreshCw,
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Invoice } from '@/types';
import Badge from '@/components/ui/Badge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';

export default function SalesPage() {
  return (
    <React.Suspense fallback={<LoadingSpinner fullPage text="Loading sales ledger..." />}>
      <SalesContent />
    </React.Suspense>
  );
}

function SalesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] = useState<any>({
    totalSales: 0,
    totalPaid: 0,
    totalDue: 0,
    cashTotal: 0,
    onlineTotal: 0,
    count: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters initialized from URL query params if present
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [dateFilter, setDateFilter] = useState(searchParams.get('filter') || 'this_month');
  const [paymentStatus, setPaymentStatus] = useState(searchParams.get('paymentStatus') || 'all');
  const [paymentMethod, setPaymentMethod] = useState(searchParams.get('paymentMethod') || 'all');
  const [whatsappStatus, setWhatsappStatus] = useState('all');

  // Synchronize when URL searchParams update
  useEffect(() => {
    const f = searchParams.get('filter');
    const ps = searchParams.get('paymentStatus');
    const pm = searchParams.get('paymentMethod');
    if (f) setDateFilter(f);
    if (ps) setPaymentStatus(ps);
    if (pm) setPaymentMethod(pm);
  }, [searchParams]);

  // Delete State
  const [deleteInvoiceId, setDeleteInvoiceId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // WhatsApp Retry State
  const [sendingWaId, setSendingWaId] = useState<string | null>(null);

  const fetchSales = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        filter: dateFilter,
        paymentStatus,
        paymentMethod,
        whatsappStatus,
      });
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/sales?${params.toString()}`);
      if (res.data.success) {
        setInvoices(res.data.data);
        setSummary(res.data.summary);
        setPagination(res.data.pagination);
      }
    } catch (err: any) {
      toast.error('Failed to load sales: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales(1);
  }, [dateFilter, paymentStatus, paymentMethod, whatsappStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSales(1);
  };

  const handleSendWhatsApp = async (invoiceId: string) => {
    setSendingWaId(invoiceId);
    try {
      const res = await api.post(`/sales/${invoiceId}/send-whatsapp`);
      if (res.data.success) {
        toast.success('Invoice PDF sent via WhatsApp successfully!');
      } else {
        toast.error(`WhatsApp notice: ${res.data.message}`);
      }
      fetchSales(pagination.page);
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch WhatsApp');
    } finally {
      setSendingWaId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteInvoiceId) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/sales/${deleteInvoiceId}`);
      if (res.data.success) {
        toast.success('Invoice deleted and stock restored successfully');
        setDeleteInvoiceId(null);
        fetchSales(pagination.page);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete invoice');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-brand-600" />
            <span>Sales & Invoices</span>
          </h2>
          <p className="text-xs text-slate-500">
            View past billing records, payment statuses, PDF invoices, and WhatsApp delivery logs.
          </p>
        </div>

        <Link
          href="/sales/add"
          className="optic-btn-primary py-2.5 px-4 text-xs sm:text-sm font-bold shadow-md shadow-brand-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>New Sale</span>
        </Link>
      </div>

      {/* Summary KPI Cards for Current Filtered Set */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="optic-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Filtered Sales</p>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
            {formatCurrency(summary.totalSales)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">{summary.count} invoices</p>
        </div>

        <div className="optic-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Paid</p>
          <p className="text-lg sm:text-xl font-extrabold text-emerald-600 mt-1">
            {formatCurrency(summary.totalPaid)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Collected</p>
        </div>

        <div className="optic-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Due</p>
          <p className={`text-lg sm:text-xl font-extrabold mt-1 ${summary.totalDue > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {formatCurrency(summary.totalDue)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Pending collection</p>
        </div>

        <div className="optic-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Cash Received</p>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
            {formatCurrency(summary.cashTotal)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Counter cash</p>
        </div>

        <div className="optic-card p-4 col-span-2 sm:col-span-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Online / UPI</p>
          <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
            {formatCurrency(summary.onlineTotal)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Digital payments</p>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="optic-card p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by invoice number, customer name or phone..."
              className="optic-input pr-10 pl-3.5 text-xs sm:text-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
          </div>

          <button type="submit" className="optic-btn-secondary text-xs font-semibold py-2 px-4">
            Search
          </button>
        </form>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
          {/* Date Presets */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Timeframe</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="optic-select py-1.5 px-2 text-xs"
            >
              <option value="this_month">This Month</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="last_month">Last Month</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Payment Status */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Payment Status</label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value)}
              className="optic-select py-1.5 px-2 text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Due">Due</option>
            </select>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="optic-select py-1.5 px-2 text-xs"
            >
              <option value="all">All Methods</option>
              <option value="Cash">Cash</option>
              <option value="Online">Online</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
            </select>
          </div>

          {/* WhatsApp Status */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">WhatsApp Status</label>
            <select
              value={whatsappStatus}
              onChange={(e) => setWhatsappStatus(e.target.value)}
              className="optic-select py-1.5 px-2 text-xs"
            >
              <option value="all">All WhatsApp</option>
              <option value="Sent">Sent / Delivered</option>
              <option value="Failed">Failed / Not Sent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Invoices Table */}
      <div className="optic-card overflow-hidden">
        {loading ? (
          <div className="py-16">
            <LoadingSpinner text="Fetching invoice ledger..." />
          </div>
        ) : invoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No Invoices Found"
            description="No sales records matching your selected search or filter criteria."
            actionText="Create New Sale"
            onAction={() => router.push('/sales/add')}
          />
        ) : (
          <div className="table-responsive">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px] sm:text-xs">
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-2 text-center">Date</th>
                  <th className="py-2.5 px-2 text-center">Items</th>
                  <th className="py-2.5 px-3 text-right">Grand Total & Paid</th>
                  <th className="py-2.5 px-2 text-center">Status</th>
                  <th className="py-2.5 px-2 text-center">WhatsApp</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const paid = (inv.cashAmount || 0) + (inv.onlineAmount || 0);
                  const cust = inv.customerSnapshot || (typeof inv.customer === 'object' ? inv.customer : { name: 'Walk-in', mobile: '-' });

                  return (
                    <tr key={inv._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <Link href={`/sales/${inv._id}`} className="hover:text-brand-600 hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-800 leading-tight">{cust.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">📱 {cust.mobile}</p>
                      </td>
                      <td className="py-3 px-2 text-center text-slate-500 whitespace-nowrap text-[11px]">
                        {formatDate(inv.invoiceDate || inv.createdAt)}
                      </td>
                      <td className="py-3 px-2 text-center text-slate-600 whitespace-nowrap">
                        <span className="font-semibold text-slate-800">{inv.items?.length || 0}</span>
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <p className="font-extrabold text-slate-900 text-xs">{formatCurrency(inv.grandTotal)}</p>
                        <div className="flex items-center justify-end gap-1 text-[10px] mt-0.5">
                          <span className="text-emerald-600 font-semibold">{formatCurrency(paid)}</span>
                          {inv.dueAmount > 0 && (
                            <span className="text-rose-600 font-bold">• Due: {formatCurrency(inv.dueAmount)}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center whitespace-nowrap">
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
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <Badge
                          variant={
                            inv.whatsappStatus === 'Sent' || inv.whatsappStatus === 'Delivered' || inv.whatsappStatus === 'Read'
                              ? 'success'
                              : inv.whatsappStatus === 'Failed'
                                ? 'danger'
                                : 'neutral'
                          }
                          size="sm"
                        >
                          {inv.whatsappStatus === 'Not Configured' ? 'Pending' : inv.whatsappStatus}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-2 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                          <Link
                            href={`/sales/${inv._id}`}
                            className="p-1 text-slate-400 hover:text-brand-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="View Invoice Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>

                          <a
                            href={`/api/invoices/${inv._id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleSendWhatsApp(inv._id)}
                            disabled={sendingWaId === inv._id}
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                            title="Send WhatsApp PDF"
                          >
                            <Send className={`w-3.5 h-3.5 ${sendingWaId === inv._id ? 'animate-spin' : ''}`} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteInvoiceId(inv._id)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                            title="Delete / Cancel Invoice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {invoices.length} of {pagination.total} invoices
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => fetchSales(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="optic-btn-secondary py-1 px-3 text-xs"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => fetchSales(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="optic-btn-secondary py-1 px-3 text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteInvoiceId)}
        onClose={() => setDeleteInvoiceId(null)}
        onConfirm={handleDeleteConfirm}
        title="Cancel & Delete Invoice"
        message="Are you sure you want to delete this invoice? Deleting the invoice will restore sold inventory stock and revert customer financial balances."
        confirmText="Yes, Delete Invoice"
        isDangerous
        loading={isDeleting}
      />
    </div>
  );
}
