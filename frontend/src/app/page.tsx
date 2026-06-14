'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/app/AppContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import dynamic from 'next/dynamic';

const STLViewer = dynamic(() => import('@/components/STLViewer'), { ssr: false });
import {
  Check, AlertCircle, X
} from 'lucide-react';
import Link from 'next/link';

// Media URLs come from Cloudflare R2
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

export default function Home() {
  const { user, apiFetch, refreshUser } = useApp();
  

  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);

  // 3D Showcase State
  const [showcaseColor, setShowcaseColor] = useState('#3b82f6');

  // Catalog Products state
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Catalog Order states
  const [orderProduct, setOrderProduct] = useState<CatalogProduct | null>(null);
  const [orderQty, setOrderQty] = useState(1);
  const [orderAddress, setOrderAddress] = useState('');
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(true);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const [heroSettings, setHeroSettings] = useState<Record<string, string>>({
    hero_title1: 'PRECISION 3D PRINTING',
    hero_title2: 'FABRICATED ON DEMAND.',
    hero_description: 'India\'s premier additive manufacturing studio. Browse our catalog of custom-engineered products or submit custom designs for high-fidelity production.',
    hero_price: '',
    hero_model_url: '/models/sample_cube.stl',
    hero_model_color: '#3b82f6'
  });

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (Object.keys(data).length > 0) {
          setHeroSettings(prev => ({ ...prev, ...data }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch settings', err);
    }
  }, []);

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProducts();
    fetchSettings();
  }, [fetchProducts, fetchSettings]);

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
    <div className="min-h-screen flex flex-col font-sans bg-background">
      <Header setAuthModal={setAuthModal} />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center py-20">
            {/* Left Text */}
            <div className="flex flex-col items-start text-left">
              {/* Flagship Product Release Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-red-500/20 bg-red-500/5 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-[10px] font-mono tracking-widest text-red-500 uppercase font-bold">Flagship Product Release</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-foreground uppercase leading-[1.0] mb-6">
                {heroSettings.hero_title1}<br />
                <span className="bg-gradient-to-r from-red-500 via-rose-500 to-orange-500 bg-clip-text text-transparent">
                  {heroSettings.hero_title2}
                </span>
              </h1>
              
              <p className="mt-4 text-base sm:text-lg text-text-secondary max-w-lg font-light leading-relaxed mb-10">
                {heroSettings.hero_description}
              </p>
              
              <div className="flex items-center gap-6">
                {heroSettings.hero_price && heroSettings.hero_price !== '0' && heroSettings.hero_price.trim() !== '' && (
                  <span className="text-3xl font-black text-foreground tracking-tight">₹{heroSettings.hero_price}</span>
                )}
                <Link 
                  href="/#catalog" 
                  className="px-8 py-3.5 bg-foreground text-background text-sm font-bold tracking-widest rounded-lg hover:opacity-90 transition-all shadow-[0_8px_30px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.12)] uppercase"
                >
                  {heroSettings.hero_price && heroSettings.hero_price !== '0' && heroSettings.hero_price.trim() !== '' ? 'BUY NOW' : 'EXPLORE CATALOG'}
                </Link>
              </div>
            </div>

            {/* Right Image */}
            <div className="relative flex justify-center items-center h-full min-h-[400px]">
              {/* Background soft glow mimicking the mockup */}
              <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-[80px] pointer-events-none transition-colors duration-500" 
                style={{
                  backgroundColor: heroSettings.hero_model_color || '#ef4444',
                  opacity: 0.12
                }}
              />
              
              <div className="relative z-10 w-full max-w-[400px] aspect-square transform hover:scale-105 transition-transform duration-700 ease-out cursor-grab active:cursor-grabbing">
                 <STLViewer 
                    fileUrl={heroSettings.hero_model_url}
                    height="100%"
                    modelColor={heroSettings.hero_model_color || "#ef4444"}
                    transparentBg={true}
                    showGrid={false}
                    autoRotate={true}
                 />
              </div>
            </div>
          </div>
        </section>

        {/* Interactive 3D Showcase Section */}
        <section className="py-24 bg-card relative z-20 border-b border-border/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center gap-12">
              {/* Left Text & Controls */}
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-foreground/10 bg-foreground/5 mb-6">
                  <span className="text-[10px] font-mono tracking-widest text-foreground uppercase">Interactive Preview</span>
                </div>
                <h2 className="text-3xl md:text-5xl font-black tracking-tight text-foreground mb-6 leading-tight">
                  Customize Your Print
                </h2>
                <p className="text-lg text-text-secondary max-w-xl font-light leading-relaxed mb-10">
                  Select a material color below to visualize your object instantly. We use high-fidelity filament matching to ensure what you see is what you get.
                </p>

                <div className="flex flex-col gap-4">
                  <span className="text-xs uppercase tracking-widest font-bold text-foreground">Select Material Color</span>
                  <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                    {[
                      { name: 'Azure Blue', hex: '#3b82f6' },
                      { name: 'Industrial Orange', hex: '#f97316' },
                      { name: 'Neon Green', hex: '#22c55e' },
                      { name: 'Crimson Red', hex: '#ef4444' },
                      { name: 'Matte Black', hex: '#171717' },
                      { name: 'Pristine White', hex: '#f8fafc' }
                    ].map((color) => (
                      <button
                        key={color.hex}
                        onClick={() => setShowcaseColor(color.hex)}
                        className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${showcaseColor === color.hex ? 'border-foreground scale-110 shadow-lg' : 'border-transparent shadow-sm'}`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                        aria-label={`Select ${color.name}`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Right 3D Viewer */}
              <div className="flex-1 w-full max-w-[500px] aspect-square relative bg-background rounded-[2rem] border border-border overflow-hidden shadow-2xl flex items-center justify-center cursor-grab active:cursor-grabbing">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full blur-[80px] pointer-events-none opacity-30 transition-colors duration-500" style={{ backgroundColor: showcaseColor }} />
                <STLViewer 
                  fileUrl="/models/sample_cube.stl"
                  height="100%"
                  modelColor={showcaseColor}
                  transparentBg={true}
                  showGrid={false}
                  autoRotate={true}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Product Catalog Showcase */}
        <section id="catalog" className="py-24 bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-12">
              Best Selling Accessories
            </h2>

            {loadingProducts ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="w-full aspect-square rounded bg-card animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-12">
                {products.map((prod, idx) => (
                  <div key={prod.id} className="group relative flex flex-col">
                    <div className="relative w-full aspect-square bg-neutral-100 dark:bg-[#111111] mb-4 overflow-hidden">
                      {idx % 2 === 0 && (
                        <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 dark:bg-black/90 backdrop-blur text-[10px] font-bold text-foreground rounded-full shadow-sm z-10 uppercase tracking-widest border border-border/50">
                          Sale
                        </div>
                      )}
                      
                      <Link href={`/products/${prod.id}`} className="block w-full h-full">
                        {prod.image && prod.image.toLowerCase().endsWith('.stl') ? (
                          <div className="w-full h-full pointer-events-none">
                            <STLViewer 
                              fileUrl={prod.image.startsWith('http') ? prod.image : (prod.image.startsWith('/') ? prod.image : `${R2_BASE}${prod.image}`)}
                              height="100%"
                              transparentBg={true}
                              showGrid={false}
                              autoRotate={true}
                              modelColor={idx % 2 === 0 ? "#f97316" : "#3b82f6"}
                            />
                          </div>
                        ) : (
                          <img 
                            // eslint-disable-next-line @next/next/no-img-element
                            src={prod.image ? (prod.image.startsWith('http') ? prod.image : `${R2_BASE}${prod.image}`) : 'https://placehold.co/400x400/e2e8f0/a0aec0?text=No+Image'}
                            alt={prod.title} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        )}
                      </Link>
                    </div>
                    
                    <div className="flex flex-col items-start px-1 flex-grow">
                      <Link href={`/products/${prod.id}`} className="hover:text-blue-500 transition-colors w-full">
                        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 mb-1">{prod.title}</h3>
                      </Link>
                      
                      <div className="flex items-center gap-2 mt-auto pt-1">
                        <span className="text-[11px] font-bold text-text-secondary">
                          Rs. {Number(prod.rate || 0).toFixed(2)}
                        </span>
                        {idx % 2 === 0 && (
                          <span className="text-[10px] text-text-secondary/50 line-through">
                            Rs. {(Number(prod.rate || 0) * 1.5).toFixed(2)}
                          </span>
                        )}
                      </div>

                      <button 
                        onClick={() => handleOpenOrder(prod)}
                        className="mt-3 text-[10px] font-bold uppercase tracking-widest text-foreground underline decoration-border hover:decoration-foreground underline-offset-4 transition-all"
                      >
                        Quick Buy
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
      <AuthModal authModal={authModal} setAuthModal={setAuthModal} />

      {/* Catalog Order Modal */}
      {orderProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm border border-border rounded-xl bg-card p-6 relative font-mono text-xs shadow-2xl">
            <button 
              onClick={() => setOrderProduct(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full border border-border hover:bg-background text-foreground transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
            <h3 className="text-[10px] text-blue-500 uppercase tracking-widest mb-1">Direct Checkout</h3>
            <h4 className="text-sm font-bold text-foreground uppercase mb-4 pr-6">{orderProduct.title}</h4>
            
            <form onSubmit={handleSubmitOrder} className="space-y-4">
              <div className="flex justify-between items-center bg-background/50 border border-border p-3 rounded-lg">
                <span className="text-text-secondary">Unit Rate:</span>
                <span className="font-bold text-foreground">₹ {Number(orderProduct.rate || 0).toLocaleString()}</span>
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
                  ₹ {(Number(orderProduct.rate || 0) * orderQty).toLocaleString()}
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
                className="w-full py-3 bg-foreground text-background text-xs font-bold tracking-widest uppercase rounded hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-lg"
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
