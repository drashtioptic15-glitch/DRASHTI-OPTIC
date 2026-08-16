'use client';

import React, { useState, useEffect } from 'react';
import { PhoneCall, Plus, Search, Edit2, Trash2, Phone, User, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { PhoneNumber } from '@/types';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';

export default function NumbersPage() {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNumberId, setEditingNumberId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    number: '',
    label: '',
    type: 'Customer' as 'Customer' | 'Supplier' | 'Doctor' | 'Other',
    status: 'active' as 'active' | 'inactive',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Delete State
  const [deleteNumberId, setDeleteNumberId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchNumbers = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
        type: selectedType,
      });
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/numbers?${params.toString()}`);
      if (res.data.success) {
        setNumbers(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err: any) {
      toast.error('Failed to load phone numbers: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNumbers(1);
  }, [selectedType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNumbers(1);
  };

  const handleOpenAddModal = () => {
    setEditingNumberId(null);
    setFormData({
      number: '',
      label: '',
      type: 'Customer',
      status: 'active',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rec: PhoneNumber) => {
    setEditingNumberId(rec._id);
    setFormData({
      number: rec.number,
      label: rec.label,
      type: rec.type || 'Customer',
      status: rec.status || 'active',
      notes: rec.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.number.trim() || !formData.label.trim()) {
      toast.error('Phone number and Label / Name are required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingNumberId) {
        const res = await api.put(`/numbers/${editingNumberId}`, formData);
        if (res.data.success) {
          toast.success('Phone record updated successfully');
          setIsModalOpen(false);
          fetchNumbers(pagination.page);
        }
      } else {
        const res = await api.post('/numbers', formData);
        if (res.data.success) {
          toast.success('Phone number added to directory');
          setIsModalOpen(false);
          fetchNumbers(1);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save phone number');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteNumberId) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/numbers/${deleteNumberId}`);
      if (res.data.success) {
        toast.success('Contact removed from directory');
        setDeleteNumberId(null);
        fetchNumbers(pagination.page);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete contact');
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
            <PhoneCall className="w-6 h-6 text-brand-600" />
            <span>Phone Directory & Contacts</span>
          </h2>
          <p className="text-xs text-slate-500">
            Manage phone numbers for suppliers, optical labs, doctors, optometrists, and VIP clients.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="optic-btn-primary py-2.5 px-4 text-xs sm:text-sm font-bold shadow-md shadow-brand-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Contact</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="optic-card p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by phone number, label, or notes..."
              className="optic-input pr-10 pl-3.5 text-xs sm:text-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
          </div>
          <button type="submit" className="optic-btn-secondary text-xs font-semibold py-2 px-4">
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase">Contact Type:</span>
          {['all', 'Supplier', 'Doctor', 'Customer', 'Other'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedType(t)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedType === t
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t === 'all' ? 'All Contacts' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Table */}
      <div className="optic-card overflow-hidden">
        {loading ? (
          <div className="py-16">
            <LoadingSpinner text="Loading phone directory..." />
          </div>
        ) : numbers.length === 0 ? (
          <EmptyState
            icon={PhoneCall}
            title="No Contacts Found"
            description="Add phone records for quick reference and communication."
            actionText="Add Contact"
            onAction={handleOpenAddModal}
          />
        ) : (
          <div className="table-responsive">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Name / Label</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4">Notes</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {numbers.map((rec) => (
                  <tr key={rec._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{rec.label}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-brand-600 whitespace-nowrap">
                      📱 {rec.number}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <Badge
                        variant={
                          rec.type === 'Doctor'
                            ? 'brand'
                            : rec.type === 'Supplier'
                            ? 'info'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {rec.type}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <Badge variant={rec.status === 'active' ? 'success' : 'neutral'} size="sm">
                        {rec.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">{rec.notes || '-'}</td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`tel:${rec.number}`}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Call"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(rec)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Contact"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteNumberId(rec._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Contact"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {numbers.length} of {pagination.total} contacts
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => fetchNumbers(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="optic-btn-secondary py-1 px-3 text-xs"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => fetchNumbers(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="optic-btn-secondary py-1 px-3 text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Contact Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingNumberId ? 'Edit Directory Contact' : 'Add Contact to Directory'}
        subtitle="Manage phone numbers for quick communication."
        maxWidth="md"
      >
        <form onSubmit={handleSaveNumber} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Contact Name / Label <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              placeholder="e.g. Dr. A. K. Shah / Essilor Delivery"
              className="optic-input"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              placeholder="e.g. 9876543210"
              className="optic-input font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Category Type</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as any })
                }
                className="optic-select"
              >
                <option value="Customer">Customer</option>
                <option value="Supplier">Supplier / Distributor</option>
                <option value="Doctor">Doctor / Optometrist</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as any })
                }
                className="optic-select"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Notes / Description</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Lens fitting agent contact, delivery timings..."
              className="optic-input resize-none text-xs"
            />
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
              {isSaving ? 'Saving...' : editingNumberId ? 'Update Contact' : 'Save Contact'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteNumberId)}
        onClose={() => setDeleteNumberId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Contact"
        message="Are you sure you want to remove this phone number from the directory?"
        confirmText="Yes, Delete"
        isDangerous
        loading={isDeleting}
      />
    </div>
  );
}
