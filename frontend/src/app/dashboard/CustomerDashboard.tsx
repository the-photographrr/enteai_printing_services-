'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useApp } from '../AppContext';
import STLViewer from '../../components/STLViewer';
import { 
  FileText, Check, X, Clock, Settings, RefreshCw, 
  CreditCard, CheckCircle2, AlertTriangle, Upload, ShoppingBag
} from 'lucide-react';

interface CustomRequest {
  id: number;
  project_name: string;
  required_delivery_date: string;
  status: string;
  dimensions: string;
  material_preference: string;
  color_preference: string;
  infill?: string;
  quantity: number;
  description: string;
  shipping_carrier?: string;
  tracking_number?: string;
  files?: Array<{ file: string; volume_cm3?: number }>;
  quotation?: {
    id: number;
    material_cost: number;
    machine_cost: number;
    post_processing_cost: number;
    packaging_cost: number;
    estimated_production_hours: number;
    total_price: number;
    validity_date: string;
    status: string;
  };
}

interface CatalogOrder {
  id: number;
  product_title: string;
  quantity: number;
  status: string;
  product_rate?: string;
  total_price?: string;
  shipping_address: string;
  shipping_carrier?: string;
  tracking_number?: string;
  created_at: string;
}

export default function CustomerDashboard() {
  const { user, apiFetch, refreshUser } = useApp();
  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [orders, setOrders] = useState<CatalogOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRequest, setActiveRequest] = useState<CustomRequest | null>(null);
  const [activeOrder, setActiveOrder] = useState<CatalogOrder | null>(null);
  const [activeTab, setActiveTab] = useState<'requests' | 'orders' | 'profile'>('requests');

  // Profile update state
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [profileAddress, setProfileAddress] = useState(user?.address || '');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Payment upload states
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      const [reqRes, ordRes] = await Promise.all([
        apiFetch('/requests/'),
        apiFetch('/orders/')
      ]);
      if (reqRes.ok) {
        const reqData = await reqRes.json();
        setRequests(reqData);
        if (reqData.length > 0) {
          setActiveRequest(reqData[0]);
        }
      }
      if (ordRes.ok) {
        const ordData = await ordRes.json();
        setOrders(ordData);
        if (ordData.length > 0) {
          setActiveOrder(ordData[0]);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    Promise.resolve().then(() => {
      fetchUserData();
    });
  }, [fetchUserData]);

  useEffect(() => {
    if (user) {
      Promise.resolve().then(() => {
        setProfilePhone(user.phone || '');
        setProfileAddress(user.address || '');
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    try {
      setUpdatingProfile(true);
      setProfileSuccess(false);
      const res = await apiFetch('/auth/profile/', {
        method: 'PATCH',
        body: JSON.stringify({
          phone: profilePhone,
          address: profileAddress
        })
      });
      if (res.ok) {
        setProfileSuccess(true);
        await refreshUser();
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleAcceptQuote = async (quoteId: number) => {
    try {
      const res = await apiFetch(`/quotations/${quoteId}/accept/`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchUserData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectQuote = async (quoteId: number) => {
    try {
      const res = await apiFetch(`/quotations/${quoteId}/reject/`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchUserData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePaymentUpload = async (e: React.FormEvent, reqId: number) => {
    e.preventDefault();
    if (!paymentFile) return;

    setSubmittingPayment(true);
    setPaymentError('');
    setPaymentSuccess(false);

    const formData = new FormData();
    formData.append('payment_receipt', paymentFile);
    formData.append('payment_status', 'Submitted');

    try {
      const res = await apiFetch(`/requests/${reqId}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          description: `${activeRequest.description}\n\n[PAYMENT UPLOADED: Verified offline transaction screenshot.]`
        })
      });

      if (res.ok) {
        setPaymentSuccess(true);
        setPaymentFile(null);
        fetchUserData();
      } else {
        setPaymentError('Failed to log payment.');
      }
    } catch (err) {
      console.error(err);
      setPaymentError('Network error uploading payment receipt.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const getRequestStatusBadge = (status: string) => {
    switch(status) {
      case 'New Request': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'Under Review': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      case 'Quote Generated': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'Quote Accepted': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'Rejected': return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'Completed': return 'text-green-600 bg-green-600/15 border-green-600/25';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch(status) {
      case 'Pending': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'Processing': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
      case 'Shipped': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      case 'Delivered': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'Cancelled': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center p-12">
        <div className="w-8 h-8 rounded-full border-2 border-foreground border-t-transparent animate-spin mb-2"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
      {/* Header section with tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold uppercase tracking-wider text-foreground">Customer Workspace</h1>
          <p className="text-xs text-text-secondary font-mono mt-1">Manage print requests, track catalog orders, and update shipping settings.</p>
        </div>
        <div className="flex border border-border rounded-lg p-0.5 bg-background font-mono text-[10px]">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 uppercase font-bold tracking-wider rounded transition-colors flex items-center gap-2 ${
              activeTab === 'requests' ? 'bg-card text-foreground' : 'text-text-secondary hover:text-foreground'
            }`}
          >
            <FileText size={12} /> Custom Requests
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 uppercase font-bold tracking-wider rounded transition-colors flex items-center gap-2 ${
              activeTab === 'orders' ? 'bg-card text-foreground' : 'text-text-secondary hover:text-foreground'
            }`}
          >
            <ShoppingBag size={12} /> Catalog Orders
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 uppercase font-bold tracking-wider rounded transition-colors flex items-center gap-2 ${
              activeTab === 'profile' ? 'bg-card text-foreground' : 'text-text-secondary hover:text-foreground'
            }`}
          >
            <Settings size={12} /> Profile Settings
          </button>
        </div>
      </div>

      {activeTab === 'requests' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
          {/* Left panel: Request list */}
          <div className="lg:col-span-1 space-y-6">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <h2 className="text-sm font-mono uppercase tracking-widest text-text-secondary">Your Custom Requests</h2>
              <button 
                onClick={fetchUserData}
                className="p-1 border border-border rounded hover:bg-card text-foreground transition-colors"
              >
                <RefreshCw size={12} />
              </button>
            </div>

            {requests.length === 0 ? (
              <div className="border border-border border-dashed rounded-lg p-12 text-center bg-card/50">
                <p className="text-xs text-text-secondary font-mono">No requests submitted yet.</p>
                <Link href="/#custom-print" className="mt-4 inline-block px-4 py-2 bg-foreground text-background text-[10px] font-mono tracking-wider uppercase rounded">
                  Create First Request
                </Link>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {requests.map((req) => (
                  <button
                    key={req.id}
                    onClick={() => { setActiveRequest(req); setPaymentSuccess(false); setPaymentError(''); }}
                    className={`w-full text-left p-4 rounded-lg border font-mono transition-all flex flex-col gap-2 ${
                      activeRequest?.id === req.id 
                        ? 'border-foreground bg-card' 
                        : 'border-border bg-card/40 hover:border-text-secondary'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-xs font-bold text-foreground truncate uppercase">{req.project_name}</span>
                      <span className="text-[9px] text-text-secondary">#{req.id}</span>
                    </div>
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[10px] text-text-secondary">{req.required_delivery_date}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] border font-bold uppercase tracking-wider ${getRequestStatusBadge(req.status)}`}>
                        {req.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right panel: Active Request Details */}
          <div className="lg:col-span-2">
            {activeRequest ? (
              <div className="border border-border rounded-xl p-6 bg-card space-y-8 font-mono">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
                  <div>
                    <span className="text-[10px] text-text-secondary uppercase">Project Details</span>
                    <h3 className="text-lg font-bold text-foreground uppercase mt-1">{activeRequest.project_name}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded text-xs border font-bold uppercase tracking-wider ${getRequestStatusBadge(activeRequest.status)}`}>
                    {activeRequest.status}
                  </span>
                </div>

                {activeRequest.files && activeRequest.files.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] text-text-secondary uppercase tracking-widest">[ 3D Model View ]</span>
                    <STLViewer 
                      fileUrl={activeRequest.files[0].file}
                      height="300px" 
                    />
                    <span className="text-[9px] text-text-secondary block">
                      Volume: {activeRequest.files[0].volume_cm3 ? `${activeRequest.files[0].volume_cm3} cm³` : 'Processing...'}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 bg-background/50 border border-border p-4 rounded-lg text-xs">
                  <div>
                    <span className="text-[10px] text-text-secondary uppercase block mb-1">Dimensions</span>
                    <span className="text-foreground font-bold">{activeRequest.dimensions}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary uppercase block mb-1">Material Preference</span>
                    <span className="text-foreground font-bold">{activeRequest.material_preference}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary uppercase block mb-1">Color</span>
                    <span className="text-foreground font-bold">{activeRequest.color_preference}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary uppercase block mb-1">Infill</span>
                    <span className="text-foreground font-bold">{activeRequest.infill || '20%'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary uppercase block mb-1">Quantity</span>
                    <span className="text-foreground font-bold">{activeRequest.quantity} units</span>
                  </div>
                </div>

                {(activeRequest.shipping_carrier || activeRequest.tracking_number) && (
                  <div className="space-y-2 bg-purple-500/5 border border-purple-500/10 p-4 rounded-lg">
                    <span className="text-[10px] text-purple-500 uppercase tracking-widest block font-bold">[ Delivery Tracking ]</span>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <span className="text-[9px] text-text-secondary uppercase">Carrier / Service Provider</span>
                        <p className="text-foreground font-bold">{activeRequest.shipping_carrier || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-text-secondary uppercase">Tracking ID / Number</span>
                        <p className="text-foreground font-bold">{activeRequest.tracking_number || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <span className="text-[10px] text-text-secondary uppercase tracking-widest">[ Requirements ]</span>
                  <p className="text-xs text-foreground bg-background/30 border border-border p-3 rounded leading-relaxed whitespace-pre-line">
                    {activeRequest.description}
                  </p>
                </div>

                {activeRequest.quotation ? (
                  <div className="border border-border rounded-lg p-6 bg-background/40 space-y-6">
                    <div className="flex justify-between items-center border-b border-border pb-4">
                      <h4 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
                        <FileText size={14} /> Quotation Generated
                      </h4>
                      <span className="text-[10px] text-text-secondary">Valid until: {activeRequest.quotation.validity_date}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Material Cost:</span>
                          <span className="text-foreground font-bold">₹ {activeRequest.quotation.material_cost}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Machine runtime:</span>
                          <span className="text-foreground font-bold">₹ {activeRequest.quotation.machine_cost}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Post processing:</span>
                          <span className="text-foreground font-bold">₹ {activeRequest.quotation.post_processing_cost}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-text-secondary">Packaging & Logistics:</span>
                          <span className="text-foreground font-bold">₹ {activeRequest.quotation.packaging_cost}</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-2">
                          <span className="text-foreground font-bold uppercase">Estimated Time:</span>
                          <span className="text-foreground font-bold">{activeRequest.quotation.estimated_production_hours} hours</span>
                        </div>
                      </div>

                      <div className="flex flex-col justify-center items-center bg-foreground/5 dark:bg-foreground/10 p-4 border border-border rounded-lg text-center">
                        <span className="text-[10px] text-text-secondary uppercase">Total Price</span>
                        <span className="text-2xl font-bold text-foreground mt-1">₹ {activeRequest.quotation.total_price}</span>
                        <span className="text-[8px] text-text-secondary uppercase mt-1">Including profit margin</span>
                      </div>
                    </div>

                    {activeRequest.quotation.status === 'Pending' && (
                      <div className="flex gap-4 pt-4 border-t border-border">
                        <button
                          onClick={() => handleRejectQuote(activeRequest.quotation.id)}
                          className="flex-1 py-2.5 border border-red-500/20 hover:border-red-500/50 text-red-500 text-xs font-bold uppercase rounded transition-colors flex items-center justify-center gap-2"
                        >
                          <X size={14} /> Reject Quotation
                        </button>
                        <button
                          onClick={() => handleAcceptQuote(activeRequest.quotation.id)}
                          className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold uppercase rounded transition-colors flex items-center justify-center gap-2"
                        >
                          <Check size={14} /> Accept & Start Production
                        </button>
                      </div>
                    )}

                    {activeRequest.quotation.status === 'Accepted' && (
                      <div className="border border-dashed border-border rounded-lg p-6 bg-card space-y-6">
                        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                          <CreditCard size={14} className="text-blue-500" />
                          <span>Offline UPI Payment Process</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                          <div className="space-y-2 text-xs text-text-secondary">
                            <p>1. Scan the QR Code using any UPI App.</p>
                            <p>2. Complete the transaction of <strong>₹ {activeRequest.quotation.total_price}</strong>.</p>
                            <p>3. Upload a screenshot of the transaction receipt below for admin verification.</p>
                          </div>

                          <div className="flex flex-col items-center bg-white p-3 rounded-lg border border-border w-fit mx-auto">
                            <div className="w-32 h-32 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-700 via-gray-950 to-black rounded flex items-center justify-center text-white p-4 text-center">
                              <span className="text-[8px] font-mono uppercase tracking-wider">UPI ID:<br/>ente@upi</span>
                            </div>
                            <span className="text-[9px] text-gray-500 mt-2 font-bold uppercase tracking-wider">Scan to Pay</span>
                          </div>
                        </div>

                        <form onSubmit={(e) => handlePaymentUpload(e, activeRequest.id)} className="space-y-4 pt-4 border-t border-border">
                          <div className="flex flex-col sm:flex-row items-center gap-4">
                            <input 
                              type="file" 
                              required
                              accept="image/*"
                              onChange={(e) => setPaymentFile(e.target.files ? e.target.files[0] : null)}
                              className="text-xs font-mono text-text-secondary file:mr-4 file:py-1.5 file:px-3 file:rounded file:border file:border-border file:bg-card file:text-foreground file:text-xs file:font-mono cursor-pointer flex-grow"
                            />
                            <button
                              type="submit"
                              disabled={submittingPayment}
                              className="px-6 py-2 bg-foreground text-background text-xs font-bold uppercase rounded hover:opacity-90 transition-opacity flex items-center gap-2 w-full sm:w-auto justify-center"
                            >
                              <Upload size={14} /> Upload Screenshot
                            </button>
                          </div>

                          {paymentSuccess && (
                            <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-500 text-xs rounded flex items-center gap-2">
                              <CheckCircle2 size={14} />
                              <span>Screenshot uploaded. Admin will verify your payment offline.</span>
                            </div>
                          )}

                          {paymentError && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded flex items-center gap-2">
                              <AlertTriangle size={14} />
                              <span>{paymentError}</span>
                            </div>
                          )}
                        </form>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="border border-border border-dashed rounded-lg p-6 bg-background/40 text-center text-xs text-text-secondary">
                    <Clock className="mx-auto mb-2 text-text-secondary animate-pulse" size={16} />
                    <span>Quotation is currently under review by production administrators.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="border border-border rounded-xl p-12 bg-card text-center text-xs text-text-secondary font-mono">
                Select a custom request to view status and design details.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full">
          {/* Left panel: Order list */}
          <div className="lg:col-span-1 space-y-6">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <h2 className="text-sm font-mono uppercase tracking-widest text-text-secondary">Catalog Orders</h2>
              <button 
                onClick={fetchUserData}
                className="p-1 border border-border rounded hover:bg-card text-foreground transition-colors"
              >
                <RefreshCw size={12} />
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="border border-border border-dashed rounded-lg p-12 text-center bg-card/50">
                <p className="text-xs text-text-secondary font-mono">No direct orders placed yet.</p>
                <Link href="/#catalog" className="mt-4 inline-block px-4 py-2 bg-foreground text-background text-[10px] font-mono tracking-wider uppercase rounded">
                  Browse Catalog
                </Link>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {orders.map((ord) => (
                  <button
                    key={ord.id}
                    onClick={() => setActiveOrder(ord)}
                    className={`w-full text-left p-4 rounded-lg border font-mono transition-all flex flex-col gap-2 ${
                      activeOrder?.id === ord.id 
                        ? 'border-foreground bg-card' 
                        : 'border-border bg-card/40 hover:border-text-secondary'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-xs font-bold text-foreground truncate uppercase">{ord.product_title}</span>
                      <span className="text-[9px] text-text-secondary">#{ord.id}</span>
                    </div>
                    <div className="flex justify-between items-center w-full">
                      <span className="text-[10px] text-text-secondary">Qty: {ord.quantity}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] border font-bold uppercase tracking-wider ${getOrderStatusBadge(ord.status)}`}>
                        {ord.status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right panel: Active Order Details */}
          <div className="lg:col-span-2">
            {activeOrder ? (
              <div className="border border-border rounded-xl p-6 bg-card space-y-8 font-mono text-xs">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-6">
                  <div>
                    <span className="text-[10px] text-text-secondary uppercase">Order Details</span>
                    <h3 className="text-lg font-bold text-foreground uppercase mt-1">{activeOrder.product_title}</h3>
                  </div>
                  <span className={`px-3 py-1 rounded text-xs border font-bold uppercase tracking-wider ${getOrderStatusBadge(activeOrder.status)}`}>
                    {activeOrder.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-background/50 border border-border p-4 rounded-lg">
                  <div>
                    <span className="text-[10px] text-text-secondary uppercase block mb-1">Unit Price</span>
                    <span className="text-foreground font-bold">₹ {parseFloat(activeOrder.product_rate || '0').toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary uppercase block mb-1">Quantity</span>
                    <span className="text-foreground font-bold">{activeOrder.quantity} units</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary uppercase block mb-1">Total Price</span>
                    <span className="text-foreground font-bold">₹ {parseFloat(activeOrder.total_price || '0').toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-text-secondary uppercase tracking-widest">[ Shipping Address ]</span>
                  <p className="text-xs text-foreground bg-background/30 border border-border p-3 rounded leading-relaxed whitespace-pre-line">
                    {activeOrder.shipping_address}
                  </p>
                </div>
                
                {(activeOrder.shipping_carrier || activeOrder.tracking_number) && (
                  <div className="space-y-2 bg-purple-500/5 border border-purple-500/10 p-4 rounded-lg">
                    <span className="text-[10px] text-purple-500 uppercase tracking-widest block font-bold">[ Delivery Tracking ]</span>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <span className="text-[9px] text-text-secondary uppercase">Carrier / Service Provider</span>
                        <p className="text-foreground font-bold">{activeOrder.shipping_carrier || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-[9px] text-text-secondary uppercase">Tracking ID / Number</span>
                        <p className="text-foreground font-bold">{activeOrder.tracking_number || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-text-secondary">
                  Ordered on: {new Date(activeOrder.created_at).toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="border border-border rounded-xl p-12 bg-card text-center text-xs text-text-secondary font-mono">
                Select a direct catalog order to view delivery details.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <div className="border border-border rounded-xl p-6 bg-card space-y-6 font-mono text-xs max-w-xl">
          <h3 className="text-sm font-bold uppercase tracking-widest text-text-secondary border-b border-border pb-3">Profile & Shipping Address</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] text-text-secondary uppercase mb-1">Username</label>
              <input 
                type="text" 
                disabled
                value={user?.username || ''} 
                className="w-full px-3 py-2 bg-background/50 border border-border rounded text-text-secondary cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-secondary uppercase mb-1">Email Address</label>
              <input 
                type="email" 
                disabled
                value={user?.email || ''} 
                className="w-full px-3 py-2 bg-background/50 border border-border rounded text-text-secondary cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-secondary uppercase mb-1">Phone Number</label>
              <input 
                type="text" 
                value={profilePhone} 
                onChange={(e) => setProfilePhone(e.target.value)}
                placeholder="Enter your phone number"
                className="w-full px-3 py-2 bg-background border border-border rounded text-foreground focus:outline-none focus:border-foreground"
              />
            </div>
            <div>
              <label className="block text-[10px] text-text-secondary uppercase mb-1">Shipping Address (For Catalog Orders)</label>
              <textarea 
                rows={4}
                value={profileAddress} 
                onChange={(e) => setProfileAddress(e.target.value)}
                placeholder="Enter your complete delivery address for direct ordering"
                className="w-full px-3 py-2 bg-background border border-border rounded text-foreground focus:outline-none focus:border-foreground"
              />
            </div>

            {profileSuccess && (
              <div className="p-2.5 bg-green-500/10 border border-green-500/20 text-green-500 rounded font-bold uppercase tracking-wider text-[9px]">
                Profile saved successfully!
              </div>
            )}

            <button
              onClick={handleSaveProfile}
              disabled={updatingProfile}
              className="px-6 py-2.5 bg-foreground text-background font-bold uppercase tracking-wider rounded text-[10px] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              {updatingProfile ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
