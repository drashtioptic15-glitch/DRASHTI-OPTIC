'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Wallet,
  Receipt,
  UserPlus,
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Customer } from '@/types';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    alternateMobile: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    notes: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Delete State
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCustomers = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '10',
      });
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/customers?${params.toString()}`);
      if (res.data.success) {
        setCustomers(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err: any) {
      toast.error('Failed to load customers: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers(1);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers(1);
  };

  const handleOpenAddModal = () => {
    setEditingCustomerId(null);
    setFormData({
      name: '',
      mobile: '',
      alternateMobile: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cust: Customer) => {
    setEditingCustomerId(cust._id);
    setFormData({
      name: cust.name,
      mobile: cust.mobile,
      alternateMobile: cust.alternateMobile || '',
      email: cust.email || '',
      address: cust.address || '',
      city: cust.city || '',
      state: cust.state || '',
      pincode: cust.pincode || '',
      notes: cust.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.mobile.trim()) {
      toast.error('Customer name and mobile number are required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingCustomerId) {
        const res = await api.put(`/customers/${editingCustomerId}`, formData);
        if (res.data.success) {
          toast.success('Customer updated successfully');
          setIsModalOpen(false);
          fetchCustomers(pagination.page);
        }
      } else {
        const res = await api.post('/customers', formData);
        if (res.data.success) {
          toast.success('Customer registered successfully');
          setIsModalOpen(false);
          fetchCustomers(1);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save customer');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCustomerId) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/customers/${deleteCustomerId}`);
      if (res.data.success) {
        toast.success('Customer removed successfully');
        setDeleteCustomerId(null);
        fetchCustomers(pagination.page);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete customer');
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
            <Users className="w-6 h-6 text-brand-600" />
            <span>Customers Directory</span>
          </h2>
          <p className="text-xs text-slate-500">
            Manage customer optical profiles, eye prescription history, and purchase accounts.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="optic-btn-primary py-2.5 px-4 text-xs sm:text-sm font-bold shadow-md shadow-brand-600/30"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="optic-card p-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, mobile, customer ID, or email..."
              className="optic-input pr-10 pl-3.5 text-xs sm:text-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
          </div>
          <button type="submit" className="optic-btn-secondary text-xs font-semibold py-2 px-4">
            Search
          </button>
        </form>
      </div>

      {/* Customers List Table / Cards */}
      <div className="optic-card overflow-hidden">
        {loading ? (
          <div className="py-16">
            <LoadingSpinner text="Loading customers..." />
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No Customers Found"
            description="No customer records matching your search query. Add your first optical client."
            actionText="Register Customer"
            onAction={handleOpenAddModal}
          />
        ) : (
          <div className="table-responsive">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Customer ID</th>
                  <th className="py-3 px-4">Customer Details</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3 text-right">Total Purchases</th>
                  <th className="py-3 px-3 text-right">Paid</th>
                  <th className="py-3 px-3 text-right">Due Balance</th>
                  <th className="py-3 px-3">Last Visit</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((cust) => (
                  <tr key={cust._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                      <Link href={`/customers/${cust._id}`} className="hover:text-brand-600 hover:underline">
                        {cust.customerId}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4">
                      <Link href={`/customers/${cust._id}`} className="font-bold text-slate-900 hover:text-brand-600">
                        {cust.name}
                      </Link>
                      <p className="text-[10px] text-slate-500 font-mono">📱 {cust.mobile}</p>
                    </td>
                    <td className="py-3.5 px-3 text-slate-600">
                      {cust.city ? `${cust.city}${cust.state ? `, ${cust.state}` : ''}` : '-'}
                    </td>
                    <td className="py-3.5 px-3 text-right font-extrabold text-slate-900 whitespace-nowrap">
                      {formatCurrency(cust.totalPurchases)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-semibold text-emerald-600 whitespace-nowrap">
                      {formatCurrency(cust.totalPaid)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-bold whitespace-nowrap">
                      <span className={cust.totalDue > 0 ? 'text-rose-600' : 'text-slate-400'}>
                        {formatCurrency(cust.totalDue)}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                      {cust.lastPurchaseDate ? formatDate(cust.lastPurchaseDate) : 'New'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/customers/${cust._id}`}
                          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="View Customer Profile & Prescriptions"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(cust)}
                          className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit Customer Details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteCustomerId(cust._id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Customer"
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
              Showing {customers.length} of {pagination.total} registered customers
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => fetchCustomers(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="optic-btn-secondary py-1 px-3 text-xs"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => fetchCustomers(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="optic-btn-secondary py-1 px-3 text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCustomerId ? 'Edit Customer Information' : 'Register New Customer'}
        subtitle="Customer details will be used for invoices and WhatsApp delivery."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveCustomer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Amit Verma"
                className="optic-input"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mobile Number (WhatsApp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="e.g. 9876543210"
                className="optic-input font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Alternate Phone</label>
              <input
                type="tel"
                value={formData.alternateMobile}
                onChange={(e) => setFormData({ ...formData, alternateMobile: e.target.value })}
                placeholder="Optional"
                className="optic-input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Optional"
                className="optic-input"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Street address / Landmark"
                className="optic-input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">City</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Ahmedabad"
                className="optic-input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">State & Pincode</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="Gujarat"
                  className="optic-input flex-1"
                />
                <input
                  type="text"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                  placeholder="380001"
                  className="optic-input w-24"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Notes / Preferences</label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g. Prefers progressive lenses, rimless frames"
                className="optic-input resize-none text-xs"
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
              {isSaving ? 'Saving...' : editingCustomerId ? 'Update Customer' : 'Save Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteCustomerId)}
        onClose={() => setDeleteCustomerId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Customer Profile"
        message="Are you sure you want to delete this customer? Customers with existing invoices cannot be deleted to preserve financial audit history."
        confirmText="Yes, Delete Customer"
        isDangerous
        loading={isDeleting}
      />
    </div>
  );
}
