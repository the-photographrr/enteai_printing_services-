'use client';

export const runtime = 'edge';

import React, { useState, useEffect, use, useCallback } from 'react';
import { useApp } from '../../AppContext';
import {
  Check, AlertCircle, ChevronRight, ChevronLeft,
  Heart, ShoppingBag, X,
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';

const STLViewer = dynamic(() => import('@/components/STLViewer'), { ssr: false });



const COLORS = [
  { name: 'Red',    hex: '#ef4444' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'White',  hex: '#ffffff' },
  { name: 'Black',  hex: '#1a1a1a' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Green',  hex: '#22c55e' },
];


interface ProductDetail {
  id: number;
  title: string;
  description: string;
  category: string;
  rate: string | number;
  image?: string;
  media?: string[];
  status: string;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, apiFetch, refreshUser, addToCart } = useApp();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [quantity, setQuantity] = useState(1);
  const [activeThumbnailIdx, setActiveThumbnailIdx] = useState(0);

  // Checkout modal states
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutAddress, setCheckoutAddress] = useState('');
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(true);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Auth & Cart states
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);
  const [cartAddedSuccess, setCartAddedSuccess] = useState(false);

  // Reassurance block data
  const reassuranceData = [
    {
      title: 'Free Shipping',
      desc: 'Free shipping on all Prepaid Orders',
      icon: (
        <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      )
    },
    {
      title: 'Secure Payments',
      desc: 'Pay via UPI, Cards, Wallets, EMI & Net Banking',
      icon: (
        <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      title: '7-Day Easy Returns',
      desc: 'Shop with confidence',
      icon: (
        <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3 3L22 4" />
        </svg>
      )
    }
  ];

  const fetchProductDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
      }
    } catch (err) {
      console.error('Failed to fetch product details', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchProductDetail();
    });
  }, [fetchProductDetail]);

  const handleAddToCart = () => {
    if (!product) return;
    const isProductSTL = product.media?.some(m => m.toLowerCase().endsWith('.stl')) || product.image?.toLowerCase().endsWith('.stl');
    addToCart({
      productId: product.id,
      productTitle: product.title,
      productImage: product.image || (product.media && product.media[0]) || '',
      rate: Number(product.rate || 0),
      colorName: isProductSTL ? selectedColor.name : undefined,
      colorHex: isProductSTL ? selectedColor.hex : undefined
    }, quantity);
    setCartAddedSuccess(true);
    setTimeout(() => setCartAddedSuccess(false), 2000);
  };

  const handleOpenCheckout = () => {
    if (!user) {
      setAuthModal('login');
      return;
    }
    setCheckoutAddress(user.address || '');
    setCheckoutModalOpen(true);
    setOrderSuccess(false);
    setOrderError('');
  };

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !product) return;

    if (!checkoutAddress.trim()) {
      setOrderError('Delivery address is required.');
      return;
    }

    setSubmittingOrder(true);
    setOrderError('');
    setOrderSuccess(false);

    try {
      if (saveAddressToProfile && checkoutAddress !== user.address) {
        await apiFetch('/auth/profile/', {
          method: 'PATCH',
          body: JSON.stringify({ address: checkoutAddress })
        });
        await refreshUser();
      }

      const payload = {
        product: product.id,
        quantity: quantity,
        shipping_address: checkoutAddress,
        color: product.media?.some(m => m.toLowerCase().endsWith('.stl')) || product.image?.toLowerCase().endsWith('.stl')
          ? selectedColor.name
          : undefined
      };

      const res = await apiFetch('/orders/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setOrderSuccess(true);
        setTimeout(() => {
          setOrderSuccess(false);
          setCheckoutModalOpen(false);
        }, 2000);
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



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="w-8 h-8 rounded-full border-2 border-foreground border-t-transparent animate-spin"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
        <h1 className="text-xl font-bold uppercase tracking-widest mb-4">Product Not Found</h1>
        <Link href="/" className="px-6 py-2.5 bg-foreground text-background text-xs font-mono uppercase rounded">
          Return to Catalog
        </Link>
      </div>
    );
  }

  const mediaList = product.media && product.media.length > 0 
    ? product.media 
    : (product.image ? [product.image] : []);

  const activeMediaUrl = mediaList[activeThumbnailIdx] || mediaList[0] || '';
  const isSTL = activeMediaUrl.toLowerCase().endsWith('.stl');

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300">
      

      <Header setAuthModal={setAuthModal} />


      {/* Main product area */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[10px] font-mono text-text-secondary uppercase tracking-widest mb-8">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <span>/</span>
          <Link href="/#catalog" className="hover:text-foreground transition-colors">Catalog</Link>
          <span>/</span>
          <span className="text-foreground truncate max-w-[180px]">{product.title}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          
          {/* Left Column: Product Gallery */}
          <div className="lg:col-span-8 flex flex-col-reverse md:flex-row gap-4">
            
            {/* Gallery Thumbnail Bar - positioned next to image */}
            {mediaList.length > 1 && (
              <div className="flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-x-visible no-scrollbar py-2 md:py-0 select-none justify-start">
                {mediaList.map((mediaItem, idx) => {
                  const isActive = activeThumbnailIdx === idx;
                  const isThumbSTL = mediaItem.toLowerCase().endsWith('.stl');
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveThumbnailIdx(idx)}
                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl border-2 flex-shrink-0 bg-neutral-50 dark:bg-[#111111] overflow-hidden p-1 transition-all ${
                        isActive ? 'border-foreground scale-105 shadow-sm' : 'border-border hover:border-text-secondary'
                      }`}
                    >
                      {isThumbSTL ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-cyan-950/10">
                          <span className="text-cyan-500 font-bold text-[8px] uppercase tracking-wider text-center">3D<br/>STL</span>
                        </div>
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img 
                          src={mediaItem} 
                          alt={`Thumbnail ${idx}`} 
                          className="w-full h-full object-cover rounded-lg"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Main Image Slider Screen */}
            <div className="flex-grow relative aspect-square rounded-3xl border border-border bg-neutral-50 dark:bg-[#0c0c0c] overflow-hidden flex items-center justify-center group shadow-sm">
              {isSTL ? (
                <div className="w-full h-full">
                  <STLViewer 
                    fileUrl={activeMediaUrl}
                    height="100%"
                    transparentBg={true}
                    showGrid={true}
                    autoRotate={true}
                    modelColor={selectedColor.hex}
                  />
                </div>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={activeMediaUrl} 
                    alt={product.title} 
                    className="w-[85%] h-[85%] object-contain product-image-transition"
                  />
                  
                  {/* Carousel Arrows */}
                  {mediaList.length > 1 && (
                    <>
                      <button 
                        onClick={() => setActiveThumbnailIdx(prev => (prev === 0 ? mediaList.length - 1 : prev - 1))}
                        className="absolute left-4 w-10 h-10 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center text-foreground hover:scale-105 active:scale-95 transition-all opacity-0 group-hover:opacity-100 border border-border/10 cursor-pointer"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button 
                        onClick={() => setActiveThumbnailIdx(prev => (prev === mediaList.length - 1 ? 0 : prev + 1))}
                        className="absolute right-4 w-10 h-10 rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center text-foreground hover:scale-105 active:scale-95 transition-all opacity-0 group-hover:opacity-100 border border-border/10 cursor-pointer"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </>
                  )}
                </>
              )}

              {/* Heart Button Overlay */}
              <button className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/90 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center text-foreground border border-border/10 hover:scale-105 transition-all">
                <Heart size={18} className="text-foreground/80 hover:text-red-500 hover:fill-red-500 transition-all" />
              </button>
            </div>

          </div>

          {/* Right Column: Product details */}
          <div className="lg:col-span-4 space-y-6">
            {/* Category pill + title */}
            <div className="space-y-3">
              <span className="inline-block text-[10px] uppercase font-bold tracking-widest text-foreground bg-foreground/8 dark:bg-foreground/10 px-3 py-1 rounded-full border border-border">
                {product.category}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight tracking-tight">
                {product.title}
              </h1>
            </div>

            {/* Price */}
            <div className="py-4 border-t border-b border-border">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-foreground tracking-tight">
                  ₹{product.rate ? Number(product.rate).toFixed(2) : '0.00'}
                </span>
                <span className="text-[10px] text-text-secondary font-mono uppercase">incl. taxes</span>
              </div>
            </div>

            {/* Color swatches — only shown when viewing an STL model */}
            {isSTL && (
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary font-mono">
                Color — <span className="text-foreground">{selectedColor.name}</span>
              </p>
              <div className="flex flex-wrap gap-2.5">
                {COLORS.map((color) => {
                  const isSelected = selectedColor.name === color.name;
                  return (
                    <button
                      key={color.name}
                      onClick={() => {
                        setSelectedColor(color);
                      }}
                      title={color.name}
                      className={`w-8 h-8 rounded-full transition-all border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-foreground ring-2 ring-foreground/25 ring-offset-2 ring-offset-background scale-110'
                          : 'border-border/60 hover:scale-105 hover:border-foreground/40'
                      }`}
                      style={{ backgroundColor: color.hex }}
                    >
                      {isSelected && (
                        <Check size={12} className={color.name === 'White' ? 'text-black' : 'text-white'} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            )}

            {/* Quantity + CTA */}
            <div className="space-y-3 pt-2">
              <div className="flex gap-3">
                {/* Quantity stepper */}
                <div className="flex border border-border rounded-xl overflow-hidden bg-card shrink-0 h-11">
                  <button
                    onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                    className="px-4 font-bold text-foreground hover:bg-foreground/5 text-sm transition-colors"
                  >−</button>
                  <span className="w-12 flex items-center justify-center font-bold text-foreground text-sm select-none border-x border-border">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(prev => prev + 1)}
                    className="px-4 font-bold text-foreground hover:bg-foreground/5 text-sm transition-colors"
                  >+</button>
                </div>
                 {/* Add to cart */}
                <button
                  onClick={handleAddToCart}
                  className={`flex-grow h-11 border text-xs font-bold tracking-widest uppercase rounded-xl active:scale-[.98] transition-all flex items-center justify-center gap-2 ${
                    cartAddedSuccess 
                      ? 'bg-green-600 border-green-600 text-white' 
                      : 'bg-foreground/8 dark:bg-foreground/10 text-foreground border-border hover:bg-foreground/15'
                  }`}
                >
                  {cartAddedSuccess ? (
                    <>
                      <Check size={14} /> Added!
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={14} /> Add to Cart
                    </>
                  )}
                </button>
              </div>
              {/* Buy now — primary CTA */}
              <button
                onClick={handleOpenCheckout}
                className="w-full h-12 bg-foreground text-background text-xs font-black tracking-widest uppercase rounded-xl hover:opacity-90 active:scale-[.98] transition-all shadow-sm"
              >
                Buy it Now
              </button>
            </div>

            {/* Specs */}
            <div className="pt-4 border-t border-border space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-secondary font-mono">Print Specifications</p>
              <div className="rounded-xl border border-border overflow-hidden font-mono text-[11px]">
                {[
                  ['Material Build', `${selectedColor.name} — Industrial FDM`],
                  ['Layer Resolution', '0.15 mm · High Precision'],
                  ['Standard Infill',  '25% Gyroid'],
                ].map(([label, value], i, arr) => (
                  <div key={label} className={`flex justify-between items-center px-4 py-3 ${
                    i < arr.length - 1 ? 'border-b border-border' : ''
                  } bg-card`}>
                    <span className="text-text-secondary uppercase tracking-wide">{label}</span>
                    <span className="text-foreground font-bold text-right">{value}</span>
                  </div>
                ))}
              </div>
              {product.description && (
                <p className="text-[11px] text-text-secondary font-mono leading-relaxed pt-1">
                  {product.description}
                </p>
              )}
            </div>

          </div>
        </div>


        {/* Reassurance Block */}
        <section className="mt-12 pt-10 border-t border-border grid grid-cols-1 md:grid-cols-3 gap-4">
          {reassuranceData.map((item, idx) => (
            <div
              key={idx}
              className="border border-border rounded-2xl p-5 bg-card flex items-center gap-4 transition-all hover:shadow-sm hover:border-foreground/20"
            >
              <div className="w-9 h-9 rounded-lg bg-foreground/5 dark:bg-foreground/10 border border-border flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div className="space-y-0.5">
                <h3 className="text-[11px] font-bold text-foreground uppercase tracking-wide font-mono">{item.title}</h3>
                <p className="text-[10px] text-text-secondary font-mono leading-snug">{item.desc}</p>
              </div>
            </div>
          ))}
        </section>

      </main>

      <Footer />

      <AuthModal authModal={authModal} setAuthModal={setAuthModal} />

      {/* Catalog Order Modal */}
      {checkoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm border border-border rounded-xl bg-card p-6 relative font-mono text-xs">
            <button 
              onClick={() => setCheckoutModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full border border-border hover:bg-background text-foreground transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
            <h3 className="text-[10px] text-accent uppercase tracking-widest mb-1">Direct Checkout</h3>
            <h4 className="text-sm font-bold text-foreground uppercase mb-4">{product.title}</h4>
            
            <form onSubmit={handleSubmitCheckout} className="space-y-4">
              <div className="flex justify-between items-center bg-background/50 border border-border p-3 rounded-lg">
                <span className="text-text-secondary">Selected Color:</span>
                <span className="font-bold text-foreground uppercase">{selectedColor.name}</span>
              </div>

              <div className="flex justify-between items-center bg-background/50 border border-border p-3 rounded-lg">
                <span className="text-text-secondary">Unit Rate:</span>
                <span className="font-bold text-foreground">₹ {Number(product.rate || 0).toFixed(2)}</span>
              </div>

              <div>
                <label className="block text-[10px] text-text-secondary uppercase mb-1">Quantity</label>
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 rounded border border-border flex items-center justify-center text-foreground hover:bg-background/80 active:scale-95 transition-all text-sm font-bold"
                  >
                    -
                  </button>
                  <span className="text-sm font-bold w-12 text-center">{quantity}</span>
                  <button 
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
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
                  value={checkoutAddress}
                  onChange={(e) => setCheckoutAddress(e.target.value)}
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
              <div className="flex justify-between items-center border-t border-border pt-3 font-sans">
                <span className="text-text-secondary uppercase font-bold text-[10px] font-mono">Total Price:</span>
                <span className="text-lg font-black text-foreground">
                  ₹ {(Number(product.rate || 0) * quantity).toFixed(2)}
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
                className="w-full py-2.5 bg-foreground text-background text-xs font-bold tracking-widest uppercase rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
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
