'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Printer,
  Send,
  Trash2,
  Receipt,
  Phone,
  Eye,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils';
import { Invoice, StoreSettings } from '@/types';
import Badge from '@/components/ui/Badge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { toast } from 'sonner';

export default function InvoiceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const invoiceId = resolvedParams.id;
  const router = useRouter();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingWa, setSendingWa] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const fetchInvoiceData = async () => {
    try {
      const [invRes, setRes] = useState<any>([null, null]);
      const res1 = await api.get(`/sales/${invoiceId}`);
      const res2 = await api.get('/settings');
      if (res1.data.success) {
        setInvoice(res1.data.data);
      }
      if (res2.data.success) {
        setSettings(res2.data.data);
      }
    } catch (err: any) {
      toast.error('Failed to load invoice details: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoiceData();
  }, [invoiceId]);

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = async () => {
    setSendingWa(true);
    try {
      const res = await api.post(`/sales/${invoiceId}/send-whatsapp`);
      if (res.data.success) {
        toast.success('Invoice PDF dispatched to customer WhatsApp!');
      } else {
        toast.error(`WhatsApp notice: ${res.data.message}`);
      }
      fetchInvoiceData();
    } catch (err: any) {
      toast.error(err.message || 'WhatsApp dispatch failed');
    } finally {
      setSendingWa(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await api.delete(`/sales/${invoiceId}`);
      if (res.data.success) {
        toast.success('Invoice deleted and stock restored successfully');
        router.push('/sales');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete invoice');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage text="Loading invoice document..." />;
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 mb-4">Invoice not found</p>
        <Link href="/sales" className="optic-btn-primary">
          Back to Invoices
        </Link>
      </div>
    );
  }

  const cust = invoice.customerSnapshot || (typeof invoice.customer === 'object' ? invoice.customer : { name: 'Customer', mobile: '' });
  const p = invoice.prescriptionSnapshot || (typeof invoice.prescription === 'object' ? invoice.prescription : null);
  const hasPrescription = invoice.includePrescription !== false && p && (p.rightEye?.sph || p.rightEye?.cyl || p.leftEye?.sph || p.leftEye?.cyl || p.rightEye?.vn || p.leftEye?.vn || p.doctor);

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Top Action Bar (Hidden when printing) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          href="/sales"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Invoices</span>
        </Link>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="optic-btn-secondary py-2 px-3 text-xs font-semibold"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>

          <a
            href={`/api/invoices/${invoice._id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="optic-btn-secondary py-2 px-3 text-xs font-semibold"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </a>

          <button
            type="button"
            onClick={handleSendWhatsApp}
            disabled={sendingWa}
            className="optic-btn-primary py-2 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
          >
            <Send className={`w-4 h-4 ${sendingWa ? 'animate-spin' : ''}`} />
            <span>{invoice.whatsappStatus === 'Sent' ? 'Send Again (WhatsApp)' : 'Send WhatsApp PDF'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="optic-btn-danger py-2 px-3 text-xs font-semibold"
            title="Cancel & Delete Invoice"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* WhatsApp Status Alert Bar */}
      <div className="print:hidden p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">WhatsApp Delivery Status:</span>
          <Badge
            variant={
              invoice.whatsappStatus === 'Sent' || invoice.whatsappStatus === 'Delivered' || invoice.whatsappStatus === 'Read'
                ? 'success'
                : invoice.whatsappStatus === 'Failed'
                ? 'danger'
                : 'neutral'
            }
            size="sm"
          >
            {invoice.whatsappStatus}
          </Badge>
          {invoice.whatsappSentAt && (
            <span className="text-[11px] text-slate-400">
              (Sent: {formatDateTime(invoice.whatsappSentAt)})
            </span>
          )}
        </div>

        {invoice.whatsappError && (
          <span className="text-[11px] text-rose-600 font-medium truncate max-w-xs">
            {invoice.whatsappError}
          </span>
        )}
      </div>

      {/* INVOICE PAPER CONTAINER (Print-friendly format) */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 space-y-6">
        {/* Header Branding Banner */}
        <div className="p-6 rounded-2xl bg-slate-50 border-l-8 border-brand-600 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <img src="/drashti-optic-logo.png" alt="Drashti Optic" className="h-12 w-auto object-contain" />
            </div>
            <p className="text-xs font-bold text-slate-700">{settings?.tagline || 'EYEGLASSES | CONTACT LENSES | SUNGLASSES'}</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              {settings?.address || 'Shop No. 4, Crystal Plaza, Station Road'}, {settings?.city || 'Ahmedabad'}, {settings?.state || 'Gujarat'} - {settings?.pincode || '380001'}
            </p>
            <p className="text-xs text-slate-500">
              Phone: {settings?.phone || '+91 98765 43210'} | Email: {settings?.email || 'contact@drashtioptic.com'}
            </p>
            {settings?.gstNumber && (
              <p className="text-xs font-bold text-slate-700 mt-0.5">GSTIN: {settings.gstNumber}</p>
            )}
          </div>

          <div className="text-left sm:text-right space-y-1">
            <h3 className="text-xl font-black text-brand-600 tracking-tight">TAX INVOICE</h3>
            <p className="font-mono font-bold text-sm text-slate-900">#{invoice.invoiceNumber}</p>
            <p className="text-xs text-slate-500">Date: {formatDate(invoice.invoiceDate || invoice.createdAt)}</p>
            <div className="pt-1">
              <Badge
                variant={
                  invoice.paymentStatus === 'Paid'
                    ? 'success'
                    : invoice.paymentStatus === 'Partial'
                    ? 'warning'
                    : 'danger'
                }
                size="md"
              >
                Payment: {invoice.paymentStatus.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Customer Information Box */}
        <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80">
          <p className="text-xs font-bold text-brand-600 uppercase tracking-wider mb-2">BILLED TO (CUSTOMER)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-sm font-bold text-slate-900">{cust.name}</p>
              <p className="text-slate-600 font-mono">📱 Mobile: {cust.mobile}</p>
              {cust.alternateMobile && <p className="text-slate-500">Alt Mobile: {cust.alternateMobile}</p>}
            </div>
            <div>
              {cust.address && <p className="text-slate-600">Address: {cust.address}</p>}
              {cust.city && <p className="text-slate-600">{cust.city}, {cust.state} - {cust.pincode}</p>}
              {cust.email && <p className="text-slate-500">Email: {cust.email}</p>}
            </div>
          </div>
        </div>

        {/* Prescription Box if Present */}
        {hasPrescription && (
          <div className="p-4 rounded-2xl bg-rose-50/40 border border-rose-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-brand-600 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4" /> PRESCRIPTION MATRIX (O.D. / O.S.)
              </p>
              {p.doctor && (
                <p className="text-xs font-semibold text-slate-700">Prescribed By: {p.doctor}</p>
              )}
            </div>

            <div className="table-responsive">
              <table className="w-full text-center text-xs">
                <thead>
                  <tr className="bg-brand-600 text-white font-bold">
                    <th className="py-1.5 px-2 text-left">EYE</th>
                    <th className="py-1.5 px-2">SPH</th>
                    <th className="py-1.5 px-2">CYL</th>
                    <th className="py-1.5 px-2">AXIS</th>
                    <th className="py-1.5 px-2">V/N</th>
                    <th className="py-1.5 px-2">ADD</th>
                    <th className="py-1.5 px-2">PD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100 bg-white font-mono">
                  <tr>
                    <td className="py-2 px-2 text-left font-bold text-slate-800">Right (O.D.)</td>
                    <td className="py-2 px-2">{p.rightEye?.sph || '-'}</td>
                    <td className="py-2 px-2">{p.rightEye?.cyl || '-'}</td>
                    <td className="py-2 px-2">{p.rightEye?.axis || '-'}</td>
                    <td className="py-2 px-2">{p.rightEye?.vn || '6/'}</td>
                    <td className="py-2 px-2">{p.rightEye?.add || '-'}</td>
                    <td className="py-2 px-2">{p.rightEye?.pd || '-'}</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-2 text-left font-bold text-slate-800">Left (O.S.)</td>
                    <td className="py-2 px-2">{p.leftEye?.sph || '-'}</td>
                    <td className="py-2 px-2">{p.leftEye?.cyl || '-'}</td>
                    <td className="py-2 px-2">{p.leftEye?.axis || '-'}</td>
                    <td className="py-2 px-2">{p.leftEye?.vn || '6/'}</td>
                    <td className="py-2 px-2">{p.leftEye?.add || '-'}</td>
                    <td className="py-2 px-2">{p.leftEye?.pd || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {p.notes && <p className="text-[11px] text-slate-500 italic">Notes: {p.notes}</p>}
          </div>
        )}

        {/* Itemized Table */}
        <div className="table-responsive">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-bold uppercase tracking-wider">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Item / Description</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-2 text-center">Qty</th>
                <th className="py-2.5 px-3 text-right">Rate</th>
                <th className="py-2.5 px-3 text-right">Discount</th>
                <th className="py-2.5 px-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.items.map((item, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="py-3 px-3 text-slate-400 font-bold">{idx + 1}</td>
                  <td className="py-3 px-3">
                    <p className="font-bold text-slate-900">{item.name}</p>
                    {item.brand && <p className="text-[10px] text-slate-400">Brand: {item.brand}</p>}
                  </td>
                  <td className="py-3 px-3 text-slate-600">{item.categoryName || '-'}</td>
                  <td className="py-3 px-2 text-center font-bold text-slate-800">{item.quantity}</td>
                  <td className="py-3 px-3 text-right font-medium text-slate-700">₹{item.unitPrice.toFixed(2)}</td>
                  <td className="py-3 px-3 text-right text-slate-600">
                    {item.discountAmount > 0 ? `₹${item.discountAmount.toFixed(2)}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                    ₹{item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Payment Summary Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
          {/* Payment Split */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <p className="font-bold text-brand-600 uppercase tracking-wider mb-1">PAYMENT BREAKDOWN</p>
            <div className="flex justify-between text-slate-600">
              <span>Payment Mode:</span>
              <span className="font-semibold text-slate-900">{invoice.paymentMethod || 'Cash'}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Cash Amount:</span>
              <span className="font-semibold text-slate-900">₹{invoice.cashAmount?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Online / UPI / Card:</span>
              <span className="font-semibold text-slate-900">₹{invoice.onlineAmount?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold">
              <span>Balance Due:</span>
              <span className={invoice.dueAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                ₹{invoice.dueAmount?.toFixed(2) || '0.00'}
              </span>
            </div>
            {invoice.notes && (
              <p className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                Note: {invoice.notes}
              </p>
            )}
          </div>

          {/* Calculations Totals */}
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900">₹{invoice.subtotal.toFixed(2)}</span>
            </div>
            {invoice.totalDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Total Discount:</span>
                <span className="font-semibold">- ₹{invoice.totalDiscount.toFixed(2)}</span>
              </div>
            )}
            {invoice.tax > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>GST / Tax ({invoice.taxRate}%):</span>
                <span className="font-semibold text-slate-900">+ ₹{invoice.tax.toFixed(2)}</span>
              </div>
            )}
            <div className="p-3 rounded-xl bg-brand-600 text-white flex justify-between items-center text-sm font-black mt-2">
              <span>GRAND TOTAL:</span>
              <span className="text-lg">₹{invoice.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer & Signature */}
        <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs text-slate-500">
          <div className="max-w-md">
            <p className="font-bold text-slate-700 mb-1">Terms & Conditions:</p>
            <p className="text-[11px] leading-relaxed">
              {settings?.invoiceFooter ||
                'Goods once sold will be serviced with care. Please carry this invoice for warranty and complimentary adjustments.'}
            </p>
          </div>

          <div className="text-center sm:text-right shrink-0">
            <p className="font-bold text-slate-900">For {settings?.storeName || 'Drashti Optic'}</p>
            <div className="h-12" />
            <p className="text-[11px] border-t border-slate-300 pt-1 text-slate-400">Authorised Signatory</p>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? Sold stock will be returned to inventory and customer balances will be updated."
        confirmText="Yes, Delete Invoice"
        isDangerous
        loading={isDeleting}
      />
    </div>
  );
}
