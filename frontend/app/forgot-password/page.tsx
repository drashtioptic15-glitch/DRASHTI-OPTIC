'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('admin@drashtioptic.com');
  const [loading, setLoading] = useState(false);
  const [resetData, setResetData] = useState<{ resetUrl?: string; resetToken?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      if (res.data.success) {
        toast.success(res.data.message);
        setResetData({
          resetUrl: res.data.resetUrl,
          resetToken: res.data.resetToken,
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 selection:bg-rose-900 selection:text-rose-100">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-200">
        <div className="text-center mb-6">
          <img src="/drashti-optic-logo.png" alt="Drashti Optic" className="h-12 w-auto mx-auto mb-4 object-contain" />
          <h2 className="text-xl font-bold text-slate-900">Forgot Password</h2>
          <p className="text-xs text-slate-500 mt-1">
            Enter your registered admin email to receive a password reset link
          </p>
        </div>

        {resetData ? (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-800">Password Reset Link Ready</p>
            <p className="text-xs text-slate-500">
              In a single-store offline environment, you can directly proceed using the link below:
            </p>
            <Link
              href={`/reset-password?token=${resetData.resetToken}`}
              className="optic-btn-primary w-full py-2.5 text-sm font-semibold block"
            >
              Set New Password Now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Registered Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@drashtioptic.com"
                  className="optic-input pl-10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="optic-btn-primary w-full py-3 text-sm font-bold shadow-lg shadow-brand-600/30"
            >
              {loading ? (
                'Generating Link...'
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Reset Link</span>
                </>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 pt-6 border-t border-slate-100 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-brand-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
