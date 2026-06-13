'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '../../AppContext';
import { Eye, EyeOff, Lock, Shield, AlertTriangle, Sun, Moon } from 'lucide-react';

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30;

export default function AdminLoginPage() {
  const { login, user, logout, theme, toggleTheme } = useApp();
  const router = useRouter();

  const [username, setUsername]     = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [attempts, setAttempts]     = useState(0);
  const [lockout, setLockout]       = useState(0); // seconds remaining
  const lockoutRef                  = useRef<ReturnType<typeof setInterval> | null>(null);

  // If already logged in as admin, redirect straight to dashboard
  useEffect(() => {
    if (user) {
      if (['admin', 'super_admin'].includes(user.role)) {
        router.replace('/dashboard');
      } else {
        // Wrong role — boot them out and show error
        Promise.resolve().then(() => {
          logout();
          setError('Access denied. Admin credentials required.');
        });
      }
    }
  }, [user, router, logout]);

  // Restore lockout from sessionStorage on mount
  useEffect(() => {
    Promise.resolve().then(() => {
      const stored = sessionStorage.getItem('admin_lockout_until');
      if (stored) {
        const remaining = Math.ceil((Number(stored) - Date.now()) / 1000);
        if (remaining > 0) startLockout(remaining);
      }
      const storedAttempts = sessionStorage.getItem('admin_attempts');
      if (storedAttempts) setAttempts(Number(storedAttempts));
    });
  }, []);

  function startLockout(seconds: number) {
    setLockout(seconds);
    if (lockoutRef.current) clearInterval(lockoutRef.current);
    lockoutRef.current = setInterval(() => {
      setLockout((prev) => {
        if (prev <= 1) {
          clearInterval(lockoutRef.current!);
          sessionStorage.removeItem('admin_lockout_until');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockout > 0 || loading) return;
    setError('');
    setLoading(true);

    // Record attempt
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);
    sessionStorage.setItem('admin_attempts', String(newAttempts));

    const success = await login(username, password);

    if (success && user && ['admin', 'super_admin'].includes(user.role)) {
      // Success — clear counters and let the useEffect redirect
      sessionStorage.removeItem('admin_attempts');
      sessionStorage.removeItem('admin_lockout_until');
      router.replace('/dashboard');
    } else {
      // Always show the same generic message (no username enumeration)
      setError('Invalid credentials or insufficient privileges.');
      setPassword('');

      if (newAttempts >= MAX_ATTEMPTS) {
        const lockoutUntil = Date.now() + LOCKOUT_SECONDS * 1000;
        sessionStorage.setItem('admin_lockout_until', String(lockoutUntil));
        sessionStorage.setItem('admin_attempts', '0');
        setAttempts(0);
        startLockout(LOCKOUT_SECONDS);
        setError(`Too many failed attempts. Locked out for ${LOCKOUT_SECONDS} seconds.`);
      }
    }

    setLoading(false);
  };

  const isLocked = lockout > 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-300">
      
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-border glass">
        <span className="text-xs font-mono font-bold tracking-widest uppercase text-foreground">
          ENTE.PrintLabs
        </span>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full border border-border hover:bg-card text-foreground transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </button>
      </header>

      {/* Main */}
      <main className="flex-grow flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">

          {/* Shield badge */}
          <div className="flex flex-col items-center mb-10 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-foreground/5 border border-border flex items-center justify-center">
              <Shield size={26} className="text-foreground" strokeWidth={1.5} />
            </div>
            <div className="text-center space-y-1">
              <h1 className="text-lg font-extrabold tracking-tight text-foreground">Admin Access</h1>
              <p className="text-[11px] text-text-secondary font-mono uppercase tracking-widest">
                Restricted — Authorised Personnel Only
              </p>
            </div>
          </div>

          {/* Card */}
          <div className="border border-border rounded-2xl bg-card p-6 space-y-5 shadow-sm">

            {/* Lockout banner */}
            {isLocked && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-500/8 border border-red-500/20 text-red-500">
                <AlertTriangle size={14} className="shrink-0" />
                <span className="text-[11px] font-mono">
                  Account locked — retry in <strong>{lockout}s</strong>
                </span>
              </div>
            )}

            {/* Error */}
            {error && !isLocked && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/8 border border-red-500/20 text-red-500">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                <span className="text-[11px] font-mono leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              {/* Username */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono uppercase tracking-widest text-text-secondary">
                  Username
                </label>
                <input
                  id="admin-username"
                  type="text"
                  required
                  autoComplete="off"
                  spellCheck={false}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLocked || loading}
                  placeholder="admin username"
                  className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground font-mono placeholder:text-text-secondary/40 focus:outline-none focus:border-foreground transition-colors disabled:opacity-40"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono uppercase tracking-widest text-text-secondary">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPass ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLocked || loading}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 bg-background border border-border rounded-xl text-sm text-foreground font-mono placeholder:text-text-secondary/40 focus:outline-none focus:border-foreground transition-colors disabled:opacity-40"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-foreground transition-colors"
                  >
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Attempt counter */}
              {attempts > 0 && attempts < MAX_ATTEMPTS && !isLocked && (
                <p className="text-[10px] font-mono text-text-secondary text-right">
                  {MAX_ATTEMPTS - attempts} attempt{MAX_ATTEMPTS - attempts !== 1 ? 's' : ''} remaining
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLocked || loading || !username || !password}
                className="w-full h-11 mt-2 bg-foreground text-background text-xs font-bold tracking-widest uppercase rounded-xl hover:opacity-90 active:scale-[.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-4 h-4 rounded-full border-2 border-background border-t-transparent animate-spin" />
                ) : (
                  <>
                    <Lock size={12} />
                    Authenticate
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <p className="text-center text-[10px] font-mono text-text-secondary mt-6 leading-relaxed">
            This portal is monitored. Unauthorised access attempts are logged.
            <br />
            <Link href="/" className="hover:text-foreground transition-colors underline underline-offset-2 mt-1 inline-block">
              ← Back to store
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
