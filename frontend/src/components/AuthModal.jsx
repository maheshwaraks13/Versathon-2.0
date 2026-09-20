import React, { useState } from 'react';
import { X, Lock, User, LogIn, UserPlus, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2C3E42]/40 backdrop-blur-xs font-sans">
      <div 
        className="w-full max-w-md rounded-xl border border-[#E8EEF0] p-6 sm:p-7 bg-white shadow-lg relative text-[#2C3E42]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-md text-[#6C8287] hover:text-[#2C3E42] hover:bg-[#F0F4F6] transition-colors cursor-pointer"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-5">
          <div className="w-10 h-10 rounded-lg bg-[#EDF5F4] border border-[#6FA9A3]/30 mx-auto flex items-center justify-center text-[#6FA9A3] mb-2.5">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-xl font-serif font-bold text-[#2C3E42]">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h3>
          <p className="text-xs text-[#6C8287] mt-1">
            {message || 'Save analyzed reports and track your private lab history trends over time.'}
          </p>
        </div>

        {/* Instant Demo Account Action */}
        <div className="mb-5 p-3 rounded-lg bg-[#EDF5F4] border border-[#6FA9A3]/30 flex items-center justify-between gap-3">
          <div className="text-left">
            <span className="text-xs font-medium text-[#2C3E42] block">Instant demo account</span>
            <p className="text-[11px] text-[#6C8287] mt-0.5">Explore preloaded lab trends & save reports immediately.</p>
          </div>
          <button
            type="button"
            onClick={handleDemo}
            disabled={isSubmitting}
            className="px-3 py-1.5 rounded-md bg-[#6FA9A3] hover:bg-[#5C9892] text-white text-xs font-medium shrink-0 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Loading...' : 'Try demo'}
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-[#E8EEF0]"></div>
          <span className="flex-shrink mx-3 text-[11px] text-[#6C8287]">
            or sign in with credentials
          </span>
          <div className="flex-grow border-t border-[#E8EEF0]"></div>
        </div>

        {/* Mode Tabs */}
        <div className="flex rounded-md bg-[#F0F4F6] p-1 border border-[#E8EEF0] mb-4">
          <button
            type="button"
            onClick={() => { setMode('login'); setAuthError(null); }}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
              mode === 'login'
                ? 'bg-[#6FA9A3] text-white'
                : 'text-[#6C8287] hover:text-[#2C3E42]'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setAuthError(null); }}
            className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
              mode === 'register'
                ? 'bg-[#6FA9A3] text-white'
                : 'text-[#6C8287] hover:text-[#2C3E42]'
            }`}
          >
            Create account
          </button>
        </div>

        {/* Error Alert */}
        {authError && (
          <div className="mb-4 p-3 rounded-md bg-[#FBF3F0] border border-[#F4DCD5] text-[#D98E73] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#2C3E42] mb-1 text-left">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6C8287]">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. john_doe"
                className="w-full rounded-md bg-[#F7FAFB] border border-[#E8EEF0] pl-9 pr-4 py-2 text-xs text-[#2C3E42] placeholder:text-[#6C8287] focus:outline-none focus:border-[#6FA9A3] transition-colors font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#2C3E42] mb-1 text-left">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6C8287]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-md bg-[#F7FAFB] border border-[#E8EEF0] pl-9 pr-4 py-2 text-xs text-[#2C3E42] placeholder:text-[#6C8287] focus:outline-none focus:border-[#6FA9A3] transition-colors font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !username.trim() || !password.trim()}
            className={`w-full py-2.5 rounded-md font-medium text-xs flex items-center justify-center space-x-2 transition-colors ${
              isSubmitting || !username.trim() || !password.trim()
                ? 'bg-[#E8EEF0] text-[#6C8287] cursor-not-allowed'
                : 'bg-[#6FA9A3] hover:bg-[#5C9892] text-white cursor-pointer'
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
                <span>Sign in to MedClear</span>
              </>
            ) : (
              <>
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create private account</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <span className="text-[11px] text-[#6C8287] flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#6FA9A3]" />
            Your medical reports are stored in private isolated storage.
          </span>
        </div>
      </div>
    </div>
  );
}
