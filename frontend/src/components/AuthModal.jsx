import React, { useState } from 'react';
import { X, Lock, User, Sparkles, LogIn, UserPlus, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose, onSuccess, initialMode = 'login', message }) {
  const { login, register, demoLogin, authError, setAuthError } = useAuth();
  const [mode, setMode] = useState(initialMode); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, password);
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      // error is set in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemo = async () => {
    setIsSubmitting(true);
    try {
      await demoLogin();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      // error is set in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="glass-panel w-full max-w-md rounded-2xl border border-slate-700/80 p-6 sm:p-8 bg-slate-900/95 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-cyan-400 mx-auto flex items-center justify-center shadow-lg shadow-teal-500/20 mb-3">
            <Lock className="w-6 h-6 text-slate-950" />
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            {mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            {message || 'Save analyzed reports and track your private lab history trends over time.'}
          </p>
        </div>

        {/* 1-Click Demo Account Quick Action */}
        <div className="mb-6 p-3.5 rounded-xl bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-transparent border border-teal-500/30 flex items-center justify-between gap-3">
          <div className="text-left">
            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-300">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Instant Demo Account</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Explore preloaded lab trends & save reports immediately.</p>
          </div>
          <button
            type="button"
            onClick={handleDemo}
            disabled={isSubmitting}
            className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold shrink-0 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Loading...' : 'Try Demo'}
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex py-2 items-center mb-5">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-3 text-[11px] font-medium uppercase tracking-wider text-slate-500">
            or continue with credentials
          </span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Mode Tabs */}
        <div className="flex rounded-xl bg-slate-950/80 p-1 border border-slate-800 mb-5">
          <button
            type="button"
            onClick={() => { setMode('login'); setAuthError(null); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'login'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setAuthError(null); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'register'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {authError && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 text-left">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. john_doe"
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 text-left">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-slate-950/80 border border-slate-700 pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !username.trim() || !password.trim()}
            className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-lg ${
              isSubmitting || !username.trim() || !password.trim()
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-slate-950 shadow-teal-500/25 active:scale-[0.98] cursor-pointer'
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In to MedClear</span>
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Private Account</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <span className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Your medical reports are stored in private isolated storage.
          </span>
        </div>
      </div>
    </div>
  );
}
