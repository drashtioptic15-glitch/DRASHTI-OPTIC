'use client';

import React, { useState, useEffect } from 'react';
import { Layers, Plus, Search, Edit2, Trash2, CheckCircle2, AlertTriangle, Package } from 'lucide-react';
import api from '@/lib/api';
import { Category } from '@/types';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { toast } from 'sonner';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'inactive',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Delete State
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories');
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err: any) {
      toast.error('Failed to load categories: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleOpenAddModal = () => {
    setEditingCategoryId(null);
    setFormData({
      name: '',
      description: '',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: Category) => {
    setEditingCategoryId(cat._id);
    setFormData({
      name: cat.name,
      description: cat.description || '',
      status: cat.status || 'active',
    });
    setIsModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    setIsSaving(true);
    try {
      if (editingCategoryId) {
        const res = await api.put(`/categories/${editingCategoryId}`, formData);
        if (res.data.success) {
          toast.success('Category updated successfully');
          setIsModalOpen(false);
          fetchCategories();
        }
      } else {
        const res = await api.post('/categories', formData);
        if (res.data.success) {
          toast.success('Category created successfully');
          setIsModalOpen(false);
          fetchCategories();
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteCategory) return;
    setIsDeleting(true);
    try {
      const res = await api.delete(`/categories/${deleteCategory._id}`);
      if (res.data.success) {
        toast.success('Category deleted successfully');
        setDeleteCategory(null);
        fetchCategories();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete category');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCategories = categories.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-brand-600" />
            <span>Product Categories</span>
          </h2>
          <p className="text-xs text-slate-500">
            Structure your optical store catalog into Frames, Lenses, Sunglasses, Contact Lenses, etc.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="optic-btn-primary py-2.5 px-4 text-xs sm:text-sm font-bold shadow-md shadow-brand-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Category</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="optic-card p-4">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="optic-input pr-10 pl-3.5 text-xs sm:text-sm"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
        </div>
      </div>

      {/* Categories Grid / Table */}
      {loading ? (
        <div className="py-16">
          <LoadingSpinner text="Loading catalog categories..." />
        </div>
      ) : filteredCategories.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Categories Found"
          description="Create product categories to organize your frames, lenses, and accessories."
          actionText="Add Category"
          onAction={handleOpenAddModal}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => (
            <div key={cat._id} className="optic-card p-5 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-extrabold text-slate-900">{cat.name}</h3>
                  <Badge variant={cat.status === 'active' ? 'success' : 'neutral'} size="sm">
                    {cat.status}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                  {cat.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                  <Package className="w-4 h-4 text-slate-400" />
                  <span>{cat.itemCount || 0} Products</span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(cat)}
                    className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    title="Edit Category"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteCategory(cat)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategoryId ? 'Edit Category' : 'Create New Category'}
        subtitle="Categories group your optical products in the fast billing dropdown."
        maxWidth="md"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Progressive Lenses"
              className="optic-input"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief details about items in this optical category..."
              className="optic-input resize-none text-xs"
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
              <option value="active">Active (Visible in Billing)</option>
              <option value="inactive">Inactive (Hidden)</option>
            </select>
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
              {isSaving ? 'Saving...' : editingCategoryId ? 'Update Category' : 'Save Category'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteCategory)}
        onClose={() => setDeleteCategory(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        message={
          deleteCategory?.itemCount && deleteCategory.itemCount > 0
            ? `Cannot delete '${deleteCategory.name}': There are ${deleteCategory.itemCount} items linked to it. Please reassign or delete the products first.`
            : `Are you sure you want to delete category '${deleteCategory?.name}'?`
        }
        confirmText="Yes, Delete"
        isDangerous
        loading={isDeleting}
      />
    </div>
  );
}
