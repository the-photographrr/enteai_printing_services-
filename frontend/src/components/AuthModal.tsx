'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '@/app/AppContext';

interface AuthModalProps {
  authModal: 'login' | 'register' | null;
  setAuthModal: (modal: 'login' | 'register' | null) => void;
}

export default function AuthModal({ authModal, setAuthModal }: AuthModalProps) {
  const { login, register } = useApp();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'customer' | 'staff'>('customer');
  const [authError, setAuthError] = useState('');

  if (!authModal) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    if (authModal === 'login') {
      const success = await login(username, password);
      if (success) {
        setAuthModal(null);
        setUsername('');
        setPassword('');
      } else {
        setAuthError('Invalid username or password.');
      }
    } else {
      const success = await register({ username, password, email, phone, role });
      if (success) {
        // Automatically login
        const loggedIn = await login(username, password);
        if (loggedIn) {
          setAuthModal(null);
          setUsername('');
          setPassword('');
          setEmail('');
          setPhone('');
        }
      } else {
        setAuthError('Registration failed. Username might be taken.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm border border-border rounded-xl bg-card p-6 relative">
        <button 
          onClick={() => setAuthModal(null)}
          className="absolute top-4 right-4 p-1 rounded-full border border-border hover:bg-background text-foreground transition-colors"
        >
          <X size={14} />
        </button>
        <h3 className="text-lg font-bold font-mono text-foreground uppercase mb-6">
          {authModal === 'login' ? 'Login' : 'Register'}
        </h3>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-text-secondary mb-1">Username</label>
            <input 
              type="text" 
              required 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:border-foreground font-mono"
            />
          </div>

          {authModal === 'register' && (
            <>
              <div>
                <label className="block text-xs font-mono uppercase text-text-secondary mb-1">Email</label>
                <input 
                  type="email" 
                  required 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:border-foreground font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-text-secondary mb-1">Phone</label>
                <input 
                  type="text" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:border-foreground font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-text-secondary mb-1">Role Type</label>
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'customer' | 'staff')}
                  className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:border-foreground font-mono"
                >
                  <option value="customer">Customer</option>
                  <option value="staff">Production Staff</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-mono uppercase text-text-secondary mb-1">Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:border-foreground font-mono"
            />
          </div>

          {authError && (
            <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-mono rounded">
              {authError}
            </div>
          )}

          <button 
            type="submit" 
            className="w-full py-2 bg-foreground text-background text-xs font-mono tracking-widest uppercase rounded hover:opacity-90 transition-opacity"
          >
            {authModal === 'login' ? 'Login' : 'Create Account'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-border text-center">
          {authModal === 'login' ? (
            <p className="text-[10px] font-mono text-text-secondary">
              Don&apos;t have an account?{' '}
              <button onClick={() => { setAuthModal('register'); setAuthError(''); }} className="text-foreground underline">
                Register
              </button>
            </p>
          ) : (
            <p className="text-[10px] font-mono text-text-secondary">
              Already have an account?{' '}
              <button onClick={() => { setAuthModal('login'); setAuthError(''); }} className="text-foreground underline">
                Login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
