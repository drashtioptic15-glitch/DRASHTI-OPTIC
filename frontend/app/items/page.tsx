'use client';

import React, { useState, useEffect } from 'react';
import {
  Glasses,
  Plus,
  Search,
  Edit2,
  Trash2,
  Layers,
  Package,
  Tag,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import api from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Item, Category } from '@/types';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [status, setStatus] = useState('all');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    sku: '',
    brand: '',
    description: '',
    purchasePrice: 0,
    sellingPrice: 0,
    status: 'active' as 'active' | 'inactive',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Delete State
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchInitialData = async () => {
    try {
      const catRes = await api.get('/categories');
      if (catRes.data.success) {
        setCategories(catRes.data.data);
      }
    } catch (e) {
      console.error('Failed to load categories', e);
    }
  };

  const fetchItems = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '12',
        category: selectedCategory,
        status,
      });
      if (search.trim()) params.append('search', search.trim());

      const res = await api.get(`/items?${params.toString()}`);
      if (res.data.success) {
        setItems(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err: any) {
      toast.error('Failed to load items: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchItems(1);
  }, [selectedCategory, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchItems(1);
  };

  const handleOpenAddModal = () => {
    setEditingItemId(null);
    setFormData({
      name: '',
      category: categories[0]?._id || '',
      sku: '',
      brand: '',
      description: '',
      purchasePrice: 0,
      sellingPrice: 0,
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: Item) => {
    setEditingItemId(item._id);
    const catId = typeof item.category === 'object' ? item.category._id : item.category;
    setFormData({
      name: item.name,
      category: catId,
      sku: item.sku || '',
      brand: item.brand || '',
      description: item.description || '',
      purchasePrice: item.purchasePrice,
      sellingPrice: item.sellingPrice,
      status: item.status || 'active',
    });
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.category) {
      toast.error('Item name and Category are required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingItemId) {
        const res = await api.put(`/items/${editingItemId}`, formData);
        if (res.data.success) {
          toast.success('Item updated successfully');
          setIsModalOpen(false);
          fetchItems(pagination.page);
        }
      } else {
        const res = await api.post('/items', formData);
        if (res.data.success) {
          toast.success('Product created successfully');
          setIsModalOpen(false);
          fetchItems(1);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteItemId) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/items/${deleteItemId}`);
      if (res.data.success) {
        toast.success('Product deleted successfully');
        setDeleteItemId(null);
        fetchItems(pagination.page);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete product');
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
            <Glasses className="w-6 h-6 text-brand-600" />
            <span>Eyewear & Product Catalog</span>
          </h2>
          <p className="text-xs text-slate-500">
            Manage frames, lenses, sunglasses, contact lenses, purchase rates, and billing prices.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="optic-btn-primary py-2.5 px-4 text-xs sm:text-sm font-bold shadow-md shadow-brand-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Product</span>
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
              placeholder="Search by Item Name, Brand, SKU or Description..."
              className="optic-input pr-10 pl-3.5 text-xs sm:text-sm"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
          </div>
          <button type="submit" className="optic-btn-secondary text-xs font-semibold py-2 px-4">
            Search
          </button>
        </form>

        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="optic-select py-1.5 px-2 text-xs"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Item Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="optic-select py-1.5 px-2 text-xs"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active (Available)</option>
              <option value="inactive">Inactive (Hidden)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="optic-card overflow-hidden">
        {loading ? (
          <div className="py-16">
            <LoadingSpinner text="Fetching product catalog..." />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Glasses}
            title="No Items Found"
            description="No catalog products found matching your search or filters."
            actionText="Add New Product"
            onAction={handleOpenAddModal}
          />
        ) : (
          <div className="table-responsive">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">SKU / Item</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Brand</th>
                  <th className="py-3 px-3 text-right">Cost Price</th>
                  <th className="py-3 px-3 text-right">Selling Price</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => {
                  const catName = typeof item.category === 'object' ? item.category.name : '-';

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">SKU: {item.sku || 'N/A'}</p>
                      </td>
                      <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">{catName}</td>
                      <td className="py-3.5 px-3 text-slate-600 whitespace-nowrap">{item.brand || '-'}</td>
                      <td className="py-3.5 px-3 text-right text-slate-500 whitespace-nowrap">
                        {formatCurrency(item.purchasePrice)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-extrabold text-slate-900 whitespace-nowrap">
                        {formatCurrency(item.sellingPrice)}
                      </td>
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <Badge variant={item.status === 'active' ? 'success' : 'neutral'} size="sm">
                          {item.status || 'active'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Product Details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteItemId(item._id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {items.length} of {pagination.total} catalog products
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => fetchItems(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="optic-btn-secondary py-1 px-3 text-xs"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => fetchItems(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="optic-btn-secondary py-1 px-3 text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItemId ? 'Edit Product Item' : 'Add New Eyewear / Lens Item'}
        subtitle="Catalog details are loaded into the fast billing counter."
        maxWidth="lg"
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Item Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Titanium Rimless Matte Black"
                className="optic-input"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                className="optic-select"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Brand / Manufacturer</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                placeholder="e.g. Ray-Ban, Essilor, Titan"
                className="optic-input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">SKU (Barcode/Code)</label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="Leave blank to auto-generate"
                className="optic-input font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })
                }
                className="optic-select"
              >
                <option value="active">Active (Available for billing)</option>
                <option value="inactive">Inactive (Archived)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Purchase / Cost Price (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.purchasePrice}
                onChange={(e) =>
                  setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })
                }
                className="optic-input font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Selling Price / MRP (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                required
                value={formData.sellingPrice}
                onChange={(e) =>
                  setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })
                }
                className="optic-input font-bold text-brand-600"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <textarea
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product specs, lens material, frame dimensions..."
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
              {isSaving ? 'Saving...' : editingItemId ? 'Update Product' : 'Add to Catalog'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteItemId)}
        onClose={() => setDeleteItemId(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Item"
        message="Are you sure you want to delete this optical product? Items linked to past invoices cannot be removed to maintain audit history."
        confirmText="Yes, Delete Product"
        isDangerous
        loading={isDeleting}
      />
    </div>
  );
}
