'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/app/AppContext';
import { X, Trash2, Plus, Minus, ShoppingBag, Check, AlertCircle } from 'lucide-react';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  setAuthModal: (modal: 'login' | 'register' | null) => void;
}

export default function CartModal({ isOpen, onClose, setAuthModal }: CartModalProps) {
  const { user, cart, updateCartQty, removeFromCart, clearCart, apiFetch, refreshUser } = useApp();
  const [address, setAddress] = useState('');
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.address) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAddress(user.address);
    }
  }, [user]);

  if (!isOpen) return null;

  const subtotal = cart.reduce((acc, item) => acc + item.rate * item.quantity, 0);

  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onClose();
      setAuthModal('login');
      return;
    }
    if (cart.length === 0) return;
    if (!address.trim()) {
      setError('Shipping address is required.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      if (saveAddressToProfile && address !== user.address) {
        await apiFetch('/auth/profile/', {
          method: 'PATCH',
          body: JSON.stringify({ address })
        });
        await refreshUser();
      }

      // Place order for each item in the cart
      const orderPromises = cart.map(item => 
        apiFetch('/orders/', {
          method: 'POST',
          body: JSON.stringify({
            product: item.productId,
            quantity: item.quantity,
            shipping_address: address,
            color: item.colorName
          })
        })
      );

      const responses = await Promise.all(orderPromises);
      const allSuccessful = responses.every(res => res.ok);

      if (allSuccessful) {
        setSuccess(true);
        clearCart();
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 2000);
      } else {
        setError('Failed to complete some orders. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error processing checkout.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md h-full bg-card border-l border-border flex flex-col relative shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-foreground" />
            <h2 className="text-sm font-bold tracking-widest uppercase font-mono text-foreground">Shopping Cart</h2>
            <span className="bg-foreground/10 text-foreground px-2 py-0.5 rounded-full text-[10px] font-bold font-mono">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full border border-border hover:bg-background text-foreground transition-colors cursor-pointer"
            aria-label="Close cart"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
              <ShoppingBag size={36} className="text-text-secondary/35 animate-bounce" />
              <p className="text-xs font-mono text-text-secondary uppercase tracking-wider">Your cart is empty.</p>
              <button 
                onClick={onClose}
                className="px-6 py-2.5 bg-foreground text-background text-xs font-bold font-mono uppercase rounded hover:opacity-90 transition-opacity"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item, index) => (
                <div key={`${item.productId}-${item.colorName || 'default'}-${index}`} className="flex gap-4 p-4 border border-border rounded-xl bg-background/40">
                  {/* Thumbnails */}
                  <div className="w-16 h-16 rounded-lg bg-neutral-100 dark:bg-neutral-900 overflow-hidden flex items-center justify-center shrink-0 border border-border">
                    {item.productImage.toLowerCase().endsWith('.stl') ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-cyan-950/15">
                        <span className="text-cyan-500 font-bold text-[8px] uppercase tracking-wider text-center">3D<br/>STL</span>
                      </div>
                    ) : (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={item.productImage} alt={item.productTitle} className="w-full h-full object-contain" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground line-clamp-1">{item.productTitle}</h4>
                      {item.colorName && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[9px] font-mono text-text-secondary uppercase">Color:</span>
                          <span className="w-2.5 h-2.5 rounded-full border border-border/50" style={{ backgroundColor: item.colorHex || '#ccc' }} />
                          <span className="text-[9px] font-mono text-foreground font-bold uppercase">{item.colorName}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center border border-border rounded-lg overflow-hidden bg-background">
                        <button 
                          onClick={() => updateCartQty(item.productId, item.colorName, item.quantity - 1)}
                          className="px-2 py-1 text-foreground hover:bg-foreground/5 transition-colors"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="px-2.5 text-[11px] font-bold font-mono text-foreground">{item.quantity}</span>
                        <button 
                          onClick={() => updateCartQty(item.productId, item.colorName, item.quantity + 1)}
                          className="px-2 py-1 text-foreground hover:bg-foreground/5 transition-colors"
                        >
                          <Plus size={10} />
                        </button>
                      </div>

                      <span className="text-xs font-bold text-foreground font-mono">
                        ₹ {(item.rate * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button 
                    onClick={() => removeFromCart(item.productId, item.colorName)}
                    className="text-text-secondary/50 hover:text-red-500 transition-colors self-start cursor-pointer"
                    aria-label="Remove item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Checkout Summary */}
        {cart.length > 0 && (
          <div className="border-t border-border p-6 bg-card space-y-4">
            <div className="flex justify-between items-baseline font-mono">
              <span className="text-xs text-text-secondary uppercase tracking-widest">Subtotal:</span>
              <span className="text-lg font-black text-foreground">₹ {subtotal.toFixed(2)}</span>
            </div>

            <form onSubmit={handleSubmitCheckout} className="space-y-4">
              <div>
                <label className="block text-[10px] text-text-secondary font-mono uppercase mb-1">Delivery Address</label>
                <textarea 
                  required 
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter complete shipping address"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:border-foreground leading-relaxed font-mono"
                />
                
                <div className="flex items-center gap-2 mt-2">
                  <input 
                    type="checkbox" 
                    id="cart_save_address"
                    checked={saveAddressToProfile}
                    onChange={(e) => setSaveAddressToProfile(e.target.checked)}
                    className="accent-foreground w-3 h-3 rounded"
                  />
                  <label htmlFor="cart_save_address" className="text-[9px] font-mono text-text-secondary uppercase cursor-pointer">
                    Save address to profile
                  </label>
                </div>
              </div>

              {success && (
                <div className="p-2.5 bg-green-500/10 border border-green-500/20 text-green-500 text-[9px] font-bold uppercase rounded-lg flex items-center gap-2 font-mono">
                  <Check size={12} className="text-green-500" /> All orders placed successfully!
                </div>
              )}

              {error && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-bold uppercase rounded-lg flex items-center gap-2 font-mono">
                  <AlertCircle size={12} className="text-red-500" /> {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-foreground text-background text-xs font-black tracking-widest uppercase rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-lg font-mono"
              >
                {submitting ? 'Placing Orders...' : user ? 'Checkout & Place Orders' : 'Login to Checkout'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
