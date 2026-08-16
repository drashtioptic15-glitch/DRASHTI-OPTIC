'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@drashtioptic.com');
  const [password, setPassword] = useState('Admin@123456');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in both email and password');
      return;
    }

    setLoading(true);
    try {
      const res = await login(email, password);
      if (res.success) {
        toast.success(res.message || 'Welcome back to Drashti Optic!');
      } else {
        toast.error(res.message || 'Login failed. Check credentials.');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-rose-900 selection:text-rose-100">
      {/* Background ambient red glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-brand-700/15 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-5xl bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 backdrop-blur-xl">
        {/* Left Branding Hero (Desktop) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950/40 p-8 sm:p-12 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
          <div>
            {/* Logo */}
            <div className="bg-white p-3.5 rounded-2xl inline-block shadow-lg border border-slate-200/50 mb-8">
              <img src="/drashti-optic-logo.png" alt="Drashti Optic" className="h-12 w-auto object-contain" />
            </div>

            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                Store Management Suite
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                Precision Billing & Eyewear Management
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Streamlined counter billing, optical prescription matrix, live inventory control, and automated WhatsApp invoice delivery.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Single Store Operator</span>
            </div>
            <span>v1.0 Production</span>
          </div>
        </div>

        {/* Right Form Area */}
        <div className="lg:col-span-7 bg-white p-8 sm:p-12 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h3>
              <p className="text-sm text-slate-500 mt-1">Sign in to your optical store management console</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Email Address
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

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="optic-input pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-brand-600 border-slate-300 rounded focus:ring-brand-500 cursor-pointer"
                />
                <label htmlFor="rememberMe" className="text-xs text-slate-600 font-medium cursor-pointer">
                  Remember this device for 7 days
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="optic-btn-primary w-full py-3 text-sm font-bold shadow-lg shadow-brand-600/30 mt-2"
              >
                {loading ? (
                  <span>Signing In...</span>
                ) : (
                  <>
                    <span>Sign In to Drashti Optic</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Hint for initial demo login */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800">Admin Account: </span>
                <span>admin@drashtioptic.com</span>
              </div>
              <span className="bg-slate-200 px-2 py-0.5 rounded text-[11px] font-mono text-slate-700">Admin@123456</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
