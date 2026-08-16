'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeftRight,
  Search,
  Banknote,
  CreditCard,
  Calendar,
  Filter,
  Receipt,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { Transaction } from '@/types';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<any>({
    totalAmount: 0,
    cashAmount: 0,
    onlineAmount: 0,
    count: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('this_month');
  const [paymentType, setPaymentType] = useState('all');
  const [status, setStatus] = useState('all');

  const fetchTransactions = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        filter: dateFilter,
        paymentType,
        status,
      });
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/transactions?${params.toString()}`);
      if (res.data.success) {
        setTransactions(res.data.data);
        setSummary(res.data.summary);
        setPagination(res.data.pagination);
      }
    } catch (err: any) {
      toast.error('Failed to load transactions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(1);
  }, [dateFilter, paymentType, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions(1);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-brand-600" />
            <span>Financial Transactions Ledger</span>
          </h2>
          <p className="text-xs text-slate-500">
            Real-time audit log of all optical store cash and digital payments received.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="optic-card p-5 bg-gradient-to-br from-white to-slate-50/50">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Payments</p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {formatCurrency(summary.totalAmount)}
          </p>
          <p className="text-xs text-slate-400 mt-1">{summary.count} transactions logged</p>
        </div>

        <div className="optic-card p-5 bg-gradient-to-br from-white to-emerald-50/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Cash Received</p>
            <Banknote className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {formatCurrency(summary.cashAmount)}
          </p>
          <p className="text-xs text-slate-400 mt-1">Counter cash register</p>
        </div>

        <div className="optic-card p-5 bg-gradient-to-br from-white to-sky-50/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Online & Digital</p>
            <CreditCard className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-sky-600 mt-1">
            {formatCurrency(summary.onlineAmount)}
          </p>
          <p className="text-xs text-slate-400 mt-1">UPI, Card & Bank Transfers</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="optic-card p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Transaction ID, Reference Number, or Notes..."
              className="optic-input pr-10 pl-3.5 text-xs sm:text-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
          </div>
          <button type="submit" className="optic-btn-secondary text-xs font-semibold py-2 px-4">
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-xs">
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

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Payment Mode</label>
            <select
              value={paymentType}
              onChange={(e) => setPaymentType(e.target.value)}
              className="optic-select py-1.5 px-2 text-xs"
            >
              <option value="all">All Payment Types</option>
              <option value="Cash">Cash</option>
              <option value="Online">Online</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="optic-select py-1.5 px-2 text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="optic-card overflow-hidden">
        {loading ? (
          <div className="py-16">
            <LoadingSpinner text="Loading financial ledger..." />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No Transactions Found"
            description="No financial ledger entries found for the selected filter criteria."
          />
        ) : (
          <div className="table-responsive">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Txn ID</th>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-3">Date & Time</th>
                  <th className="py-3 px-3">Mode</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4">Notes / Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((txn) => {
                  const cust = typeof txn.customer === 'object' ? txn.customer : null;
                  const inv = typeof txn.invoice === 'object' ? txn.invoice : null;

                  return (
                    <tr key={txn._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {txn.transactionId}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-brand-600 whitespace-nowrap">
                        {inv ? (
                          <Link href={`/sales/${inv._id}`} className="hover:underline flex items-center gap-1">
                            <span>{inv.invoiceNumber}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {cust ? (
                          <>
                            <p className="font-bold text-slate-800">{cust.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">📱 {cust.mobile}</p>
                          </>
                        ) : (
                          'Walk-in'
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                        {formatDateTime(txn.createdAt)}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <Badge
                          variant={txn.paymentType === 'Cash' ? 'neutral' : 'info'}
                          size="sm"
                        >
                          {txn.paymentType}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                        {formatCurrency(txn.amount)}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <Badge
                          variant={txn.status === 'Completed' ? 'success' : 'danger'}
                          size="sm"
                        >
                          {txn.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                        {txn.referenceNumber && <span className="font-mono text-slate-700 font-semibold">{txn.referenceNumber} • </span>}
                        {txn.notes || '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {transactions.length} of {pagination.total} transaction records
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => fetchTransactions(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="optic-btn-secondary py-1 px-3 text-xs"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => fetchTransactions(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="optic-btn-secondary py-1 px-3 text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
