'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Eye,
  Plus,
  Search,
  Edit2,
  Trash2,
  Calendar,
  User,
  Phone,
  Receipt,
  FileText,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Prescription, Customer } from '@/types';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import PrescriptionPowerInput from '@/components/ui/PrescriptionPowerInput';
import { toast } from 'sonner';

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  const [search, setSearch] = useState('');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrescriptionId, setEditingPrescriptionId] = useState<string | null>(null);

  // Customer search inside modal
  const [modalCustomerQuery, setModalCustomerQuery] = useState('');
  const [modalCustomerResults, setModalCustomerResults] = useState<Customer[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    mobile: '',
  });

  const [formData, setFormData] = useState({
    rightEye: { sph: '', cyl: '', axis: '', add: '', pd: '' },
    leftEye: { sph: '', cyl: '', axis: '', add: '', pd: '' },
    doctor: '',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Delete State
  const [deletePrescriptionId, setDeletePrescriptionId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPrescriptions = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '12',
      });
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/prescriptions?${params.toString()}`);
      if (res.data.success) {
        setPrescriptions(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err: any) {
      toast.error('Failed to load prescriptions: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions(1);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPrescriptions(1);
  };

  // Customer Search in modal
  const handleModalCustomerSearch = (query: string) => {
    setModalCustomerQuery(query);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (!query.trim()) {
      setModalCustomerResults([]);
      return;
    }

    setIsSearchingCustomer(true);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get(`/customers/search?query=${encodeURIComponent(query.trim())}`);
        if (res.data.success) {
          setModalCustomerResults(res.data.data);
        }
      } catch (err) {
        console.error('Customer search error', err);
      } finally {
        setIsSearchingCustomer(false);
      }
    }, 250);
  };

  const handleSelectModalCustomer = (cust: Customer) => {
    setSelectedCustomerId(cust._id);
    setNewCustomerData({
      name: cust.name,
      mobile: cust.mobile,
    });
    setModalCustomerResults([]);
    setModalCustomerQuery(`${cust.name} (${cust.mobile})`);
  };

  const handleOpenAddModal = () => {
    setEditingPrescriptionId(null);
    setSelectedCustomerId('');
    setModalCustomerQuery('');
    setModalCustomerResults([]);
    setNewCustomerData({ name: '', mobile: '' });
    setFormData({
      rightEye: { sph: '', cyl: '', axis: '', add: '', pd: '' },
      leftEye: { sph: '', cyl: '', axis: '', add: '', pd: '' },
      doctor: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Prescription) => {
    setEditingPrescriptionId(p._id);
    const cust = typeof p.customer === 'object' ? p.customer : null;
    setSelectedCustomerId(cust?._id || '');
    setNewCustomerData({
      name: cust?.name || '',
      mobile: cust?.mobile || '',
    });
    setModalCustomerQuery(cust ? `${cust.name} (${cust.mobile})` : '');
    setFormData({
      rightEye: {
        sph: p.rightEye?.sph || '',
        cyl: p.rightEye?.cyl || '',
        axis: p.rightEye?.axis || '',
        add: p.rightEye?.add || '',
        pd: p.rightEye?.pd || '',
      },
      leftEye: {
        sph: p.leftEye?.sph || '',
        cyl: p.leftEye?.cyl || '',
        axis: p.leftEye?.axis || '',
        add: p.leftEye?.add || '',
        pd: p.leftEye?.pd || '',
      },
      doctor: p.doctor || '',
      notes: p.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSavePrescription = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingPrescriptionId && !selectedCustomerId && (!newCustomerData.name.trim() || !newCustomerData.mobile.trim())) {
      toast.error('Please select an existing customer or enter customer Name & Mobile');
      return;
    }

    setIsSaving(true);
    try {
      if (editingPrescriptionId) {
        const res = await api.put(`/prescriptions/${editingPrescriptionId}`, formData);
        if (res.data.success) {
          toast.success('Prescription updated successfully');
          setIsModalOpen(false);
          fetchPrescriptions(pagination.page);
        }
      } else {
        const payload = {
          customerId: selectedCustomerId || undefined,
          customerData: !selectedCustomerId ? newCustomerData : undefined,
          ...formData,
        };

        const res = await api.post('/prescriptions', payload);
        if (res.data.success) {
          toast.success('Prescription recorded and saved to customer profile!');
          setIsModalOpen(false);
          fetchPrescriptions(1);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save prescription');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletePrescriptionId) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/prescriptions/${deletePrescriptionId}`);
      if (res.data.success) {
        toast.success('Prescription record deleted');
        setDeletePrescriptionId(null);
        fetchPrescriptions(pagination.page);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete prescription');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Eye className="w-6 h-6 text-brand-600" />
            <span>Optical Prescriptions Directory</span>
          </h2>
          <p className="text-xs text-slate-500">
            Recorded eye test parameters (OD/OS), optometrist details, and customer ophthalmic records.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="optic-btn-primary py-2.5 px-4 text-xs sm:text-sm font-bold shadow-md shadow-brand-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Prescription</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="optic-card p-4">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, mobile, customer ID, or doctor..."
              className="optic-input pr-10 pl-3.5 text-xs sm:text-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
          </div>
          <button type="submit" className="optic-btn-secondary text-xs font-semibold py-2 px-4">
            Search
          </button>
        </form>
      </div>

      {/* Prescriptions Grid */}
      {loading ? (
        <div className="py-16">
          <LoadingSpinner text="Fetching optical prescription records..." />
        </div>
      ) : prescriptions.length === 0 ? (
        <EmptyState
          icon={Eye}
          title="No Prescriptions Found"
          description="Record optical prescriptions for your customers with OD (Right Eye) and OS (Left Eye) parameters."
          actionText="Record Prescription"
          onAction={handleOpenAddModal}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {prescriptions.map((p) => {
            const cust = typeof p.customer === 'object' ? p.customer : null;

            return (
              <div
                key={p._id}
                className="optic-card p-4 sm:p-5 flex flex-col justify-between space-y-3 sm:space-y-4 border-slate-200/80 hover:border-brand-300 transition-all shadow-sm hover:shadow-md"
              >
                <div className="space-y-3">
                  {/* Customer Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="min-w-0">
                      {cust ? (
                        <Link
                          href={`/customers/${cust._id}`}
                          className="font-black text-slate-900 text-sm hover:text-brand-600 flex items-center gap-1 truncate"
                        >
                          <span>{cust.name}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </Link>
                      ) : (
                        <p className="font-bold text-slate-800 text-sm">Walk-in Customer</p>
                      )}
                      <p className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-brand-600" />
                        <span>{cust?.mobile || 'N/A'}</span>
                      </p>
                    </div>

                    <span className="text-[10px] text-slate-400 font-semibold shrink-0 bg-slate-100 px-2 py-0.5 rounded-full">
                      {formatDate(p.prescriptionDate || p.createdAt)}
                    </span>
                  </div>

                  {/* OD / OS Optical Matrix */}
                  <div className="table-responsive bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/60">
                    <table className="w-full text-center text-[11px]">
                      <thead>
                        <tr className="font-bold text-slate-600 border-b border-slate-200/60">
                          <th className="pb-1 text-left">EYE</th>
                          <th className="pb-1">SPH</th>
                          <th className="pb-1">CYL</th>
                          <th className="pb-1">AXIS</th>
                          <th className="pb-1">ADD</th>
                          <th className="pb-1">PD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/40 font-mono">
                        <tr>
                          <td className="py-1 text-left font-bold text-brand-600">R (OD)</td>
                          <td>{p.rightEye?.sph || '-'}</td>
                          <td>{p.rightEye?.cyl || '-'}</td>
                          <td>{p.rightEye?.axis || '-'}</td>
                          <td>{p.rightEye?.add || '-'}</td>
                          <td>{p.rightEye?.pd || '-'}</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-left font-bold text-brand-600">L (OS)</td>
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
                    <p className="text-xs text-slate-600 font-medium">
                      <strong>Doctor:</strong> {p.doctor}
                    </p>
                  )}
                  {p.notes && (
                    <p className="text-xs text-slate-500 italic bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                      &ldquo;{p.notes}&rdquo;
                    </p>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  {cust ? (
                    <Link
                      href={`/customers/${cust._id}`}
                      className="text-xs font-bold text-brand-600 hover:text-brand-700 flex items-center gap-1"
                    >
                      <span>View in Customer</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-400">Direct Prescription</span>
                  )}

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(p)}
                      className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Edit Prescription"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletePrescriptionId(p._id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Prescription"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {prescriptions.length} of {pagination.total} prescription records
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => fetchPrescriptions(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="optic-btn-secondary py-1 px-3 text-xs"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => fetchPrescriptions(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="optic-btn-secondary py-1 px-3 text-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Prescription Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingPrescriptionId ? 'Edit Optical Eye Prescription' : 'Record New Eye Prescription'}
        subtitle="Saved prescriptions are linked to the customer and accessible during billing."
        maxWidth="lg"
      >
        <form onSubmit={handleSavePrescription} className="space-y-4">
          {/* Customer Selection Section */}
          {!editingPrescriptionId && (
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Customer Information <span className="text-rose-500">*</span>
              </label>

              {/* Customer Autocomplete Search */}
              <div className="relative">
                <input
                  type="text"
                  value={modalCustomerQuery}
                  onChange={(e) => handleModalCustomerSearch(e.target.value)}
                  placeholder="Search existing customer by Name or Mobile..."
                  className="optic-input pr-9 pl-3 text-xs"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />

                {modalCustomerResults.length > 0 && (
                  <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                    {modalCustomerResults.map((c) => (
                      <div
                        key={c._id}
                        onClick={() => handleSelectModalCustomer(c)}
                        className="p-2.5 hover:bg-rose-50 cursor-pointer text-xs flex items-center justify-between"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{c.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">📱 {c.mobile}</p>
                        </div>
                        <Badge variant="brand" size="sm">
                          {c.customerId}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Or Direct Input for New Customer */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Customer Name</label>
                  <input
                    type="text"
                    required
                    value={newCustomerData.name}
                    onChange={(e) => {
                      setSelectedCustomerId('');
                      setNewCustomerData({ ...newCustomerData, name: e.target.value });
                    }}
                    placeholder="e.g. Ramesh Patel"
                    className="optic-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={newCustomerData.mobile}
                    onChange={(e) => {
                      setSelectedCustomerId('');
                      setNewCustomerData({ ...newCustomerData, mobile: e.target.value });
                    }}
                    placeholder="e.g. 9876543210"
                    className="optic-input text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Right Eye (OD) */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-xs font-bold text-brand-600 mb-2 flex items-center gap-1.5">
              <Eye className="w-4 h-4" /> RIGHT EYE (O.D.)
            </p>
            <div className="grid grid-cols-5 gap-2">
              <PrescriptionPowerInput
                label="SPH"
                type="sph"
                value={formData.rightEye.sph}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    rightEye: { ...formData.rightEye, sph: val },
                  })
                }
                placeholder="-1.50"
              />
              <PrescriptionPowerInput
                label="CYL"
                type="cyl"
                value={formData.rightEye.cyl}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    rightEye: { ...formData.rightEye, cyl: val },
                  })
                }
                placeholder="-0.50"
              />
              <PrescriptionPowerInput
                label="AXIS"
                type="axis"
                value={formData.rightEye.axis}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    rightEye: { ...formData.rightEye, axis: val },
                  })
                }
                placeholder="90"
              />
              <PrescriptionPowerInput
                label="ADD"
                type="add"
                value={formData.rightEye.add}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    rightEye: { ...formData.rightEye, add: val },
                  })
                }
                placeholder="+1.25"
              />
              <PrescriptionPowerInput
                label="PD"
                type="pd"
                value={formData.rightEye.pd}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    rightEye: { ...formData.rightEye, pd: val },
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
                value={formData.leftEye.sph}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    leftEye: { ...formData.leftEye, sph: val },
                  })
                }
                placeholder="-1.75"
              />
              <PrescriptionPowerInput
                label="CYL"
                type="cyl"
                value={formData.leftEye.cyl}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    leftEye: { ...formData.leftEye, cyl: val },
                  })
                }
                placeholder="-0.75"
              />
              <PrescriptionPowerInput
                label="AXIS"
                type="axis"
                value={formData.leftEye.axis}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    leftEye: { ...formData.leftEye, axis: val },
                  })
                }
                placeholder="85"
              />
              <PrescriptionPowerInput
                label="ADD"
                type="add"
                value={formData.leftEye.add}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    leftEye: { ...formData.leftEye, add: val },
                  })
                }
                placeholder="+1.25"
              />
              <PrescriptionPowerInput
                label="PD"
                type="pd"
                value={formData.leftEye.pd}
                onChange={(val) =>
                  setFormData({
                    ...formData,
                    leftEye: { ...formData.leftEye, pd: val },
                  })
                }
                placeholder="31"
              />
            </div>
          </div>

          {/* Doctor & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Doctor / Optometrist</label>
              <input
                type="text"
                value={formData.doctor}
                onChange={(e) => setFormData({ ...formData, doctor: e.target.value })}
                placeholder="e.g. Dr. A. K. Shah"
                className="optic-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Prescription Notes</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g. Blue cut filter recommended"
                className="optic-input"
              />
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
              className="optic-btn-secondary py-2.5 px-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="optic-btn-primary py-2.5 px-5 font-bold shadow-md shadow-brand-600/30"
            >
              {isSaving ? 'Saving...' : editingPrescriptionId ? 'Update Prescription' : 'Save Prescription'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deletePrescriptionId)}
        onClose={() => setDeletePrescriptionId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Prescription Record"
        message="Are you sure you want to remove this optical eye prescription record?"
        confirmText="Yes, Delete Record"
        isDangerous
        loading={isDeleting}
      />
    </div>
  );
}
