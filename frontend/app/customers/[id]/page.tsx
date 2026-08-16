'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Users,
  Eye,
  Plus,
  Receipt,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Wallet,
  Clock,
  Trash2,
  Edit2,
  FileText,
  Sparkles,
  Download,
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Customer, Prescription, Invoice } from '@/types';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import PrescriptionPowerInput from '@/components/ui/PrescriptionPowerInput';
import { toast } from 'sonner';

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const customerId = resolvedParams.id;
  const router = useRouter();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  // Prescription Modal State
  const [isPrescriptionModalOpen, setIsPrescriptionModalOpen] = useState(false);
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<string | null>(null);
  const [prescriptionForm, setPrescriptionForm] = useState({
    rightEye: { sph: '', cyl: '', axis: '', add: '', pd: '' },
    leftEye: { sph: '', cyl: '', axis: '', add: '', pd: '' },
    doctor: '',
    notes: '',
  });
  const [isSavingPrescription, setIsSavingPrescription] = useState(false);

  // Prescription Delete State
  const [deletePrescriptionId, setDeletePrescriptionId] = useState<string | null>(null);
  const [isDeletingPrescription, setIsDeletingPrescription] = useState(false);

  const fetchCustomerDetails = async () => {
    try {
      const res = await api.get(`/customers/${customerId}`);
      if (res.data.success) {
        setCustomer(res.data.data);
      }
    } catch (err: any) {
      toast.error('Failed to load customer profile: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerDetails();
  }, [customerId]);

  const handleOpenAddPrescription = () => {
    setEditingPrescriptionId(null);
    setPrescriptionForm({
      rightEye: { sph: '', cyl: '', axis: '', add: '', pd: '' },
      leftEye: { sph: '', cyl: '', axis: '', add: '', pd: '' },
      doctor: '',
      notes: '',
    });
    setIsPrescriptionModalOpen(true);
  };

  const handleOpenEditPrescription = (p: Prescription) => {
    setEditingPrescriptionId(p._id);
    setPrescriptionForm({
      rightEye: { ...p.rightEye },
      leftEye: { ...p.leftEye },
      doctor: p.doctor || '',
      notes: p.notes || '',
    });
    setIsPrescriptionModalOpen(true);
  };

  const handleSavePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrescription(true);
    try {
      if (editingPrescriptionId) {
        const res = await api.put(
          `/customers/${customerId}/prescriptions/${editingPrescriptionId}`,
          prescriptionForm
        );
        if (res.data.success) {
          toast.success('Prescription updated successfully');
          setIsPrescriptionModalOpen(false);
          fetchCustomerDetails();
        }
      } else {
        const res = await api.post(`/customers/${customerId}/prescriptions`, prescriptionForm);
        if (res.data.success) {
          toast.success('Prescription recorded successfully');
          setIsPrescriptionModalOpen(false);
          fetchCustomerDetails();
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save prescription');
    } finally {
      setIsSavingPrescription(false);
    }
  };

  const handleDeletePrescriptionConfirm = async () => {
    if (!deletePrescriptionId) return;
    setIsDeletingPrescription(true);
    try {
      const res = await api.delete(
        `/customers/${customerId}/prescriptions/${deletePrescriptionId}`
      );
      if (res.data.success) {
        toast.success('Prescription deleted successfully');
        setDeletePrescriptionId(null);
        fetchCustomerDetails();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete prescription');
    } finally {
      setIsDeletingPrescription(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage text="Loading customer records..." />;
  }

  if (!customer) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 mb-4">Customer not found</p>
        <Link href="/customers" className="optic-btn-primary">
          Back to Customers
        </Link>
      </div>
    );
  }

  const invoices = customer.invoices || [];
  const prescriptions = customer.prescriptions || [];

  return (
    <div className="space-y-6 pb-24 max-w-6xl mx-auto">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </Link>

        <Link
          href="/sales/add"
          className="optic-btn-primary py-2 px-3.5 text-xs font-semibold"
        >
          <Receipt className="w-4 h-4" />
          <span>Bill this Customer</span>
        </Link>
      </div>

      {/* Customer Header Card */}
      <div className="optic-card p-6 bg-gradient-to-br from-white via-slate-50/50 to-rose-50/20 border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center font-black text-xl shadow-lg shadow-brand-600/30 shrink-0">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">{customer.name}</h2>
                <Badge variant="brand" size="sm">
                  {customer.customerId}
                </Badge>
              </div>
              <p className="text-xs text-slate-600 font-mono mt-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-brand-600" /> {customer.mobile}
                {customer.alternateMobile && <span className="text-slate-400"> (Alt: {customer.alternateMobile})</span>}
              </p>
              {customer.email && (
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {customer.email}
                </p>
              )}
              {customer.address && (
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {customer.address}
                  {customer.city ? `, ${customer.city}` : ''} {customer.state ? `, ${customer.state}` : ''} - {customer.pincode}
                </p>
              )}
            </div>
          </div>

          {/* Financials Pill */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-sm shrink-0 text-center">
            <div className="px-2">
              <p className="text-[10px] font-bold uppercase text-slate-500">Purchases</p>
              <p className="text-sm font-extrabold text-slate-900">{formatCurrency(customer.totalPurchases)}</p>
            </div>
            <div className="px-2 border-x border-slate-100">
              <p className="text-[10px] font-bold uppercase text-slate-500">Paid</p>
              <p className="text-sm font-extrabold text-emerald-600">{formatCurrency(customer.totalPaid)}</p>
            </div>
            <div className="px-2">
              <p className="text-[10px] font-bold uppercase text-slate-500">Due</p>
              <p className={`text-sm font-extrabold ${customer.totalDue > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                {formatCurrency(customer.totalDue)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Left Column (Prescriptions), Right Column (Invoice History) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Optical Prescriptions Section (5 Cols on Desktop) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-5 h-5 text-brand-600" />
              <span>Prescription Records</span>
            </h3>
            <button
              type="button"
              onClick={handleOpenAddPrescription}
              className="optic-btn-primary py-1.5 px-3 text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Rx</span>
            </button>
          </div>

          {prescriptions.length === 0 ? (
            <div className="optic-card p-6 text-center text-xs text-slate-500">
              No optical prescriptions recorded yet. Click &ldquo;Add Rx&rdquo; to add eye measurements.
            </div>
          ) : (
            <div className="space-y-4">
              {prescriptions.map((p, idx) => (
                <div key={p._id} className="optic-card p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-xs font-bold text-slate-900">Prescription #{idx + 1}</span>
                      <p className="text-[11px] text-slate-400">{formatDate(p.prescriptionDate)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditPrescription(p)}
                        className="p-1 text-slate-400 hover:text-slate-800 rounded"
                        title="Edit Prescription"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletePrescriptionId(p._id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Delete Prescription"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Prescription Matrix */}
                  <div className="table-responsive">
                    <table className="w-full text-center text-[11px]">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-slate-700">
                          <th className="py-1 px-1.5 text-left">EYE</th>
                          <th className="py-1 px-1">SPH</th>
                          <th className="py-1 px-1">CYL</th>
                          <th className="py-1 px-1">AXIS</th>
                          <th className="py-1 px-1">ADD</th>
                          <th className="py-1 px-1">PD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        <tr>
                          <td className="py-1.5 px-1.5 text-left font-bold text-brand-600">R (OD)</td>
                          <td>{p.rightEye?.sph || '-'}</td>
                          <td>{p.rightEye?.cyl || '-'}</td>
                          <td>{p.rightEye?.axis || '-'}</td>
                          <td>{p.rightEye?.add || '-'}</td>
                          <td>{p.rightEye?.pd || '-'}</td>
                        </tr>
                        <tr>
                          <td className="py-1.5 px-1.5 text-left font-bold text-brand-600">L (OS)</td>
                          <td>{p.leftEye?.sph || '-'}</td>
                          <td>{p.leftEye?.cyl || '-'}</td>
                          <td>{p.leftEye?.axis || '-'}</td>
                          <td>{p.leftEye?.add || '-'}</td>
                          <td>{p.leftEye?.pd || '-'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {p.doctor && (
                    <p className="text-[11px] text-slate-600">
                      <strong>Doctor:</strong> {p.doctor}
                    </p>
                  )}
                  {p.notes && (
                    <p className="text-[11px] text-slate-500 italic">
                      <strong>Notes:</strong> {p.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Purchase Invoices History (7 Cols on Desktop) */}
        <div className="lg:col-span-7 space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-brand-600" />
            <span>Purchase History ({invoices.length})</span>
          </h3>

          {invoices.length === 0 ? (
            <div className="optic-card p-6 text-center text-xs text-slate-500">
              No previous invoices on record for this customer.
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <div
                  key={inv._id}
                  className="optic-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/sales/${inv._id}`}
                        className="font-mono font-bold text-slate-900 text-xs hover:text-brand-600 hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
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
                    </div>
                    <p className="text-[11px] text-slate-400">
                      {formatDate(inv.invoiceDate || inv.createdAt)} • {inv.items?.length || 0} product(s)
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0">
                    <div className="text-right">
                      <p className="text-xs font-extrabold text-slate-900">{formatCurrency(inv.grandTotal)}</p>
                      {inv.dueAmount > 0 ? (
                        <p className="text-[10px] text-rose-600 font-semibold">Due: {formatCurrency(inv.dueAmount)}</p>
                      ) : (
                        <p className="text-[10px] text-emerald-600 font-semibold">Fully Paid</p>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/sales/${inv._id}`}
                        className="optic-btn-secondary py-1 px-2.5 text-xs font-semibold"
                      >
                        View
                      </Link>
                      <a
                        href={`/api/invoices/${inv._id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100"
                        title="Download PDF"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Prescription Modal */}
      <Modal
        isOpen={isPrescriptionModalOpen}
        onClose={() => setIsPrescriptionModalOpen(false)}
        title={editingPrescriptionId ? 'Edit Eye Prescription' : 'Record Eye Prescription'}
        subtitle="Specify OD (Right Eye) and OS (Left Eye) ophthalmic parameters."
        maxWidth="lg"
      >
        <form onSubmit={handleSavePrescription} className="space-y-4">
          {/* Right Eye (OD) */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-xs font-bold text-brand-600 mb-2 flex items-center gap-1.5">
              <Eye className="w-4 h-4" /> RIGHT EYE (O.D.)
            </p>
            <div className="grid grid-cols-5 gap-2">
              <PrescriptionPowerInput
                label="SPH"
                type="sph"
                value={prescriptionForm.rightEye.sph}
                onChange={(val) =>
                  setPrescriptionForm({
                    ...prescriptionForm,
                    rightEye: { ...prescriptionForm.rightEye, sph: val },
                  })
                }
                placeholder="-1.50"
              />
              <PrescriptionPowerInput
                label="CYL"
                type="cyl"
                value={prescriptionForm.rightEye.cyl}
                onChange={(val) =>
                  setPrescriptionForm({
                    ...prescriptionForm,
                    rightEye: { ...prescriptionForm.rightEye, cyl: val },
                  })
                }
                placeholder="-0.50"
              />
              <PrescriptionPowerInput
                label="AXIS"
                type="axis"
                value={prescriptionForm.rightEye.axis}
                onChange={(val) =>
                  setPrescriptionForm({
                    ...prescriptionForm,
                    rightEye: { ...prescriptionForm.rightEye, axis: val },
                  })
                }
                placeholder="90"
              />
              <PrescriptionPowerInput
                label="ADD"
                type="add"
                value={prescriptionForm.rightEye.add}
                onChange={(val) =>
                  setPrescriptionForm({
                    ...prescriptionForm,
                    rightEye: { ...prescriptionForm.rightEye, add: val },
                  })
                }
                placeholder="+1.25"
              />
              <PrescriptionPowerInput
                label="PD"
                type="pd"
                value={prescriptionForm.rightEye.pd}
                onChange={(val) =>
                  setPrescriptionForm({
                    ...prescriptionForm,
                    rightEye: { ...prescriptionForm.rightEye, pd: val },
                  })
                }
                placeholder="31"
              />
            </div>
          </div>

          {/* Left Eye (OS) */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-xs font-bold text-brand-600 mb-2 flex items-center gap-1.5">
              <Eye className="w-4 h-4" /> LEFT EYE (O.S.)
            </p>
            <div className="grid grid-cols-5 gap-2">
              <PrescriptionPowerInput
                label="SPH"
                type="sph"
                value={prescriptionForm.leftEye.sph}
                onChange={(val) =>
                  setPrescriptionForm({
                    ...prescriptionForm,
                    leftEye: { ...prescriptionForm.leftEye, sph: val },
                  })
                }
                placeholder="-1.75"
              />
              <PrescriptionPowerInput
                label="CYL"
                type="cyl"
                value={prescriptionForm.leftEye.cyl}
                onChange={(val) =>
                  setPrescriptionForm({
                    ...prescriptionForm,
                    leftEye: { ...prescriptionForm.leftEye, cyl: val },
                  })
                }
                placeholder="-0.75"
              />
              <PrescriptionPowerInput
                label="AXIS"
                type="axis"
                value={prescriptionForm.leftEye.axis}
                onChange={(val) =>
                  setPrescriptionForm({
                    ...prescriptionForm,
                    leftEye: { ...prescriptionForm.leftEye, axis: val },
                  })
                }
                placeholder="85"
              />
              <PrescriptionPowerInput
                label="ADD"
                type="add"
                value={prescriptionForm.leftEye.add}
                onChange={(val) =>
                  setPrescriptionForm({
                    ...prescriptionForm,
                    leftEye: { ...prescriptionForm.leftEye, add: val },
                  })
                }
                placeholder="+1.25"
              />
              <PrescriptionPowerInput
                label="PD"
                type="pd"
                value={prescriptionForm.leftEye.pd}
                onChange={(val) =>
                  setPrescriptionForm({
                    ...prescriptionForm,
                    leftEye: { ...prescriptionForm.leftEye, pd: val },
                  })
                }
                placeholder="31"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Doctor / Optometrist</label>
              <input
                type="text"
                value={prescriptionForm.doctor}
                onChange={(e) =>
                  setPrescriptionForm({ ...prescriptionForm, doctor: e.target.value })
                }
                placeholder="e.g. Dr. A. K. Shah"
                className="optic-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Prescription Notes</label>
              <input
                type="text"
                value={prescriptionForm.notes}
                onChange={(e) =>
                  setPrescriptionForm({ ...prescriptionForm, notes: e.target.value })
                }
                placeholder="e.g. Blue cut lenses advised"
                className="optic-input"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPrescriptionModalOpen(false)}
              disabled={isSavingPrescription}
              className="optic-btn-secondary py-2.5 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSavingPrescription}
              className="optic-btn-primary py-2.5 px-5 font-bold shadow-md shadow-brand-600/30"
            >
              {isSavingPrescription ? 'Saving...' : 'Save Prescription'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Prescription Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletePrescriptionId)}
        onClose={() => setDeletePrescriptionId(null)}
        onConfirm={handleDeletePrescriptionConfirm}
        title="Delete Prescription Record"
        message="Are you sure you want to delete this optical prescription entry?"
        confirmText="Yes, Delete Rx"
        isDangerous
        loading={isDeletingPrescription}
      />
    </div>
  );
}
