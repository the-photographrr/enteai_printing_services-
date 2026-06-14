'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Sun, Moon, Menu, X, ShoppingBag } from 'lucide-react';
import { useApp } from '@/app/AppContext';
import CartModal from './CartModal';

interface HeaderProps {
  setAuthModal: (modal: 'login' | 'register' | null) => void;
}

export default function Header({ setAuthModal }: HeaderProps) {
  const { user, logout, theme, toggleTheme, cart } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 glass border-b border-border transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-lg font-bold tracking-widest font-mono uppercase text-foreground">
              ENTE.PrintLabs
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link href="/#catalog" className="text-text-secondary hover:text-foreground transition-colors font-mono">Catalog</Link>
              {user && (
                <Link href="/dashboard" className="text-text-secondary hover:text-foreground transition-colors font-mono">
                  Dashboard
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCartOpen(true)}
              className="p-2 rounded-full border border-border hover:bg-card text-foreground transition-colors relative cursor-pointer"
              aria-label="Open Cart"
            >
              <ShoppingBag size={16} />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white w-4 h-4 rounded-full text-[9px] font-mono font-bold flex items-center justify-center">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>

            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full border border-border hover:bg-card text-foreground transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {user ? (
              <div className="hidden md:flex items-center gap-4">
                <span className="text-xs font-mono text-text-secondary">[{user.role.toUpperCase()}] {user.username}</span>
                <Link href="/dashboard" className="px-4 py-2 text-xs font-mono border border-border hover:border-foreground rounded bg-foreground text-background transition-all">
                  DASHBOARD
                </Link>
                <button onClick={logout} className="text-xs font-mono text-red-500 hover:underline">
                  LOGOUT
                </button>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <button onClick={() => setAuthModal('login')} className="px-4 py-2 text-xs font-mono border border-border hover:border-foreground rounded transition-colors">
                  LOGIN
                </button>
                <button onClick={() => setAuthModal('register')} className="px-4 py-2 text-xs font-mono bg-foreground text-background rounded hover:opacity-90 transition-opacity">
                  REGISTER
                </button>
              </div>
            )}

            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 md:hidden rounded border border-border text-foreground"
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass border-b border-border py-4 px-6 flex flex-col gap-4">
          <Link href="/#catalog" onClick={() => setMobileMenuOpen(false)} className="text-sm font-mono text-text-secondary">Catalog</Link>
          {user ? (
            <>
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="text-sm font-mono text-text-secondary">
                Dashboard
              </Link>
              <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="text-sm font-mono text-red-500 text-left">
                Logout
              </button>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <button onClick={() => { setAuthModal('login'); setMobileMenuOpen(false); }} className="flex-1 py-2 text-xs font-mono border border-border rounded text-center">
                Login
              </button>
              <button onClick={() => { setAuthModal('register'); setMobileMenuOpen(false); }} className="flex-1 py-2 text-xs font-mono bg-foreground text-background rounded text-center">
                Register
              </button>
            </div>
          )}
        </div>
      )}
      <CartModal isOpen={cartOpen} onClose={() => setCartOpen(false)} setAuthModal={setAuthModal} />
    </>
  );
}
