'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from './AppContext';
import STLViewer from '../components/STLViewer';
import {
  Sun, Moon, Upload, Check, AlertCircle, FileText,
  ChevronRight, ChevronLeft, ArrowRight, Menu, X, Heart,
} from 'lucide-react';
import Link from 'next/link';

// Media URLs come from Cloudflare R2 — set NEXT_PUBLIC_R2_PUBLIC_URL in Cloudflare Pages env vars
const R2_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';



interface CatalogProduct {
  id: number;
  title: string;
  description: string;
  category: string;
  rate: string | number;
  image?: string;
  status: string;
}

interface DbMaterial {
  id: number;
  type: string;
  color: string;
  available_stock: number;
  reorder_level: number;
  brand?: string;
}

export default function Home() {
  const { user, login, register, logout, theme, toggleTheme, apiFetch, refreshUser } = useApp();
  
  const catalogRef = useRef<HTMLDivElement>(null);

  const scrollCatalog = (direction: 'left' | 'right') => {
    if (catalogRef.current) {
      const scrollAmount = catalogRef.current.clientWidth * 0.75;
      catalogRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Navigation & Modal states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);
  // Catalog Order states
  const [orderProduct, setOrderProduct] = useState<CatalogProduct | null>(null);

  // Form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'customer' | 'staff'>('customer');
  const [authError, setAuthError] = useState('');

  // Catalog Products state
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Custom Request Form states
  const [projectName, setProjectName] = useState('');
  const [infill, setInfill] = useState('20%');
  const [requestDesc, setRequestDesc] = useState('');
  const [dimensions, setDimensions] = useState('2.000 x 2.000 x 2.000 cm');
  const [materialPref, setMaterialPref] = useState('');
  const [colorPref, setColorPref] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [stlFiles, setStlFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [scalePercent, setScalePercent] = useState(100);
  const [rotationX, setRotationX] = useState(0);
  const [rotationY, setRotationY] = useState(0);
  const [selectedColorHex, setSelectedColorHex] = useState('#6b7280');
  const [dbMaterials, setDbMaterials] = useState<DbMaterial[]>([]);
  const [baseX, setBaseX] = useState(2.000);
  const [baseY, setBaseY] = useState(2.000);
  const [baseZ, setBaseZ] = useState(2.000);

  // Catalog Order states
  const [orderQty, setOrderQty] = useState(1);
  const [orderAddress, setOrderAddress] = useState('');
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(true);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Failed to fetch products', err);
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await fetch('/api/materials');
      if (res.ok) {
        const data = await res.json();
        setDbMaterials(data);
        const firstInStock = data.find((m: DbMaterial) => m.available_stock > 0);
        if (firstInStock) {
          setMaterialPref(firstInStock.type);
          setColorPref(firstInStock.color);
          setSelectedColorHex(getColorHex(firstInStock.color));
        }
      }
    } catch (err) {
      console.error('Failed to fetch materials', err);
    }
  }, []);

  // Load products & materials
  useEffect(() => {
    Promise.resolve().then(() => {
      fetchProducts();
      fetchMaterials();
    });
  }, [fetchProducts, fetchMaterials]);

  function getColorHex(colorName: string): string {
    if (!colorName) return '#6b7280';
    if (colorName.startsWith('#')) return colorName;
    const colors: Record<string, string> = {
      'black': '#1a1a1a',
      'white': '#ffffff',
      'red': '#ef4444',
      'blue': '#3b82f6',
      'yellow': '#eab308',
      'green': '#22c55e',
      'grey': '#6b7280',
      'gray': '#6b7280',
      'brown': '#78350f',
      'orange': '#f97316',
      'purple': '#a855f7',
      'pink': '#ec4899',
      'clear': '#e2e8f0'
    };
    return colors[colorName.toLowerCase()] || '#6b7280';
  }

  /** Resets STL-related state back to defaults. */
  const resetStl = () => {
    setStlFiles([]);
    setBaseX(2.0);
    setBaseY(2.0);
    setBaseZ(2.0);
    setScalePercent(100);
    setDimensions('2.000 x 2.000 x 2.000 cm');
  };

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

  const handleModelLoaded = (dims: { x: number; y: number; z: number }) => {
    const cx = dims.x / 10;
    const cy = dims.y / 10;
    const cz = dims.z / 10;
    setBaseX(cx);
    setBaseY(cy);
    setBaseZ(cz);
    setDimensions(`${(cx * scalePercent / 100).toFixed(3)} x ${(cy * scalePercent / 100).toFixed(3)} x ${(cz * scalePercent / 100).toFixed(3)} cm`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { resetStl(); return; }
    if (!file.name.toLowerCase().endsWith('.stl')) {
      setRequestError('Please upload a valid .stl file.');
      e.target.value = '';
      return;
    }
    setRequestError('');
    setStlFiles([file]);
  };

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      // Only deactivate when leaving the dropzone itself, not its children
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setDragActive(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.stl')) {
      setRequestError('Please upload a valid .stl file.');
      return;
    }
    setRequestError('');
    setStlFiles([file]);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAuthModal('login');
      return;
    }
    if (stlFiles.length === 0) {
      setRequestError('Please upload at least one 3D STL file.');
      return;
    }

    setRequestError('');
    setUploadProgress(true);

    const formData = new FormData();
    formData.append('project_name', projectName);
    formData.append('infill', infill);
    formData.append('description', requestDesc);
    formData.append('dimensions', dimensions);
    formData.append('material_preference', materialPref);
    formData.append('color_preference', colorPref);
    formData.append('quantity', quantity.toString());
    formData.append('required_delivery_date', deliveryDate);
    stlFiles.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const res = await apiFetch('/requests/', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setRequestSuccess(true);
        setProjectName('');
        setInfill('20%');
        setRequestDesc('');
        const firstInStock = dbMaterials.find((m: DbMaterial) => m.available_stock > 0);
        if (firstInStock) {
          setMaterialPref(firstInStock.type);
          setColorPref(firstInStock.color);
          setSelectedColorHex(getColorHex(firstInStock.color));
        } else {
          setMaterialPref('');
          setColorPref('');
          setSelectedColorHex('#6b7280');
        }
        setQuantity(1);
        setDeliveryDate('');
        resetStl();
      } else {
        const errData = await res.json();
        setRequestError(errData.detail || 'Failed to submit request.');
      }
    } catch (err) {
      console.error(err);
      setRequestError('API request error.');
    } finally {
      setUploadProgress(false);
    }
  };

  const handleOpenOrder = (prod: CatalogProduct) => {
    if (!user) {
      setAuthModal('login');
      return;
    }
    setOrderProduct(prod);
    setOrderQty(1);
    setOrderAddress(user.address || '');
    setOrderSuccess(false);
    setOrderError('');
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !orderProduct) return;

    if (!orderAddress.trim()) {
      setOrderError('Delivery address is required.');
      return;
    }

    setSubmittingOrder(true);
    setOrderError('');
    setOrderSuccess(false);

    try {
      if (saveAddressToProfile && orderAddress !== user.address) {
        await apiFetch('/auth/profile/', {
          method: 'PATCH',
          body: JSON.stringify({ address: orderAddress })
        });
        await refreshUser();
      }

      const payload = {
        product: orderProduct.id,
        quantity: orderQty,
        shipping_address: orderAddress
      };

      const res = await apiFetch('/orders/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setOrderSuccess(true);
        setTimeout(() => {
          setOrderSuccess(false);
          setOrderProduct(null);
        }, 2500);
      } else {
        const errorData = await res.json();
        setOrderError(errorData.detail || 'Failed to place order.');
      }
    } catch (err) {
      console.error(err);
      setOrderError('Network error placing order.');
    } finally {
      setSubmittingOrder(false);
    }
  };



  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-lg font-bold tracking-widest font-mono uppercase text-foreground">
              ENTE.PrintLabs
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <a href="#catalog" className="text-text-secondary hover:text-foreground transition-colors font-mono">Catalog</a>
              <a href="#custom-print" className="text-text-secondary hover:text-foreground transition-colors font-mono">Custom Print</a>
              {user && (
                <Link href="/dashboard" className="text-text-secondary hover:text-foreground transition-colors font-mono">
                  Dashboard
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
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
          <a href="#catalog" onClick={() => setMobileMenuOpen(false)} className="text-sm font-mono text-text-secondary">Catalog</a>
          <a href="#custom-print" onClick={() => setMobileMenuOpen(false)} className="text-sm font-mono text-text-secondary">Custom Print</a>
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

      {/* Hero Section */}
      <section className="relative py-24 md:py-32 overflow-hidden border-b border-border bg-gradient-to-b from-card to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto font-sans leading-tight">
            Transform Ideas Into Physical Products.
          </h1>
          <p className="mt-6 text-sm sm:text-base text-text-secondary max-w-xl mx-auto font-mono">
            High-fidelity custom 3D printing and mechanical manufacturing portal. Upload STL, receive manual admin quote, and track real-time printer scheduling.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#custom-print" className="px-8 py-3 bg-foreground text-background text-xs tracking-widest font-mono rounded hover:opacity-90 transition-opacity uppercase flex items-center justify-center gap-2">
              Submit custom request <ArrowRight size={14} />
            </a>
            <a href="#catalog" className="px-8 py-3 border border-border text-foreground text-xs tracking-widest font-mono rounded hover:border-foreground transition-colors uppercase">
              Browse products
            </a>
          </div>
        </div>
        
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      </section>

      {/* Product Catalog */}
      <section id="catalog" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-border pb-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground mt-2 font-mono uppercase">Product Catalog</h2>
          </div>
          <p className="text-xs text-text-secondary font-mono mt-2 md:mt-0">Professional grade predefined prototypes</p>
        </div>

        <div className="relative px-2 md:px-0">
          {/* Slider Arrow Buttons */}
          <button 
            onClick={() => scrollCatalog('left')}
            className="absolute left-0 md:-left-6 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 dark:bg-[#111111]/90 border border-border flex items-center justify-center text-foreground hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>

          {loadingProducts ? (
            <div className="flex overflow-x-auto gap-6 pb-6 no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-80 min-w-[280px] md:min-w-[300px] border border-border rounded-[24px] bg-card animate-pulse shrink-0" />
              ))}
            </div>
          ) : (
            <div 
              ref={catalogRef}
              className="flex overflow-x-auto gap-6 pb-6 snap-x snap-mandatory scroll-smooth no-scrollbar -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
            >
              {products.map((prod) => (
                <div key={prod.id} className="relative rounded-[24px] border border-border bg-white dark:bg-[#111111] p-3 transition-all duration-300 hover:shadow-lg flex flex-col h-full min-w-[280px] md:min-w-[300px] w-[280px] md:w-[300px] snap-start shrink-0">
                  {prod.image && (
                    <div className="relative w-full aspect-[4/3] rounded-[18px] overflow-hidden bg-neutral-100 dark:bg-neutral-900">
                      <Link href={`/products/${prod.id}`} className="block w-full h-full">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img 
                          src={prod.image ? (prod.image.startsWith('http') ? prod.image : `${R2_BASE}${prod.image}`) : '/placeholder.png'}
                          alt={prod.title} 
                          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                        />
                      </Link>
                      {/* Heart Button Overlay */}
                      <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center text-foreground border border-border/10 hover:scale-105 active:scale-95 transition-all">
                        <Heart size={14} className="text-foreground/75 hover:text-foreground transition-colors" />
                      </button>
                      {/* Dot indicators at the bottom center of the image */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 pointer-events-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-white/40"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-white/40"></span>
                      </div>
                    </div>
                  )}
                  {/* Bottom Details Section */}
                  <div className="mt-4 px-1 flex justify-between items-end pb-1 flex-grow">
                    <div className="space-y-1 font-mono">
                      <Link href={`/products/${prod.id}`} className="hover:underline block">
                        <h3 className="text-xs font-bold text-foreground uppercase tracking-tight line-clamp-1">{prod.title}</h3>
                      </Link>
                      <span className="text-sm font-bold text-foreground block">
                        ${prod.rate ? Number(prod.rate).toFixed(0) : '0'}
                      </span>
                    </div>
                    <button 
                      onClick={() => handleOpenOrder(prod)}
                      className="px-3.5 py-1.5 rounded-full bg-foreground text-background text-[9px] font-mono tracking-wider uppercase font-extrabold hover:scale-105 active:scale-95 transition-all shrink-0 ml-2 shadow-sm"
                    >
                      Place Order
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button 
            onClick={() => scrollCatalog('right')}
            className="absolute right-0 md:-right-6 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 dark:bg-[#111111]/90 border border-border flex items-center justify-center text-foreground hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </section>

      {/* Steps of Custom Print Section */}
      <section className="py-20 border-t border-border bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl font-bold tracking-tight text-foreground font-mono uppercase">How Custom Printing Works</h2>
            <p className="text-xs text-text-secondary font-mono mt-2">Get custom parts manufactured in four simple stages</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                num: "01",
                title: "Upload Design",
                desc: "Drag-and-drop your STL design files. The platform parses model dimensions and extracts volume metrics automatically."
              },
              {
                num: "02",
                title: "Expert Review",
                desc: "Engineers assess mesh structure, approve printability parameters, and generate an itemized cost quotation."
              },
              {
                num: "03",
                title: "Approve & Pay",
                desc: "Review your quotation sheet, complete the transaction via UPI or bank transfer, and upload your reference receipt."
              },
              {
                num: "04",
                title: "Live Production",
                desc: "Your model gets assigned to an active industrial printer. Monitor scheduling queues and build completion live."
              }
            ].map((step, idx) => (
              <div key={idx} className="relative p-6 rounded-2xl border border-border bg-white dark:bg-[#111111] transition-all hover:shadow-md">
                <div className="absolute top-4 right-6 text-3xl font-black text-foreground/10 font-mono tracking-tight select-none">
                  {step.num}
                </div>
                <h3 className="text-xs font-bold text-foreground font-mono uppercase mb-3 pr-8">{step.title}</h3>
                <p className="text-[11px] text-text-secondary leading-relaxed font-mono">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Custom Request Portal */}
      <section id="custom-print" className="py-20 border-t border-border bg-card/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold tracking-tight text-foreground mt-2 font-mono uppercase">Custom Print requests</h2>
            <p className="text-xs text-text-secondary font-mono mt-2">Submit your files for engineering review and quotation</p>
          </div>

          <form onSubmit={handleSubmitRequest} className="border border-border rounded-xl p-6 sm:p-8 bg-card/65 space-y-6">
            {requestSuccess ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-500 mb-4">
                  <Check size={24} />
                </div>
                <h3 className="text-lg font-bold text-foreground font-mono uppercase">Request Submitted!</h3>
                <p className="text-xs text-text-secondary font-mono mt-2 max-w-md">
                  We have received your design files. Our staff will analyze the mesh parameters, calculate print times, and construct your manual quote shortly.
                </p>
                <div className="mt-8 flex gap-4">
                  <button 
                    type="button" 
                    onClick={() => setRequestSuccess(false)}
                    className="px-4 py-2 border border-border text-xs font-mono rounded hover:border-foreground transition-colors"
                  >
                    Submit Another
                  </button>
                  <Link 
                    href="/dashboard" 
                    className="px-4 py-2 bg-foreground text-background text-xs font-mono rounded hover:opacity-90 transition-opacity"
                  >
                    Go to Dashboard
                  </Link>
                </div>
              </div>
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
                
                {/* LEFT COLUMN: FDM 3D Printing Service, Swatches, Fields */}
                <div className="lg:col-span-2 space-y-6">
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-foreground font-mono uppercase">FDM 3D Printing Service</h3>
                    <p className="text-[11px] text-text-secondary font-mono">Select production parameters, material, and upload project info.</p>
                  </div>

                  {/* Material selection card */}
                  <div className="border border-border rounded-xl p-5 bg-background/45 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center font-mono text-[10px] font-bold">1</span>
                      <span className="text-xs font-bold font-mono text-foreground uppercase tracking-widest">Material & Colors</span>
                    </div>

                    {/* Selected pill */}
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-full text-xs font-mono">
                      <span className="text-text-secondary">Material:</span>
                      <div className="w-3.5 h-3.5 rounded border border-border/50" style={{ backgroundColor: selectedColorHex }} />
                      <span className="font-bold text-foreground uppercase">{materialPref} - {colorPref}</span>
                    </div>

                    {/* Material Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {dbMaterials.length > 0 ? (
                        dbMaterials.map((m: DbMaterial) => {
                          const colorHex = getColorHex(m.color);
                          const inStock = m.available_stock > 0;
                          const isSelected = materialPref === m.type && colorPref === m.color;

                          return (
                            <button
                              key={m.id || `${m.type}-${m.color}`}
                              type="button"
                              disabled={!inStock}
                              title={`${m.type} - ${m.color} ${inStock ? `(${m.available_stock} kg available)` : '(Out of Stock)'}`}
                              onClick={() => {
                                if (inStock) {
                                  setMaterialPref(m.type);
                                  setColorPref(m.color);
                                  setSelectedColorHex(colorHex);
                                }
                              }}
                              className={`text-left p-2.5 rounded-lg border font-mono transition-all flex items-center justify-between relative group ${
                                !inStock
                                  ? 'opacity-40 cursor-not-allowed border-border bg-card/25'
                                  : isSelected
                                  ? 'border-foreground bg-foreground/5 dark:bg-foreground/10 ring-1 ring-foreground scale-[1.02] shadow-sm'
                                  : 'border-border bg-background/40 hover:border-text-secondary hover:bg-card/45'
                              }`}
                            >
                              {/* Left: Material Name (70% width) */}
                              <div className="w-[70%] flex flex-col justify-center">
                                <span className="text-[10px] font-bold text-foreground uppercase tracking-wider truncate">
                                  {m.type}
                                </span>
                              </div>

                              {/* Right: Color Indicator (30% width) */}
                              <div className="w-[30%] flex flex-col items-end justify-center gap-1">
                                <div
                                  className="w-5 h-5 rounded-full border border-border/50 shadow-sm"
                                  style={{ backgroundColor: colorHex }}
                                />
                                <span className="text-[8px] text-text-secondary uppercase truncate max-w-full block">
                                  {m.color}
                                </span>
                              </div>

                              {!inStock && (
                                <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-grayscale rounded-lg pointer-events-none">
                                  <span className="text-[7px] uppercase tracking-widest font-extrabold bg-red-500 text-white px-1.5 py-0.5 rounded shadow-sm">
                                    Out
                                  </span>
                                </div>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="col-span-full py-8 text-center text-xs text-text-secondary font-mono">
                          No materials currently registered by admin.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Project info card */}
                  <div className="border border-border rounded-xl p-5 bg-background/45 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center font-mono text-[10px] font-bold">2</span>
                      <span className="text-xs font-bold font-mono text-foreground uppercase tracking-widest">Project Details</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                      <div className="space-y-1 md:col-span-2">
                        <label className="block text-[9px] text-text-secondary uppercase">Project Name *</label>
                        <input 
                          type="text" 
                          required
                          value={projectName}
                          onChange={(e) => setProjectName(e.target.value)}
                          placeholder="e.g., Robotic Arm Housing"
                          className="w-full px-3 py-2 bg-background border border-border rounded text-foreground focus:outline-none focus:border-foreground"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9px] text-text-secondary uppercase">Quantity *</label>
                        <div className="flex border border-border rounded overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="px-3 py-2 bg-background hover:bg-card border-r border-border text-foreground font-bold"
                          >
                            -
                          </button>
                          <input 
                            type="number" 
                            min="1"
                            required
                            value={quantity}
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-full px-2 py-2 bg-background text-center text-foreground focus:outline-none font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => setQuantity(quantity + 1)}
                            className="px-3 py-2 bg-background hover:bg-card border-l border-border text-foreground font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9px] text-text-secondary uppercase">Infill Preference *</label>
                        <select 
                          value={infill}
                          onChange={(e) => setInfill(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded text-foreground focus:outline-none focus:border-foreground"
                        >
                          <option value="10%">10% (Draft / Light Mockups)</option>
                          <option value="20%">20% (Standard / Mechanical Parts)</option>
                          <option value="50%">50% (High Strength)</option>
                          <option value="100%">100% (Solid / Premium Rigid)</option>
                        </select>
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="block text-[9px] text-text-secondary uppercase">Required Delivery Date *</label>
                        <input 
                          type="date"
                          required
                          value={deliveryDate}
                          min={new Date().toISOString().split('T')[0]}
                          onChange={(e) => setDeliveryDate(e.target.value)}
                          className="w-full px-3 py-2 bg-background border border-border rounded text-foreground focus:outline-none focus:border-foreground uppercase font-mono"
                        />
                      </div>

                      <div className="space-y-1 md:col-span-2">
                        <label className="block text-[9px] text-text-secondary uppercase">Description / Special Requirements *</label>
                        <textarea 
                          rows={3}
                          required
                          value={requestDesc}
                          onChange={(e) => setRequestDesc(e.target.value)}
                          placeholder="Detail infill density, application stress load, or surface finish preferences..."
                          className="w-full px-3 py-2 bg-background border border-border rounded text-foreground focus:outline-none focus:border-foreground"
                        />
                      </div>
                    </div>

                    {requestError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] rounded flex items-center gap-2">
                        <AlertCircle size={12} />
                        <span>{requestError}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-end pt-2">
                      {user ? (
                        <button 
                          type="submit" 
                          disabled={uploadProgress}
                          className="w-full px-8 py-3 bg-foreground text-background text-[10px] tracking-widest uppercase rounded hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-bold"
                        >
                          {uploadProgress ? 'Processing...' : 'SUBMIT REQUEST'}
                        </button>
                      ) : (
                        <button 
                          type="button" 
                          onClick={() => setAuthModal('login')}
                          className="w-full px-8 py-3 bg-foreground/10 text-foreground text-[10px] tracking-widest uppercase rounded hover:bg-foreground/20 transition-all flex items-center justify-center gap-2 font-bold"
                        >
                          Login to submit request
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: 3D Preview, Scale, Dimensions, Rotation */}
                <div className="lg:col-span-3 space-y-6">
                  {stlFiles.length === 0 ? (
                    /* Dropzone / File Uploader */
                    <div 
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-8 bg-background/45 flex flex-col items-center justify-center text-center transition-all min-h-[360px] ${
                        dragActive 
                          ? 'border-foreground bg-foreground/5 dark:bg-foreground/10 scale-[1.01]' 
                          : 'border-border hover:border-foreground/40'
                      }`}
                    >
                      <input
                        type="file"
                        id="stl-file-input"
                        accept=".stl"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label htmlFor="stl-file-input" className="cursor-pointer flex flex-col items-center justify-center space-y-4 w-full h-full">
                        <div className="w-12 h-12 rounded-full bg-foreground/5 dark:bg-foreground/10 border border-border flex items-center justify-center text-foreground transition-transform hover:scale-110">
                          <Upload size={20} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold font-mono text-foreground uppercase tracking-wider">Drag & drop your STL file</p>
                          <p className="text-[10px] text-text-secondary font-mono">or click to browse from device</p>
                        </div>
                        <p className="text-[9px] text-text-secondary/80 font-mono max-w-xs leading-relaxed">
                          Supports standard .stl files. Automated parsing extracts volume, bounds, and surface characteristics.
                        </p>
                      </label>
                    </div>
                  ) : (
                    /* 3D Previewer and controls */
                    <div className="space-y-6">
                      <div className="relative border border-border rounded-xl overflow-hidden bg-background/45">
                        <STLViewer 
                          fileObject={stlFiles[0]} 
                          modelColor={selectedColorHex} 
                          onLoadDimensions={handleModelLoaded} 
                          height="360px" 
                        />
                        
                        {/* File Name Indicator Overlay */}
                        <div className="absolute top-3 left-3 px-3 py-1 bg-background/90 dark:bg-[#111111]/90 border border-border rounded-lg shadow-sm flex items-center gap-2 max-w-[80%]">
                          <FileText size={12} className="text-foreground shrink-0" />
                          <span className="text-[10px] font-mono text-foreground truncate">{stlFiles[0].name}</span>
                          <span className="text-[9px] font-mono text-text-secondary shrink-0">
                            ({(stlFiles[0].size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => resetStl()}
                          className="absolute top-3 right-3 p-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          title="Remove file"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      {/* Parameter Tuning Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Scale Slider Card */}
                        <div className="border border-border rounded-xl p-4 bg-background/45 space-y-3 font-mono text-xs">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-text-secondary uppercase">Model Scale</span>
                            <span className="font-bold text-foreground">{scalePercent}%</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="300"
                            value={scalePercent}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setScalePercent(val);
                              setDimensions(
                                `${(baseX * val / 100).toFixed(3)} x ${(baseY * val / 100).toFixed(3)} x ${(baseZ * val / 100).toFixed(3)} cm`
                              );
                            }}
                            className="w-full accent-foreground"
                          />
                          <div className="flex justify-between text-[9px] text-text-secondary uppercase">
                            <span>10%</span>
                            <span>300%</span>
                          </div>
                        </div>

                        {/* Calculated Dimensions Card */}
                        <div className="border border-border rounded-xl p-4 bg-background/45 space-y-2 font-mono text-xs">
                          <span className="text-[10px] text-text-secondary uppercase block">Calculated Dimensions</span>
                          <span className="text-sm font-bold text-foreground block tracking-tight">
                            {dimensions}
                          </span>
                          <span className="text-[9px] text-text-secondary/80 leading-relaxed block">
                            Real-time bounds calculation linked to aspect ratio lock.
                          </span>
                        </div>

                        {/* Rotation Sliders Card */}
                        <div className="border border-border rounded-xl p-4 bg-background/45 space-y-4 font-mono text-xs md:col-span-2">
                          <span className="text-[10px] text-text-secondary uppercase block">Viewer Orientation</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-[9px] text-text-secondary">ROTATION X</span>
                                <span className="font-bold">{rotationX}°</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="360"
                                value={rotationX}
                                onChange={(e) => setRotationX(parseInt(e.target.value))}
                                className="w-full accent-foreground"
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-[9px] text-text-secondary">ROTATION Y</span>
                                <span className="font-bold">{rotationY}°</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="360"
                                value={rotationY}
                                onChange={(e) => setRotationY(parseInt(e.target.value))}
                                className="w-full accent-foreground"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-card py-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono text-text-secondary">
          <span>&copy; {new Date().getFullYear()} ENTE.PrintLabs. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="#catalog" className="hover:text-foreground transition-colors">Catalog</a>
            <a href="#custom-print" className="hover:text-foreground transition-colors">Custom Print</a>
            <a href="mailto:hello@enteprintlabs.com" className="hover:text-foreground transition-colors">Contact</a>
          </div>
        </div>
      </footer>

      {/* Auth Modal Overlay */}
      {authModal && (
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
      )}

      {/* Catalog Order Modal */}
      {orderProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm border border-border rounded-xl bg-card p-6 relative font-mono text-xs">
            <button 
              onClick={() => setOrderProduct(null)}
              className="absolute top-4 right-4 p-1 rounded-full border border-border hover:bg-background text-foreground transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
            <h3 className="text-[10px] text-blue-500 uppercase tracking-widest mb-1">Direct Checkout</h3>
            <h4 className="text-sm font-bold text-foreground uppercase mb-4">{orderProduct.title}</h4>
            
            <form onSubmit={handleSubmitOrder} className="space-y-4">
              <div className="flex justify-between items-center bg-background/50 border border-border p-3 rounded-lg">
                <span className="text-text-secondary">Unit Rate:</span>
                <span className="font-bold text-foreground">₹ {Number(orderProduct.rate || 0).toFixed(2)}</span>
              </div>

              {/* Quantity selector */}
              <div>
                <label className="block text-[10px] text-text-secondary uppercase mb-1.5">Quantity</label>
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => setOrderQty(Math.max(1, orderQty - 1))}
                    className="w-8 h-8 rounded border border-border flex items-center justify-center text-foreground hover:bg-background/80 active:scale-95 transition-all text-sm font-bold"
                  >
                    -
                  </button>
                  <span className="text-sm font-bold w-12 text-center">{orderQty}</span>
                  <button 
                    type="button"
                    onClick={() => setOrderQty(orderQty + 1)}
                    className="w-8 h-8 rounded border border-border flex items-center justify-center text-foreground hover:bg-background/80 active:scale-95 transition-all text-sm font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Shipping Address */}
              <div>
                <label className="block text-[10px] text-text-secondary uppercase mb-1">Shipping Address</label>
                <textarea 
                  required 
                  rows={3}
                  value={orderAddress}
                  onChange={(e) => setOrderAddress(e.target.value)}
                  placeholder="Enter complete delivery address"
                  className="w-full px-3 py-2 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:border-foreground leading-relaxed"
                />
                
                {/* Save address option */}
                <div className="flex items-center gap-2 mt-2">
                  <input 
                    type="checkbox" 
                    id="save_address_chk"
                    checked={saveAddressToProfile}
                    onChange={(e) => setSaveAddressToProfile(e.target.checked)}
                    className="accent-foreground w-3 h-3 rounded"
                  />
                  <label htmlFor="save_address_chk" className="text-[9px] text-text-secondary uppercase cursor-pointer">
                    Save address to profile
                  </label>
                </div>
              </div>

              {/* Total Summary */}
              <div className="flex justify-between items-center border-t border-border pt-3">
                <span className="text-text-secondary uppercase font-bold text-[10px]">Total Price:</span>
                <span className="text-lg font-bold text-foreground">
                  ₹ {(Number(orderProduct.rate || 0) * orderQty).toFixed(2)}
                </span>
              </div>

              {orderSuccess && (
                <div className="p-2.5 bg-green-500/10 border border-green-500/20 text-green-500 text-[9px] font-bold uppercase rounded flex items-center gap-2">
                  <Check size={12} className="text-green-500" /> Order placed successfully!
                </div>
              )}

              {orderError && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-bold uppercase rounded flex items-center gap-2">
                  <AlertCircle size={12} className="text-red-500" /> {orderError}
                </div>
              )}

              <button 
                type="submit" 
                disabled={submittingOrder}
                className="w-full py-2.5 bg-foreground text-background text-xs font-bold tracking-widest uppercase rounded hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {submittingOrder ? 'Placing Order...' : 'Confirm Order'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
