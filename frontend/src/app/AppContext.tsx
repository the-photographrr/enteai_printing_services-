'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  phone: string;
  address?: string;
  role: 'visitor' | 'customer' | 'staff' | 'admin' | 'super_admin';
}

interface RegisterData {
  username: string;
  password?: string;
  email?: string;
  phone?: string;
  role?: 'visitor' | 'customer' | 'staff' | 'admin' | 'super_admin';
}

export interface CartItem {
  productId: number;
  productTitle: string;
  productImage: string;
  rate: number;
  quantity: number;
  colorName?: string;
  colorHex?: string;
}

interface AppContextType {
  user: User | null;
  token: string | null;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  login: (username: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => void;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
  refreshUser: () => Promise<void>;
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (productId: number, colorName?: string) => void;
  updateCartQty: (productId: number, colorName: string | undefined, qty: number) => void;
  clearCart: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark'); // Dark mode by default for premium industrial look
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);

  // Load cart on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Error parsing cart from localStorage', e);
      }
    }
    setCartLoaded(true);
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (cartLoaded) {
      localStorage.setItem('cart', JSON.stringify(cart));
    }
  }, [cart, cartLoaded]);

  const addToCart = (item: Omit<CartItem, 'quantity'>, quantity: number = 1) => {
    setCart(prev => {
      const existingIdx = prev.findIndex(
        i => i.productId === item.productId && i.colorName === item.colorName
      );
      if (existingIdx > -1) {
        const next = [...prev];
        next[existingIdx].quantity += quantity;
        return next;
      }
      return [...prev, { ...item, quantity }];
    });
  };

  const removeFromCart = (productId: number, colorName?: string) => {
    setCart(prev => prev.filter(i => !(i.productId === productId && i.colorName === colorName)));
  };

  const updateCartQty = (productId: number, colorName: string | undefined, qty: number) => {
    setCart(prev =>
      prev.map(i =>
        i.productId === productId && i.colorName === colorName
          ? { ...i, quantity: Math.max(1, qty) }
          : i
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  // API base — same-origin Next.js API routes (no CORS needed)
  const API_BASE = '/api';

  useEffect(() => {
    // Load theme & auth from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      Promise.resolve().then(() => setTheme(savedTheme));
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      document.documentElement.classList.add('dark');
    }

    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      Promise.resolve().then(() => {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      });
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      const accessToken = data.access;
      const profileData = data.user;

      localStorage.setItem('token', accessToken);
      setToken(accessToken);
      setUser(profileData);
      localStorage.setItem('user', JSON.stringify(profileData));
      return true;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  const register = async (formData: RegisterData): Promise<boolean> => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      return res.ok;
    } catch (err) {
      console.error('Registration error:', err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  // Wrapper for API requests with JWT headers
  const apiFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const headers = new Headers(options.headers || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Add correct Content-Type if body is json, but omit for FormData (which handles boundaries automatically)
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`;
    const response = await fetch(fullUrl, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Simple token expiry logout for safety
      logout();
    }

    return response;
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const profileData = await res.json();
        setUser(profileData);
        localStorage.setItem('user', JSON.stringify(profileData));
      }
    } catch (err) {
      console.error('Refresh user error:', err);
    }
  };

  return (
    <AppContext.Provider value={{ 
      user, token, theme, toggleTheme, login, register, logout, apiFetch, refreshUser,
      cart, addToCart, removeFromCart, updateCartQty, clearCart 
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
