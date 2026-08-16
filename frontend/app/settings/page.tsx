'use client';

import React, { useState, useEffect } from 'react';
import {
  Settings,
  Store,
  Send,
  Lock,
  Receipt,
  Save,
  CheckCircle2,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import api from '@/lib/api';
import { StoreSettings } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Badge from '@/components/ui/Badge';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'store' | 'invoice' | 'whatsapp' | 'security'>('store');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Store & WhatsApp Settings
  const [settings, setSettings] = useState<StoreSettings>({
    storeName: 'Drashti Optic',
    tagline: 'EYEGLASSES | CONTACT LENSES | SUNGLASSES',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    website: '',
    gstNumber: '',
    invoicePrefix: 'INV',
    invoiceFooter: '',
    whatsappPhoneNumberId: '',
    whatsappBusinessAccountId: '',
    whatsappAccessToken: '',
    currencySymbol: '₹',
    taxRate: 0,
  });

  // Password Change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      if (res.data.success) {
        setSettings(res.data.data);
      }
    } catch (err: any) {
      toast.error('Failed to load settings: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await api.put('/settings', settings);
      if (res.data.success) {
        toast.success('Settings updated successfully');
        fetchSettings();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      toast.error('Please enter current and new password');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await api.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      if (res.data.success) {
        toast.success('Admin password updated successfully');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullPage text="Loading configuration..." />;
  }

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-600" />
          <span>System & Store Settings</span>
        </h2>
        <p className="text-xs text-slate-500">
          Configure store identity, invoice templates, WhatsApp Cloud API integration, and owner credentials.
        </p>
      </div>

      {/* Tabs */}
      <div className="optic-card p-1.5 flex flex-wrap gap-1 bg-slate-100/80">
        {[
          { id: 'store', label: 'Store Profile', icon: Store },
          { id: 'invoice', label: 'Invoice Design & Tax', icon: Receipt },
          { id: 'whatsapp', label: 'WhatsApp Cloud API', icon: Send },
          { id: 'security', label: 'Security & Password', icon: Lock },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Content */}
      {activeTab === 'store' && (
        <form onSubmit={handleSaveSettings} className="optic-card p-6 sm:p-8 space-y-6">
          <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">
            Optical Store Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Store Name</label>
              <input
                type="text"
                value={settings.storeName}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                className="optic-input font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tagline / Services</label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="optic-input"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Street Address</label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="optic-input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={settings.city}
                onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                className="optic-input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">State & Pincode</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.state}
                  onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                  className="optic-input flex-1"
                />
                <input
                  type="text"
                  value={settings.pincode}
                  onChange={(e) => setSettings({ ...settings, pincode: e.target.value })}
                  className="optic-input w-28"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="optic-input font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="optic-input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Website</label>
              <input
                type="text"
                value={settings.website}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                className="optic-input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">GSTIN Number</label>
              <input
                type="text"
                value={settings.gstNumber}
                onChange={(e) => setSettings({ ...settings, gstNumber: e.target.value })}
                className="optic-input font-mono uppercase"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSaving}
              className="optic-btn-primary py-2.5 px-6 font-bold shadow-md shadow-brand-600/30"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'invoice' && (
        <form onSubmit={handleSaveSettings} className="optic-card p-6 sm:p-8 space-y-6">
          <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">
            Invoice Numbering & Default Terms
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Invoice Prefix</label>
                <input
                  type="text"
                  value={settings.invoicePrefix}
                  onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                  className="optic-input font-mono font-bold"
                />
                <p className="text-[11px] text-slate-500 mt-1">Generated format: INV-2026-000001</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Default Tax / GST (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={settings.taxRate}
                  onChange={(e) =>
                    setSettings({ ...settings, taxRate: parseFloat(e.target.value) || 0 })
                  }
                  className="optic-input font-bold"
                />
                <p className="text-[11px] text-slate-500 mt-1">Default applied rate on billing</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Invoice Footer / Warranty Notes
              </label>
              <textarea
                rows={3}
                value={settings.invoiceFooter}
                onChange={(e) => setSettings({ ...settings, invoiceFooter: e.target.value })}
                className="optic-input text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSaving}
              className="optic-btn-primary py-2.5 px-6 font-bold shadow-md shadow-brand-600/30"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Invoice Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'whatsapp' && (
        <form onSubmit={handleSaveSettings} className="optic-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">WhatsApp Cloud API (Meta)</h3>
              <p className="text-xs text-slate-500">Automatically dispatches generated PDF invoices to customers</p>
            </div>
            <Badge variant={settings.hasWhatsAppToken ? 'success' : 'neutral'} size="md">
              {settings.hasWhatsAppToken ? 'Configured' : 'Not Configured'}
            </Badge>
          </div>

          <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 text-xs text-slate-700 space-y-1 leading-relaxed">
            <p className="font-bold text-brand-600 flex items-center gap-1.5">
              <Send className="w-4 h-4" /> Automatic PDF Document Dispatch
            </p>
            <p>
              When an invoice is finalized, the backend uploads the generated PDF directly to WhatsApp Cloud API Media and sends the PDF document message to the customer&apos;s mobile number.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                WhatsApp Phone Number ID
              </label>
              <input
                type="text"
                value={settings.whatsappPhoneNumberId || ''}
                onChange={(e) => setSettings({ ...settings, whatsappPhoneNumberId: e.target.value })}
                placeholder="e.g. 104829382910394"
                className="optic-input font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                WhatsApp Business Account ID (WABA ID)
              </label>
              <input
                type="text"
                value={settings.whatsappBusinessAccountId || ''}
                onChange={(e) =>
                  setSettings({ ...settings, whatsappBusinessAccountId: e.target.value })
                }
                placeholder="e.g. 293849102938492"
                className="optic-input font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                System User Permanent Access Token
              </label>
              <input
                type="password"
                value={settings.whatsappAccessToken || ''}
                onChange={(e) => setSettings({ ...settings, whatsappAccessToken: e.target.value })}
                placeholder={
                  settings.hasWhatsAppToken
                    ? `Configured (${settings.whatsappAccessTokenMasked || '••••••••'}). Enter new token to overwrite.`
                    : 'Paste Meta WhatsApp Cloud API Permanent Token...'
                }
                className="optic-input font-mono text-xs"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Tokens are stored securely on the backend and never exposed to public frontend clients.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSaving}
              className="optic-btn-primary py-2.5 px-6 font-bold shadow-md shadow-brand-600/30"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save WhatsApp Configuration'}</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'security' && (
        <form onSubmit={handleChangePassword} className="optic-card p-6 sm:p-8 space-y-6">
          <h3 className="text-base font-extrabold text-slate-900 border-b border-slate-100 pb-3">
            Change Store Owner Password
          </h3>

          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Current Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, currentPassword: e.target.value })
                }
                placeholder="••••••••"
                className="optic-input"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, newPassword: e.target.value })
                }
                placeholder="At least 6 characters"
                className="optic-input"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Confirm New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                }
                placeholder="Repeat new password"
                className="optic-input"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="showPass"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
              <label htmlFor="showPass" className="text-xs text-slate-600 cursor-pointer font-medium">
                Show password text
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="submit"
              disabled={isChangingPassword}
              className="optic-btn-primary py-2.5 px-6 font-bold shadow-md shadow-brand-600/30"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isChangingPassword ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
