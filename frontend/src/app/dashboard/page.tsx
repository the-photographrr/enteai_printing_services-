'use client';

import React, { useEffect } from 'react';
import { useApp } from '../AppContext';
import CustomerDashboard from './CustomerDashboard';
import AdminDashboard from './AdminDashboard';
import { Sun, Moon, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardGate() {
  const { user, logout, theme, toggleTheme } = useApp();
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!localStorage.getItem('token')) {
        // Send unauthenticated users to home, not admin login
        router.push('/');
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [user, router]);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center font-mono text-xs text-text-secondary bg-background">
        <div className="w-8 h-8 rounded-full border-2 border-foreground border-t-transparent animate-spin mb-4"></div>
        <span>Verifying authentication credentials...</span>
      </div>
    );
  }

  const isAdminOrStaff = ['admin', 'super_admin', 'staff'].includes(user.role);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      {/* Dashboard Top bar */}
      <header className="glass border-b border-border h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-bold tracking-widest font-mono uppercase text-foreground">
            ENTE.PrintLabs
          </Link>
          <span className="text-[10px] font-mono text-text-secondary border-l border-border pl-4 uppercase">
            {isAdminOrStaff ? 'Admin Workspace' : 'Customer Center'}
          </span>
        </div>

        <div className="flex items-center gap-4 font-mono text-xs">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs text-foreground font-bold">{user.username}</span>
            <span className="text-[9px] text-text-secondary uppercase">Role: {user.role}</span>
          </div>

          <button 
            onClick={toggleTheme}
            className="p-2 border border-border rounded-full hover:bg-card text-foreground"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          <button 
            onClick={() => { logout(); router.push('/'); }}
            className="p-2 border border-border rounded-full hover:bg-card text-red-500"
            aria-label="Logout"
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Main Dashboard body */}
      <div className="flex-grow flex flex-col min-h-0">
        {isAdminOrStaff ? <AdminDashboard /> : <CustomerDashboard />}
      </div>
    </div>
  );
}
