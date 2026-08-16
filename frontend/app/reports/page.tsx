'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  Glasses,
  Users,
  Wallet,
  Download,
  Calendar,
  FileSpreadsheet,
  Package,
  ArrowUpRight,
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { toast } from 'sonner';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'sales' | 'products' | 'customers' | 'payments'>('sales');
  const [timeframe, setTimeframe] = useState('this_month');
  const [loading, setLoading] = useState(true);

  // Report Data
  const [salesReport, setSalesReport] = useState<any>(null);
  const [productReport, setProductReport] = useState<any>(null);
  const [customerReport, setCustomerReport] = useState<any[]>([]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      if (activeTab === 'sales' || activeTab === 'payments') {
        const res = await api.get(`/reports/sales?filter=${timeframe}`);
        if (res.data.success) {
          setSalesReport(res.data.data);
        }
      } else if (activeTab === 'products') {
        const res = await api.get('/reports/products');
        if (res.data.success) {
          setProductReport(res.data.data);
        }
      } else if (activeTab === 'customers') {
        const res = await api.get('/reports/customers');
        if (res.data.success) {
          setCustomerReport(res.data.data);
        }
      }
    } catch (err: any) {
      toast.error('Failed to load reports: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [activeTab, timeframe]);

  // Export to CSV helper
  const exportToCSV = (filename: string, rows: object[]) => {
    if (!rows || rows.length === 0) {
      toast.error('No data available to export');
      return;
    }

    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent =
      keys.join(separator) +
      '\n' +
      rows
        .map((row: any) =>
          keys
            .map((k) => {
              let cell = row[k] === null || row[k] === undefined ? '' : row[k];
              cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
              if (cell.search(/("|,|\n)/g) >= 0) {
                cell = `"${cell}"`;
              }
              return cell;
            })
            .join(separator)
        )
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported to CSV successfully');
  };

  const handleExportCurrentReport = () => {
    if (activeTab === 'sales' && salesReport?.invoices) {
      const exportData = salesReport.invoices.map((inv: any) => ({
        'Invoice Number': inv.invoiceNumber,
        'Customer Name': inv.customerSnapshot?.name || 'Walk-in',
        'Customer Phone': inv.customerSnapshot?.mobile || '',
        Date: formatDate(inv.invoiceDate || inv.createdAt),
        Subtotal: inv.subtotal,
        Discount: inv.totalDiscount,
        Tax: inv.tax,
        'Grand Total': inv.grandTotal,
        'Paid Amount': (inv.cashAmount || 0) + (inv.onlineAmount || 0),
        'Due Balance': inv.dueAmount,
        'Payment Status': inv.paymentStatus,
        'Payment Method': inv.paymentMethod,
      }));
      exportToCSV('DrashtiOptic_Sales_Report', exportData);
    } else if (activeTab === 'products' && productReport?.bestSellers) {
      const exportData = productReport.bestSellers.map((item: any) => ({
        'Product Name': item.name,
        Category: item.categoryName,
        Brand: item.brand,
        'Total Quantity Sold': item.totalQuantitySold,
        'Total Revenue (₹)': item.totalRevenue,
      }));
      exportToCSV('DrashtiOptic_Product_Sales', exportData);
    } else if (activeTab === 'customers' && customerReport) {
      const exportData = customerReport.map((c: any) => ({
        'Customer ID': c.customerId,
        Name: c.name,
        Mobile: c.mobile,
        City: c.city,
        'Total Purchases (₹)': c.totalPurchases,
        'Total Paid (₹)': c.totalPaid,
        'Total Due (₹)': c.totalDue,
        'Last Purchase': c.lastPurchaseDate ? formatDate(c.lastPurchaseDate) : 'N/A',
      }));
      exportToCSV('DrashtiOptic_Customer_Accounts', exportData);
    } else if (activeTab === 'payments' && salesReport?.invoices) {
      const exportData = salesReport.invoices.map((inv: any) => ({
        'Invoice Number': inv.invoiceNumber,
        'Customer Name': inv.customerSnapshot?.name || 'Walk-in',
        Date: formatDate(inv.invoiceDate || inv.createdAt),
        'Total Amount (₹)': inv.grandTotal,
        'Cash (₹)': inv.cashAmount || 0,
        'Online / UPI (₹)': inv.onlineAmount || 0,
        'Balance Due (₹)': inv.dueAmount || 0,
        'Payment Mode': inv.paymentMethod,
        'Payment Status': inv.paymentStatus,
      }));
      exportToCSV('DrashtiOptic_Payment_Breakdown', exportData);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-brand-600" />
            <span>Store Reports & Business Analytics</span>
          </h2>
          <p className="text-xs text-slate-500">
            Exportable business insights, top eyewear sellers, revenue ledger, and customer accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCurrentReport}
          className="optic-btn-secondary py-2.5 px-4 text-xs font-bold shadow-sm"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Export to CSV / Excel</span>
        </button>
      </div>

      {/* Tabs & Filter Bar */}
      <div className="optic-card p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Tab Buttons */}
        <div className="flex flex-wrap gap-1 w-full sm:w-auto">
          {[
            { id: 'sales', label: 'Sales Report', icon: TrendingUp },
            { id: 'products', label: 'Product Analytics', icon: Glasses },
            { id: 'customers', label: 'Customer Spenders', icon: Users },
            { id: 'payments', label: 'Payments & Due', icon: Wallet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Timeframe selector (for Sales & Payments) */}
        {(activeTab === 'sales' || activeTab === 'payments') && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="optic-select py-1.5 px-3 text-xs w-auto"
            >
              <option value="this_month">This Month</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this_week">This Week</option>
              <option value="last_month">Last Month</option>
              <option value="all">All Time</option>
            </select>
          </div>
        )}
      </div>

      {/* Report Content */}
      {loading ? (
        <div className="py-16">
          <LoadingSpinner text="Crunching numbers & generating report..." />
        </div>
      ) : activeTab === 'sales' ? (
        <div className="space-y-6">
          {/* Summary Totals Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="optic-card p-4">
              <p className="text-[10px] font-bold uppercase text-slate-500">Gross Sales</p>
              <p className="text-xl font-extrabold text-slate-900 mt-1">
                {formatCurrency(salesReport?.totals?.subtotal || 0)}
              </p>
            </div>
            <div className="optic-card p-4">
              <p className="text-[10px] font-bold uppercase text-slate-500">Total Discounts</p>
              <p className="text-xl font-extrabold text-rose-600 mt-1">
                - {formatCurrency(salesReport?.totals?.discount || 0)}
              </p>
            </div>
            <div className="optic-card p-4">
              <p className="text-[10px] font-bold uppercase text-slate-500">Net Revenue</p>
              <p className="text-xl font-extrabold text-emerald-600 mt-1">
                {formatCurrency(salesReport?.totals?.grandTotal || 0)}
              </p>
            </div>
            <div className="optic-card p-4">
              <p className="text-[10px] font-bold uppercase text-slate-500">Pending Due</p>
              <p className="text-xl font-extrabold text-amber-600 mt-1">
                {formatCurrency(salesReport?.totals?.due || 0)}
              </p>
            </div>
          </div>

          {/* Sales Table */}
          <div className="optic-card overflow-hidden">
            <div className="table-responsive">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3 text-right">Gross Total</th>
                    <th className="py-3 px-3 text-right">Discount</th>
                    <th className="py-3 px-3 text-right">Net Billed</th>
                    <th className="py-3 px-3 text-right">Paid</th>
                    <th className="py-3 px-3 text-right">Due</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesReport?.invoices?.map((inv: any) => (
                    <tr key={inv._id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {inv.customerSnapshot?.name || 'Walk-in'}
                      </td>
                      <td className="py-3 px-3 text-slate-500">{formatDate(inv.invoiceDate || inv.createdAt)}</td>
                      <td className="py-3 px-3 text-right">{formatCurrency(inv.subtotal)}</td>
                      <td className="py-3 px-3 text-right text-rose-600">
                        {inv.totalDiscount > 0 ? `- ${formatCurrency(inv.totalDiscount)}` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">
                        {formatCurrency(inv.grandTotal)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-emerald-600">
                        {formatCurrency((inv.cashAmount || 0) + (inv.onlineAmount || 0))}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-600">
                        {formatCurrency(inv.dueAmount)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge
                          variant={inv.paymentStatus === 'Paid' ? 'success' : inv.paymentStatus === 'Partial' ? 'warning' : 'danger'}
                          size="sm"
                        >
                          {inv.paymentStatus}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'products' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Top Selling Products */}
          <div className="lg:col-span-7 optic-card p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Top-Selling Eyewear & Lenses</h3>
            <div className="table-responsive">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase">
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-center">Qty Sold</th>
                    <th className="py-2.5 px-3 text-right">Revenue Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productReport?.bestSellers?.map((p: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900">{p.name}</p>
                        {p.brand && <p className="text-[10px] text-slate-400">{p.brand}</p>}
                      </td>
                      <td className="py-3 px-3 text-slate-600">{p.categoryName || '-'}</td>
                      <td className="py-3 px-3 text-center font-black text-brand-600">
                        {p.totalQuantitySold}
                      </td>
                      <td className="py-3 px-3 text-right font-extrabold text-slate-900">
                        {formatCurrency(p.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stock Health & Alerts */}
          <div className="lg:col-span-5 optic-card p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Replenishment Alerts</h3>
            <div className="space-y-3">
              {productReport?.stockAlerts?.map((item: any) => (
                <div
                  key={item._id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-800">{item.name}</p>
                    <p className="text-[10px] text-slate-500">Min Alert: {item.minimumStock} units</p>
                  </div>
                  <Badge variant={item.stock <= 0 ? 'danger' : 'warning'} size="sm">
                    {item.stock <= 0 ? 'Out of Stock' : `${item.stock} left`}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'customers' ? (
        <div className="optic-card overflow-hidden">
          <div className="table-responsive">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4">Rank</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-4 text-right">Lifetime Purchases</th>
                  <th className="py-3 px-4 text-right">Total Paid</th>
                  <th className="py-3 px-4 text-right">Balance Due</th>
                  <th className="py-3 px-3">Last Visit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerReport.map((c: any, idx: number) => (
                  <tr key={c._id} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 font-black text-slate-400">#{idx + 1}</td>
                    <td className="py-3.5 px-4">
                      <Link href={`/customers/${c._id}`} className="font-bold text-slate-900 hover:text-brand-600">
                        {c.name}
                      </Link>
                      <p className="text-[10px] text-slate-400 font-mono">📱 {c.mobile}</p>
                    </td>
                    <td className="py-3.5 px-3 text-slate-600">{c.city || '-'}</td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900">
                      {formatCurrency(c.totalPurchases)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                      {formatCurrency(c.totalPaid)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-rose-600">
                      {formatCurrency(c.totalDue)}
                    </td>
                    <td className="py-3.5 px-3 text-slate-500">
                      {c.lastPurchaseDate ? formatDate(c.lastPurchaseDate) : 'New'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Payments & Due Report */
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="optic-card p-5">
              <p className="text-xs font-bold uppercase text-slate-500">Total Billed</p>
              <p className="text-2xl font-black text-slate-900 mt-1">
                {formatCurrency(salesReport?.totals?.grandTotal || 0)}
              </p>
            </div>
            <div className="optic-card p-5">
              <p className="text-xs font-bold uppercase text-slate-500">Cash Payments</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">
                {formatCurrency(salesReport?.totals?.cash || 0)}
              </p>
            </div>
            <div className="optic-card p-5">
              <p className="text-xs font-bold uppercase text-slate-500">Online & Digital</p>
              <p className="text-2xl font-black text-sky-600 mt-1">
                {formatCurrency(salesReport?.totals?.online || 0)}
              </p>
            </div>
          </div>

          <div className="optic-card overflow-hidden">
            <div className="table-responsive">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase">
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3 text-right">Invoice Amount</th>
                    <th className="py-3 px-3 text-right">Cash</th>
                    <th className="py-3 px-3 text-right">Online / UPI</th>
                    <th className="py-3 px-3 text-right">Balance Due</th>
                    <th className="py-3 px-3 text-center">Payment Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesReport?.invoices?.map((inv: any) => (
                    <tr key={inv._id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{inv.customerSnapshot?.name || 'Walk-in'}</td>
                      <td className="py-3 px-3 text-slate-500">{formatDate(inv.invoiceDate || inv.createdAt)}</td>
                      <td className="py-3 px-3 text-right font-black text-slate-900">{formatCurrency(inv.grandTotal)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-emerald-600">
                        {formatCurrency(inv.cashAmount || 0)}
                      </td>
                      <td className="py-3 px-3 text-right font-semibold text-sky-600">
                        {formatCurrency(inv.onlineAmount || 0)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-rose-600">
                        {formatCurrency(inv.dueAmount || 0)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge
                          variant={inv.paymentStatus === 'Paid' ? 'success' : inv.paymentStatus === 'Partial' ? 'warning' : 'danger'}
                          size="sm"
                        >
                          {inv.paymentStatus}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
