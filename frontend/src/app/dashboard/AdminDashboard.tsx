'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../AppContext';
import STLViewer from '../../components/STLViewer';
import { 
  Settings, Plus, RefreshCw, 
  Trash, Edit2, Play, X, Check, AlertCircle
} from 'lucide-react';

interface DashboardUser {
  id: number;
  username: string;
  email: string;
  role: 'visitor' | 'customer' | 'staff' | 'admin' | 'super_admin';
  phone?: string;
  address?: string;
  created_at?: string;
}

interface Product {
  id: number;
  title: string;
  description: string;
  category: string;
  rate: number;
  status: string;
  image?: string;
  image_key?: string;
  media?: string[];
}

interface KPIs {
  total_revenue?: number;
  pending_quotes?: number;
  active_printers?: number;
  completed_jobs?: number;
  new_requests?: number | string;
  pending_quotations?: number | string;
  jobs_printing?: number | string;
  ready_for_pickup?: number | string;
  delivered_orders?: number | string;
  revenue?: number;
}

interface Activity {
  id: number;
  description: string;
  timestamp: string;
  time?: string;
  title?: string;
  desc?: string;
}

interface Order {
  id: number;
  status: string;
  shipping_carrier?: string;
  tracking_number?: string;
  product_title?: string;
  quantity?: number;
  total_price?: string;
  customer_username?: string;
  shipping_address?: string;
  payment_proof?: string;
}

interface PrintRequestFile {
  id: number;
  file: string;
  volume_cm3?: number;
}

interface Quotation {
  id: number;
  total_price: number;
}

interface PrintRequest {
  id: number;
  status: string;
  project_name?: string;
  required_delivery_date?: string;
  customer_name?: string;
  material_preference?: string;
  color_preference?: string;
  infill?: string;
  files?: PrintRequestFile[];
  dimensions?: string;
  quantity?: number;
  quotation?: Quotation;
  shipping_carrier?: string;
  tracking_number?: string;
}

interface Material {
  id: number;
  name: string;
  brand: string;
  type: string;
  color: string;
  available_stock: number;
  reorder_level: number;
  available?: number;
  reserved?: number;
  reserved_stock?: number;
}

interface Printer {
  id: number;
  name: string;
  type: string;
  build_volume: string;
  status: string;
}

interface ProductionJob {
  id: number;
  status: string;
  project_name?: string;
  printer_name?: string;
  material_name?: string;
  estimated_time_minutes?: number;
  printer?: number;
}

const R2_BASE = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || '';

const FILAMENT_COLORS = [
  { name: 'Black', hex: '#1a1a1a' },
  { name: 'White', hex: '#ffffff' },
  { name: 'Grey', hex: '#808080' },
  { name: 'Red', hex: '#ef4444' },
  { name: 'Yellow', hex: '#eab308' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Silver', hex: '#c0c0c0' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Clear', hex: '#e2e8f0' }
];

export default function AdminDashboard() {
  const { user, apiFetch } = useApp();
  const [activeTab, setActiveTab] = useState<'overview' | 'quotes' | 'crm' | 'production' | 'inventory' | 'orders' | 'products' | 'users' | 'settings'>('overview');

  // Hero Settings
  const [heroSettings, setHeroSettings] = useState<Record<string, string>>({
    hero_title1: '', hero_title2: '', hero_description: '', hero_price: '', hero_model_url: ''
  });

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  // Products management states
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [newProdTitle, setNewProdTitle] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('Personalized');
  const [newProdRate, setNewProdRate] = useState(0.00);
  const [newProdImage, setNewProdImage] = useState<File | null>(null);
  const [newProdMedia, setNewProdMedia] = useState<File[]>([]);
  const [newProdPath, setNewProdPath] = useState('');

  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editProdTitle, setEditProdTitle] = useState('');
  const [editProdDesc, setEditProdDesc] = useState('');
  const [editProdCategory, setEditProdCategory] = useState('Personalized');
  const [editProdRate, setEditProdRate] = useState(0.00);
  const [editProdImage, setEditProdImage] = useState<File | null>(null);
  const [editProdMedia, setEditProdMedia] = useState<File[]>([]);
  const [editProdPath, setEditProdPath] = useState('');
  const [editProdStatus, setEditProdStatus] = useState('active');

  // KPI & activity states
  const [kpis, setKpis] = useState<KPIs>({});
  const [activityFeed, setActivityFeed] = useState<Activity[]>([]);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Orders states
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // User management states
  const [allUsers, setAllUsers] = useState<DashboardUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // User creation states
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('customer');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [createUserError, setCreateUserError] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  // User edit states
  const [editingUser, setEditingUser] = useState<DashboardUser | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('customer');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editUserError, setEditUserError] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  // Requests/Quotes states
  const [requests, setRequests] = useState<PrintRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<PrintRequest | null>(null);

  // Quote Builder input states
  const [materialCost, setMaterialCost] = useState(0.0);
  const [machineCost, setMachineCost] = useState(0.0);
  const [postCost, setPostCost] = useState(0.0);
  const [packCost, setPackCost] = useState(0.0);
  const [transCost, setTransCost] = useState(0.0);
  const [profitMargin, setProfitMargin] = useState(20.0);
  const [estHours, setEstHours] = useState(4.0);
  const [validityDays, setValidityDays] = useState(7);
  const [submittingQuote, setSubmittingQuote] = useState(false);

  // Inventory states
  const [materials, setMaterials] = useState<Material[]>([]);
  const [newMatName, setNewMatName] = useState('');
  const [newMatBrand, setNewMatBrand] = useState('');
  const [newMatType, setNewMatType] = useState('PLA');
  const [newMatColor, setNewMatColor] = useState('#ef4444');
  const [colorPickerTab, setColorPickerTab] = useState<'grid' | 'sliders'>('grid');
  const [pickerOpacity, setPickerOpacity] = useState(100);
  const [savedSwatches, setSavedSwatches] = useState<string[]>([
    '#000000', '#3b82f6', '#22c55e', '#eab308', '#ef4444', '#06b6d4', '#a855f7', '#ec4899', '#ffffff'
  ]);
  const [rgbRed, setRgbRed] = useState(239);
  const [rgbGreen, setRgbGreen] = useState(68);
  const [rgbBlue, setRgbBlue] = useState(68);

  const updateColorFromRGB = (r: number, g: number, b: number) => {
    setRgbRed(r);
    setRgbGreen(g);
    setRgbBlue(b);
    const hex = '#' + [r, g, b].map(x => {
      const hexStr = x.toString(16);
      return hexStr.length === 1 ? '0' + hexStr : hexStr;
    }).join('');
    setNewMatColor(hex);
  };

  const handleSelectColor = (hex: string) => {
    setNewMatColor(hex);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      setRgbRed(parseInt(result[1], 16));
      setRgbGreen(parseInt(result[2], 16));
      setRgbBlue(parseInt(result[3], 16));
    }
  };

  const handleOpenEyeDropper = async () => {
    if (typeof window !== 'undefined' && 'EyeDropper' in window) {
      try {
        const eyeDropper = new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper();
        const result = await eyeDropper.open();
        handleSelectColor(result.sRGBHex);
      } catch (err) {
        console.error("EyeDropper failed or cancelled:", err);
      }
    } else {
      alert("Eye dropper tool is not supported in this browser. Please select a color from the grid or sliders.");
    }
  };

  const [newMatStock, setNewMatStock] = useState(5.0);
  const [newMatReorder, setNewMatReorder] = useState(1.0);

  // Production states
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [productionJobs, setProductionJobs] = useState<ProductionJob[]>([]);

  // Printer management states
  const [newPrinterName, setNewPrinterName] = useState('');
  const [newPrinterType, setNewPrinterType] = useState('FDM');
  const [newPrinterVolume, setNewPrinterVolume] = useState('220 x 220 x 250 mm');
  const [newPrinterStatus, setNewPrinterStatus] = useState('Idle');

  // Editing states
  const [editingMaterialId, setEditingMaterialId] = useState<number | null>(null);
  const [editMatBrand, setEditMatBrand] = useState('Generic');
  const [editMatStock, setEditMatStock] = useState<number>(0.0);
  const [editMatReorder, setEditMatReorder] = useState<number>(1.0);
  const [editMatName, setEditMatName] = useState('');
  const [editMatType, setEditMatType] = useState('PLA');
  const [editMatColor, setEditMatColor] = useState('#ef4444');

  useEffect(() => {
    fetchOverviewData();
    fetchRequests();
    fetchInventory();
    fetchPrintersAndJobs();
    if (activeTab === 'orders') fetchOrders();
    if (activeTab === 'products') fetchProducts();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'settings') fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function fetchSettings() {
    try {
      const res = await apiFetch('/settings');
      if (res.ok) {
        setHeroSettings(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMessage('');
    try {
      const formData = new FormData();
      Object.entries(heroSettings).forEach(([key, value]) => formData.append(key, value));


      const res = await apiFetch('/settings', {
        method: 'PATCH',
        body: formData
      });
      if (res.ok) {
        setSettingsMessage('Settings saved successfully!');
        setTimeout(() => setSettingsMessage(''), 3000);
      } else {
        const errData = await res.json();
        setSettingsMessage(`Error: ${errData.detail || 'Failed to save'}`);
      }
    } catch (err) {
      setSettingsMessage('Network error.');
    } finally {
      setSavingSettings(false);
    }
  }

  async function fetchOverviewData() {
    try {
      setLoadingOverview(true);
      const res = await apiFetch('/admin/dashboard/');
      if (res.ok) {
        const data = await res.json();
        setKpis(data.kpis);
        setActivityFeed(data.activity_feed);
        setMaterials(data.materials);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOverview(false);
    }
  }

  async function fetchRequests() {
    try {
      const res = await apiFetch('/requests/');
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchInventory() {
    try {
      const res = await apiFetch('/materials/');
      if (res.ok) {
        const data = await res.json();
        setMaterials(data);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchPrintersAndJobs() {
    try {
      const printersRes = await apiFetch('/printers/');
      const jobsRes = await apiFetch('/production-jobs/');
      if (printersRes.ok && jobsRes.ok) {
        setPrinters(await printersRes.json());
        setProductionJobs(await jobsRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchOrders() {
    try {
      setLoadingOrders(true);
      const res = await apiFetch('/orders/');
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  }

  async function fetchProducts() {
    try {
      setLoadingProducts(true);
      const res = await apiFetch('/products/');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProducts(false);
    }
  }

  async function fetchUsers() {
    try {
      setLoadingUsers(true);
      const res = await apiFetch('/users');
      if (res.ok) setAllUsers(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsers(false);
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError('');
    setCreatingUser(true);

    try {
      const res = await apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify({
          username: newUsername,
          email: newEmail,
          password: newPassword,
          role: newRole,
          phone: newPhone || null,
          address: newAddress || null,
        }),
      });

      if (res.ok) {
        setCreateUserOpen(false);
        setNewUsername('');
        setNewEmail('');
        setNewPassword('');
        setNewRole('customer');
        setNewPhone('');
        setNewAddress('');
        fetchUsers();
      } else {
        const errData = await res.json();
        setCreateUserError(errData.detail || 'Failed to create user.');
      }
    } catch (err) {
      console.error(err);
      setCreateUserError('API request error.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleSaveUserEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditUserError('');
    setSavingUser(true);

    try {
      const res = await apiFetch(`/users/${editingUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          username: editUsername,
          email: editEmail,
          password: editPassword || undefined,
          role: editRole,
          phone: editPhone || null,
          address: editAddress || null,
        }),
      });

      if (res.ok) {
        setEditingUser(null);
        setEditUsername('');
        setEditEmail('');
        setEditPassword('');
        setEditRole('customer');
        setEditPhone('');
        setEditAddress('');
        fetchUsers();
      } else {
        const errData = await res.json();
        setEditUserError(errData.detail || 'Failed to update user.');
      }
    } catch (err) {
      console.error(err);
      setEditUserError('API request error.');
    } finally {
      setSavingUser(false);
    }
  };

  const startEditUser = (u: DashboardUser) => {
    setEditingUser(u);
    setEditUsername(u.username);
    setEditEmail(u.email);
    setEditPassword('');
    setEditRole(u.role);
    setEditPhone(u.phone || '');
    setEditAddress(u.address || '');
    setEditUserError('');
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', newProdTitle);
    formData.append('description', newProdDesc);
    formData.append('category', newProdCategory);
    formData.append('rate', newProdRate.toString());
    formData.append('status', 'active');
    if (newProdImage) {
      formData.append('image', newProdImage);
    } else if (newProdPath) {
      formData.append('image_key', newProdPath);
    }
    newProdMedia.forEach(f => formData.append('media', f));
    try {
      const res = await apiFetch('/products/', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        setNewProdTitle('');
        setNewProdDesc('');
        setNewProdCategory('Personalized');
        setNewProdRate(0.00);
        setNewProdImage(null);
        setNewProdMedia([]);
        setNewProdPath('');
        const fileInput = document.getElementById('new-prod-media') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await apiFetch(`/products/${productId}/`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveProductEdits = async (productId: number) => {
    const formData = new FormData();
    formData.append('title', editProdTitle);
    formData.append('description', editProdDesc);
    formData.append('category', editProdCategory);
    formData.append('rate', editProdRate.toString());
    formData.append('status', editProdStatus);
    if (editProdImage) {
      formData.append('image', editProdImage);
    } else if (editProdPath) {
      formData.append('image_key', editProdPath);
    }
    editProdMedia.forEach(f => formData.append('media', f));
    try {
      const res = await apiFetch(`/products/${productId}/`, {
        method: 'PATCH',
        body: formData
      });
      if (res.ok) {
        setEditingProductId(null);
        setEditProdImage(null);
        setEditProdMedia([]);
        setEditProdPath('');
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: string) => {
    try {
      const res = await apiFetch(`/orders/${orderId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateOrderTracking = async (orderId: number, carrier: string, tracking: string) => {
    try {
      const res = await apiFetch(`/orders/${orderId}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          shipping_carrier: carrier,
          tracking_number: tracking
        })
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdatePrintRequestTracking = async (reqId: number, carrier: string, tracking: string) => {
    try {
      const res = await apiFetch(`/requests/${reqId}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          shipping_carrier: carrier,
          tracking_number: tracking
        })
      });
      if (res.ok) {
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteOrder = async (orderId: number) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      const res = await apiFetch(`/orders/${orderId}/`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Submit quote to DB
  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setSubmittingQuote(true);

    // Validity date calc
    const valDate = new Date();
    valDate.setDate(valDate.getDate() + validityDays);

    const payload = {
      request: selectedRequest.id,
      material_cost: materialCost,
      machine_cost: machineCost,
      post_processing_cost: postCost,
      packaging_cost: packCost,
      transportation_cost: transCost,
      profit_margin: profitMargin,
      validity_date: valDate.toISOString().split('T')[0],
      estimated_production_hours: estHours,
      status: 'Pending'
    };

    try {
      const res = await apiFetch('/quotations/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Reset quote builder
        setSelectedRequest(null);
        setMaterialCost(0.0);
        setMachineCost(0.0);
        setPostCost(0.0);
        setPackCost(0.0);
        setTransCost(0.0);
        setProfitMargin(20.0);
        setEstHours(4.0);
        fetchRequests();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingQuote(false);
    }
  };

  // Add material to database
  const handleAddMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: newMatName,
      brand: newMatBrand || 'Generic',
      type: newMatType,
      color: newMatColor,
      available_stock: newMatStock,
      reorder_level: newMatReorder
    };
    try {
      const res = await apiFetch('/materials/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setNewMatName('');
        setNewMatBrand('');
        setNewMatColor('');
        setNewMatStock(5.0);
        setNewMatReorder(1.0);
        fetchInventory();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add printer to database
  const handleAddPrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: newPrinterName,
      type: newPrinterType,
      build_volume: newPrinterVolume,
      status: newPrinterStatus
    };
    try {
      const res = await apiFetch('/printers/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setNewPrinterName('');
        setNewPrinterVolume('220 x 220 x 250 mm');
        setNewPrinterStatus('Idle');
        fetchPrintersAndJobs();
        fetchOverviewData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete printer from database
  const handleDeletePrinter = async (printerId: number) => {
    if (!confirm('Are you sure you want to delete this printer?')) return;
    try {
      const res = await apiFetch(`/printers/${printerId}/`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchPrintersAndJobs();
        fetchOverviewData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update printer details/status
  const handleUpdatePrinterStatus = async (printerId: number, status: string) => {
    try {
      const res = await apiFetch(`/printers/${printerId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchPrintersAndJobs();
        fetchOverviewData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete material from database
  const handleDeleteMaterial = async (materialId: number) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    try {
      const res = await apiFetch(`/materials/${materialId}/`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchInventory();
        fetchOverviewData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save modified material edits
  const handleSaveMaterialEdits = async (materialId: number) => {
    try {
      const res = await apiFetch(`/materials/${materialId}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editMatName,
          brand: editMatBrand,
          type: editMatType,
          color: editMatColor,
          available_stock: editMatStock,
          reorder_level: editMatReorder
        })
      });
      if (res.ok) {
        setEditingMaterialId(null);
        fetchInventory();
        fetchOverviewData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update Production Job Status
  const handleUpdateJobStatus = async (jobId: number, nextStatus: string) => {
    try {
      const res = await apiFetch(`/production-jobs/${jobId}/update-status/`, {
        method: 'POST',
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        fetchPrintersAndJobs();
        fetchOverviewData();
      }
    } catch (err) {
      console.error(err);
    }
  };



  const getJobStatusBadge = (status: string) => {
    switch (status) {
      case 'Scheduled': return 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20';
      case 'Printing': return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
      case 'Post Processing': return 'text-pink-500 bg-pink-500/10 border-pink-500/20';
      case 'Quality Check': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'Ready For Pickup': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      case 'Delivered': return 'text-green-500 bg-green-500/10 border-green-500/20';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)]">
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-border bg-card/25 flex flex-col font-mono text-xs">
        <div className="p-6 border-b border-border flex items-center gap-2">
          <Settings size={14} className="text-blue-500" />
          <span className="font-bold tracking-widest uppercase">Admin Panel</span>
        </div>
        <nav className="p-4 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded text-left transition-all uppercase whitespace-nowrap ${
              activeTab === 'overview' ? 'bg-foreground text-background font-bold' : 'text-text-secondary hover:bg-card'
            }`}
          >
            Dashboard Overview
          </button>
          <button 
            onClick={() => setActiveTab('quotes')}
            className={`px-4 py-2.5 rounded text-left transition-all uppercase whitespace-nowrap ${
              activeTab === 'quotes' ? 'bg-foreground text-background font-bold' : 'text-text-secondary hover:bg-card'
            }`}
          >
            Quotation Builder
          </button>
          <button 
            onClick={() => setActiveTab('crm')}
            className={`px-4 py-2.5 rounded text-left transition-all uppercase whitespace-nowrap ${
              activeTab === 'crm' ? 'bg-foreground text-background font-bold' : 'text-text-secondary hover:bg-card'
            }`}
          >
            CRM Leads Pipeline
          </button>
          <button 
            onClick={() => setActiveTab('production')}
            className={`px-4 py-2.5 rounded text-left transition-all uppercase whitespace-nowrap ${
              activeTab === 'production' ? 'bg-foreground text-background font-bold' : 'text-text-secondary hover:bg-card'
            }`}
          >
            Printer Queue
          </button>
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2.5 rounded text-left transition-all uppercase whitespace-nowrap ${
              activeTab === 'inventory' ? 'bg-foreground text-background font-bold' : 'text-text-secondary hover:bg-card'
            }`}
          >
            Material Stocks
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 rounded text-left transition-all uppercase whitespace-nowrap ${
              activeTab === 'orders' ? 'bg-foreground text-background font-bold' : 'text-text-secondary hover:bg-card'
            }`}
          >
            Order Management
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2.5 rounded text-left transition-all uppercase whitespace-nowrap ${
              activeTab === 'products' ? 'bg-foreground text-background font-bold' : 'text-text-secondary hover:bg-card'
            }`}
          >
            Catalog Products
          </button>
          {/* Users — admin/super_admin only */}
          {user && ['admin', 'super_admin'].includes(user.role) && (
            <>
              <button 
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2.5 rounded text-left transition-all uppercase whitespace-nowrap ${
                  activeTab === 'users' ? 'bg-foreground text-background font-bold' : 'text-text-secondary hover:bg-card'
                }`}
              >
                User Management
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2.5 rounded text-left transition-all uppercase whitespace-nowrap ${
                  activeTab === 'settings' ? 'bg-foreground text-background font-bold' : 'text-text-secondary hover:bg-card'
                }`}
              >
                Hero Settings
              </button>
            </>
          )}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow p-4 sm:p-6 lg:p-8 overflow-y-auto">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <h2 className="text-sm font-mono uppercase tracking-widest text-text-secondary">Dashboard KPIs</h2>
              <button onClick={fetchOverviewData} className="p-1 border border-border rounded hover:bg-card text-foreground">
                <RefreshCw size={12} />
              </button>
            </div>

            {loadingOverview ? (
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                {[1, 2, 3, 4, 5, 6].map(n => <div key={n} className="h-24 bg-card animate-pulse border border-border rounded" />)}
              </div>
            ) : (
              <>
                {/* KPI Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 font-mono">
                  <div className="border border-border rounded p-4 bg-card">
                    <span className="text-[9px] text-text-secondary uppercase">New Leads</span>
                    <p className="text-xl font-bold mt-1 text-blue-500">{kpis.new_requests}</p>
                  </div>
                  <div className="border border-border rounded p-4 bg-card">
                    <span className="text-[9px] text-text-secondary uppercase">Pending Quotes</span>
                    <p className="text-xl font-bold mt-1 text-amber-500">{kpis.pending_quotations}</p>
                  </div>
                  <div className="border border-border rounded p-4 bg-card">
                    <span className="text-[9px] text-text-secondary uppercase">Printing Jobs</span>
                    <p className="text-xl font-bold mt-1 text-purple-500">{kpis.jobs_printing}</p>
                  </div>
                  <div className="border border-border rounded p-4 bg-card">
                    <span className="text-[9px] text-text-secondary uppercase">Ready</span>
                    <p className="text-xl font-bold mt-1 text-orange-500">{kpis.ready_for_pickup}</p>
                  </div>
                  <div className="border border-border rounded p-4 bg-card">
                    <span className="text-[9px] text-text-secondary uppercase">Delivered</span>
                    <p className="text-xl font-bold mt-1 text-green-500">{kpis.delivered_orders}</p>
                  </div>
                  <div className="border border-border rounded p-4 bg-card">
                    <span className="text-[9px] text-text-secondary uppercase">Total Revenue</span>
                    <p className="text-base font-bold mt-1 text-foreground">₹ {kpis.revenue?.toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Activity feed */}
                  <div className="lg:col-span-2 space-y-4 border border-border rounded-xl p-6 bg-card">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-text-secondary">Recent System Activity</h3>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 text-xs font-mono">
                      {activityFeed.map((act, index) => (
                        <div key={index} className="flex gap-4 border-b border-border/50 pb-3 last:border-b-0">
                          <span className="text-[9px] text-text-secondary font-mono whitespace-nowrap">
                            {act.time ? act.time.split('T')[0] : ''}
                          </span>
                          <div>
                            <p className="font-bold text-foreground uppercase">{act.title}</p>
                            <p className="text-[11px] text-text-secondary mt-0.5">{act.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Printer summary status */}
                  <div className="space-y-4 border border-border rounded-xl p-6 bg-card text-xs font-mono">
                    <h3 className="text-xs uppercase tracking-widest text-text-secondary">Machinery Status</h3>
                    <div className="space-y-3">
                      {printers.map((p) => (
                        <div key={p.id} className="flex justify-between items-center border border-border p-3 rounded bg-background/30">
                          <div>
                            <p className="font-bold text-foreground">{p.name}</p>
                            <p className="text-[10px] text-text-secondary">{p.type} | {p.build_volume}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                            p.status === 'Idle' 
                              ? 'text-green-500 bg-green-500/10 border-green-500/20' 
                              : p.status === 'Printing' 
                              ? 'text-purple-500 bg-purple-500/10 border-purple-500/20' 
                              : 'text-red-500 bg-red-500/10 border-red-500/20'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 2: QUOTATION BUILDER */}
        {activeTab === 'quotes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Pending Requests List */}
            <div className="lg:col-span-1 space-y-6">
              <h2 className="text-xs font-mono uppercase tracking-widest text-text-secondary border-b border-border pb-4">
                Requests Pending Quotes
              </h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {requests
                  .filter(r => r.status === 'New Request' || r.status === 'Under Review')
                  .map((req) => (
                    <button
                      key={req.id}
                      onClick={() => { setSelectedRequest(req); }}
                      className={`w-full text-left p-4 rounded-lg border font-mono transition-all flex flex-col gap-2 ${
                        selectedRequest?.id === req.id 
                          ? 'border-foreground bg-card' 
                          : 'border-border bg-card/40 hover:border-text-secondary'
                      }`}
                    >
                      <div className="flex justify-between items-start w-full">
                        <span className="text-xs font-bold text-foreground truncate uppercase">{req.project_name}</span>
                        <span className="text-[9px] text-text-secondary">#{req.id}</span>
                      </div>
                      <span className="text-[10px] text-text-secondary">User: {req.customer_name}</span>
                      <span className="text-[10px] text-text-secondary">Pref: {req.material_preference} - {req.color_preference} | Infill: {req.infill || '20%'}</span>
                    </button>
                  ))}
              </div>
            </div>

            {/* Builder Form */}
            <div className="lg:col-span-2">
              {selectedRequest ? (
                <div className="border border-border rounded-xl p-6 bg-card space-y-6 font-mono text-xs">
                  <h3 className="text-sm font-bold text-foreground uppercase border-b border-border pb-4">
                    Quotation Builder for Request #{selectedRequest.id}
                  </h3>

                  {/* 3D STL file view in builder */}
                  {selectedRequest.files && selectedRequest.files.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[9px] text-text-secondary uppercase">Mesh Volume Extraction</span>
                      <STLViewer fileUrl={selectedRequest.files[0].file} height="200px" />
                      <div className="flex justify-between text-[9px] text-text-secondary">
                        <span>File: {selectedRequest.files[0].file.split('/').pop()}</span>
                        <span>Estimated Volume: {selectedRequest.files[0].volume_cm3} cm³</span>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-background/50 border border-border p-4 rounded text-xs text-text-secondary">
                    <div>Project: <strong className="text-foreground">{selectedRequest.project_name}</strong></div>
                    <div>Qty: <strong className="text-foreground">{selectedRequest.quantity}</strong></div>
                    <div>Material: <strong className="text-foreground">{selectedRequest.material_preference} - {selectedRequest.color_preference}</strong></div>
                    <div>Infill: <strong className="text-foreground">{selectedRequest.infill || '20%'}</strong></div>
                    <div>Dimensions: <strong className="text-foreground">{selectedRequest.dimensions}</strong></div>
                  </div>

                  <form onSubmit={handleCreateQuotation} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-text-secondary uppercase mb-1">Material Cost (₹) *</label>
                        <input 
                          type="number" 
                          required 
                          step="0.01"
                          value={materialCost}
                          onChange={(e) => setMaterialCost(parseFloat(e.target.value) || 0.0)}
                          className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:border-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-secondary uppercase mb-1">Machine Cost (₹) *</label>
                        <input 
                          type="number" 
                          required 
                          step="0.01"
                          value={machineCost}
                          onChange={(e) => setMachineCost(parseFloat(e.target.value) || 0.0)}
                          className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:border-foreground"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] text-text-secondary uppercase mb-1">Post Processing (₹) *</label>
                        <input 
                          type="number" 
                          required 
                          step="0.01"
                          value={postCost}
                          onChange={(e) => setPostCost(parseFloat(e.target.value) || 0.0)}
                          className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:border-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-secondary uppercase mb-1">Packaging (₹) *</label>
                        <input 
                          type="number" 
                          required 
                          step="0.01"
                          value={packCost}
                          onChange={(e) => setPackCost(parseFloat(e.target.value) || 0.0)}
                          className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:border-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-secondary uppercase mb-1">Transportation (₹) *</label>
                        <input 
                          type="number" 
                          required 
                          step="0.01"
                          value={transCost}
                          onChange={(e) => setTransCost(parseFloat(e.target.value) || 0.0)}
                          className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:border-foreground"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] text-text-secondary uppercase mb-1">Profit Margin (%) *</label>
                        <input 
                          type="number" 
                          required 
                          value={profitMargin}
                          onChange={(e) => setProfitMargin(parseFloat(e.target.value) || 0.0)}
                          className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:border-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-secondary uppercase mb-1">Est. Print Hours *</label>
                        <input 
                          type="number" 
                          required 
                          step="0.1"
                          value={estHours}
                          onChange={(e) => setEstHours(parseFloat(e.target.value) || 0.0)}
                          className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:border-foreground"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-text-secondary uppercase mb-1">Quote Validity (Days) *</label>
                        <input 
                          type="number" 
                          required 
                          value={validityDays}
                          onChange={(e) => setValidityDays(parseInt(e.target.value) || 7)}
                          className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-foreground focus:outline-none focus:border-foreground"
                        />
                      </div>
                    </div>

                    {/* Cost Estimation calculation visualization */}
                    <div className="border border-border p-4 rounded bg-background/50 flex justify-between items-center mt-6">
                      <div>
                        <span className="text-[10px] text-text-secondary uppercase">Estimated Price</span>
                        <p className="text-xl font-bold text-foreground">
                          ₹ {((materialCost + machineCost + postCost + packCost + transCost) * (1 + profitMargin/100)).toFixed(2)}
                        </p>
                      </div>
                      <button 
                        type="submit"
                        disabled={submittingQuote}
                        className="px-6 py-2.5 bg-foreground text-background text-[10px] font-bold uppercase tracking-wider rounded"
                      >
                        Publish Quote
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="border border-border rounded-xl p-12 bg-card text-center text-xs text-text-secondary font-mono">
                  Select a request from the pending list to open the quotation builder.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CRM PIPELINE */}
        {activeTab === 'crm' && (
          <div className="space-y-6">
            <h2 className="text-xs font-mono uppercase tracking-widest text-text-secondary border-b border-border pb-4">
              CRM Customer Pipeline
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              
              {/* STAGE 1: New Requests */}
              <div className="border border-border bg-card/45 rounded-lg p-4 space-y-4">
                <span className="text-[10px] font-mono font-bold text-blue-500 uppercase tracking-wider">New requests</span>
                <div className="space-y-2">
                  {requests.filter(r => r.status === 'New Request').map(r => (
                    <div key={r.id} className="border border-border p-3 rounded bg-card text-[11px] font-mono space-y-1">
                      <p className="font-bold text-foreground">{r.project_name}</p>
                      <p className="text-text-secondary text-[9px]">Client: {r.customer_name}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* STAGE 2: Under Review */}
              <div className="border border-border bg-card/45 rounded-lg p-4 space-y-4">
                <span className="text-[10px] font-mono font-bold text-purple-500 uppercase tracking-wider">Under Review</span>
                <div className="space-y-2">
                  {requests.filter(r => r.status === 'Under Review').map(r => (
                    <div key={r.id} className="border border-border p-3 rounded bg-card text-[11px] font-mono space-y-1">
                      <p className="font-bold text-foreground">{r.project_name}</p>
                      <p className="text-text-secondary text-[9px]">Client: {r.customer_name}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* STAGE 3: Quote Sent */}
              <div className="border border-border bg-card/45 rounded-lg p-4 space-y-4">
                <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-wider">Quote Sent</span>
                <div className="space-y-2">
                  {requests.filter(r => r.status === 'Quote Generated').map(r => (
                    <div key={r.id} className="border border-border p-3 rounded bg-card text-[11px] font-mono space-y-1">
                      <p className="font-bold text-foreground">{r.project_name}</p>
                      <p className="text-text-secondary text-[9px]">Amount: ₹ {r.quotation?.total_price}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* STAGE 4: Production */}
              <div className="border border-border bg-card/45 rounded-lg p-4 space-y-4">
                <span className="text-[10px] font-mono font-bold text-cyan-500 uppercase tracking-wider">Production</span>
                <div className="space-y-2">
                  {requests.filter(r => r.status === 'Quote Accepted').map(r => (
                    <div key={r.id} className="border border-border p-3 rounded bg-card text-[11px] font-mono space-y-1">
                      <p className="font-bold text-foreground">{r.project_name}</p>
                      <p className="text-text-secondary text-[9px]">Job Scheduled</p>
                      <div className="space-y-1 pt-1.5 border-t border-border/50 mt-1">
                        <input 
                          type="text"
                          placeholder="Carrier"
                          defaultValue={r.shipping_carrier || ''}
                          onBlur={(e) => handleUpdatePrintRequestTracking(r.id, e.target.value, r.tracking_number || '')}
                          className="w-full px-1.5 py-0.5 bg-background border border-border rounded text-[9px] focus:outline-none focus:border-foreground"
                        />
                        <input 
                          type="text"
                          placeholder="Tracking ID"
                          defaultValue={r.tracking_number || ''}
                          onBlur={(e) => handleUpdatePrintRequestTracking(r.id, r.shipping_carrier || '', e.target.value)}
                          className="w-full px-1.5 py-0.5 bg-background border border-border rounded text-[9px] focus:outline-none focus:border-foreground"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* STAGE 5: Completed */}
              <div className="border border-border bg-card/45 rounded-lg p-4 space-y-4">
                <span className="text-[10px] font-mono font-bold text-green-500 uppercase tracking-wider">Completed</span>
                <div className="space-y-2">
                  {requests.filter(r => r.status === 'Completed').map(r => (
                    <div key={r.id} className="border border-border p-3 rounded bg-card text-[11px] font-mono space-y-1">
                      <p className="font-bold text-foreground">{r.project_name}</p>
                      <p className="text-text-secondary text-[9px]">Delivered</p>
                      <div className="space-y-1 pt-1.5 border-t border-border/50 mt-1">
                        <input 
                          type="text"
                          placeholder="Carrier"
                          defaultValue={r.shipping_carrier || ''}
                          onBlur={(e) => handleUpdatePrintRequestTracking(r.id, e.target.value, r.tracking_number || '')}
                          className="w-full px-1.5 py-0.5 bg-background border border-border rounded text-[9px] focus:outline-none focus:border-foreground"
                        />
                        <input 
                          type="text"
                          placeholder="Tracking ID"
                          defaultValue={r.tracking_number || ''}
                          onBlur={(e) => handleUpdatePrintRequestTracking(r.id, r.shipping_carrier || '', e.target.value)}
                          className="w-full px-1.5 py-0.5 bg-background border border-border rounded text-[9px] focus:outline-none focus:border-foreground"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 4: PRINTER QUEUE */}
        {activeTab === 'production' && (
          <div className="space-y-8">
            <h2 className="text-xs font-mono uppercase tracking-widest text-text-secondary border-b border-border pb-4">
              Production Job Queue
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-xs font-mono">
              {/* Queue List */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xs uppercase text-text-secondary">Current Jobs</h3>
                
                {productionJobs.length === 0 ? (
                  <div className="border border-border rounded-lg p-6 text-center text-text-secondary">
                    No active production jobs in queue.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {productionJobs.map((job) => (
                      <div key={job.id} className="border border-border p-4 rounded-lg bg-card space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-[10px] text-text-secondary uppercase">Project:</span>
                            <p className="font-bold text-foreground uppercase">{job.project_name}</p>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getJobStatusBadge(job.status)}`}>
                            {job.status}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-[10px] text-text-secondary">
                          <div>Printer: <strong className="text-foreground">{job.printer_name || 'Unassigned'}</strong></div>
                          <div>Material: <strong className="text-foreground">{job.material_name || 'None'}</strong></div>
                          <div>Runtime: <strong className="text-foreground">{((job.estimated_time_minutes || 0) / 60).toFixed(1)} hrs</strong></div>
                        </div>

                        {/* Status transition controls */}
                        <div className="flex gap-2 pt-2 border-t border-border/50">
                          {job.status === 'Scheduled' && (
                            <button
                              onClick={() => handleUpdateJobStatus(job.id, 'Printing')}
                              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-[10px] uppercase font-bold flex items-center gap-1"
                            >
                              <Play size={10} /> Start Print
                            </button>
                          )}
                          {job.status === 'Printing' && (
                            <button
                              onClick={() => handleUpdateJobStatus(job.id, 'Post Processing')}
                              className="px-3 py-1 bg-pink-500 hover:bg-pink-600 text-white rounded text-[10px] uppercase font-bold"
                            >
                              Move to Post-Processing
                            </button>
                          )}
                          {job.status === 'Post Processing' && (
                            <button
                              onClick={() => handleUpdateJobStatus(job.id, 'Quality Check')}
                              className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded text-[10px] uppercase font-bold"
                            >
                              Move to Quality Check
                            </button>
                          )}
                          {job.status === 'Quality Check' && (
                            <button
                              onClick={() => handleUpdateJobStatus(job.id, 'Ready For Pickup')}
                              className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-[10px] uppercase font-bold"
                            >
                              Mark Ready for Pickup
                            </button>
                          )}
                          {job.status === 'Ready For Pickup' && (
                            <button
                              onClick={() => handleUpdateJobStatus(job.id, 'Delivered')}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] uppercase font-bold"
                            >
                              Mark Delivered / Complete
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Machinery Schedule details & Printer Management */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs uppercase text-text-secondary mb-3">Manage Printers</h3>
                  <div className="space-y-4">
                    {printers.map((p) => {
                      const activeJobs = productionJobs.filter(j => j.printer === p.id && j.status !== 'Delivered');
                      return (
                        <div key={p.id} className="border border-border rounded-lg p-4 bg-card space-y-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-foreground">{p.name}</p>
                              <p className="text-[10px] text-text-secondary">{p.type} | {p.build_volume}</p>
                            </div>
                            <button 
                              onClick={() => handleDeletePrinter(p.id)}
                              className="text-text-secondary hover:text-red-500 transition-colors p-1"
                              title="Delete Printer"
                            >
                              <Trash size={12} />
                            </button>
                          </div>
                          
                          <div className="flex justify-between items-center text-[10px] pt-1 border-t border-border/20">
                            <span className="text-text-secondary uppercase">Status:</span>
                            <select
                              value={p.status}
                              onChange={(e) => handleUpdatePrinterStatus(p.id, e.target.value)}
                              className="bg-background border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground focus:outline-none"
                            >
                              <option value="Idle">Idle</option>
                              <option value="Printing">Printing</option>
                              <option value="Maintenance">Maintenance</option>
                            </select>
                          </div>

                          <div className="space-y-1.5 pt-1">
                            <span className="text-[9px] text-text-secondary uppercase block">{activeJobs.length} active jobs</span>
                            {activeJobs.length === 0 ? (
                              <div className="text-[10px] text-text-secondary italic">No scheduled runs</div>
                            ) : (
                              activeJobs.map((j) => (
                                <div key={j.id} className="p-2 border border-border bg-background/40 rounded flex justify-between items-center text-[10px]">
                                  <span className="truncate">{j.project_name}</span>
                                  <span>{((j.estimated_time_minutes || 0) / 60).toFixed(1)} hrs</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Add Printer Form */}
                <div className="border border-border rounded-lg p-4 bg-card space-y-4">
                  <h3 className="text-xs uppercase text-text-secondary">Register New Printer</h3>
                  <form onSubmit={handleAddPrinter} className="space-y-3">
                    <div>
                      <label className="block text-[9px] text-text-secondary uppercase mb-1">Printer Name *</label>
                      <input 
                        type="text" 
                        required 
                        value={newPrinterName}
                        onChange={(e) => setNewPrinterName(e.target.value)}
                        placeholder="e.g., Formlabs Form 3"
                        className="w-full px-2.5 py-1.5 bg-background border border-border rounded text-[11px] text-foreground focus:outline-none focus:border-foreground"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] text-text-secondary uppercase mb-1">Type *</label>
                        <select 
                          value={newPrinterType}
                          onChange={(e) => setNewPrinterType(e.target.value)}
                          className="w-full px-2 py-1.5 bg-background border border-border rounded text-[11px] text-foreground focus:outline-none"
                        >
                          <option value="FDM">FDM</option>
                          <option value="SLA">SLA</option>
                          <option value="SLS">SLS</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] text-text-secondary uppercase mb-1">Status *</label>
                        <select 
                          value={newPrinterStatus}
                          onChange={(e) => setNewPrinterStatus(e.target.value)}
                          className="w-full px-2 py-1.5 bg-background border border-border rounded text-[11px] text-foreground focus:outline-none"
                        >
                          <option value="Idle">Idle</option>
                          <option value="Printing">Printing</option>
                          <option value="Maintenance">Maintenance</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] text-text-secondary uppercase mb-1">Build Volume *</label>
                      <input 
                        type="text" 
                        required 
                        value={newPrinterVolume}
                        onChange={(e) => setNewPrinterVolume(e.target.value)}
                        placeholder="e.g., 200 x 200 x 200 mm"
                        className="w-full px-2.5 py-1.5 bg-background border border-border rounded text-[11px] text-foreground focus:outline-none focus:border-foreground"
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="w-full py-1.5 bg-foreground text-background font-bold uppercase tracking-wider rounded text-[10px]"
                    >
                      Add Printer
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: INVENTORY STOCKS */}
        {activeTab === 'inventory' && (
          <div className="space-y-8 font-mono text-xs">
            <h2 className="text-xs uppercase tracking-widest text-text-secondary border-b border-border pb-4">
              Material Stocks Management
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Materials Table */}
              <div className="lg:col-span-2 border border-border rounded-xl p-6 bg-card space-y-4">
                <h3 className="text-xs uppercase text-text-secondary">Filament & Resin Stock</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border text-[10px] text-text-secondary uppercase">
                        <th className="py-2">Brand</th>
                        <th className="py-2">Material Name</th>
                        <th className="py-2">Type</th>
                        <th className="py-2">Color</th>
                        <th className="py-2">Available</th>
                        <th className="py-2">Reserved</th>
                        <th className="py-2">Threshold</th>
                        <th className="py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {materials.map((mat) => {
                        const isEditing = editingMaterialId === mat.id;
                        const availableQty = (mat.available !== undefined ? mat.available : mat.available_stock) || 0;
                        const reservedQty = (mat.reserved !== undefined ? mat.reserved : (mat.reserved_stock ?? 0)) || 0;
                        const thresholdQty = mat.reorder_level !== undefined ? mat.reorder_level : 1.0;
                        
                        return (
                          <tr key={mat.id} className="text-foreground">
                            <td className="py-3">
                              {isEditing ? (
                                <input 
                                  type="text"
                                  value={editMatBrand}
                                  onChange={(e) => setEditMatBrand(e.target.value)}
                                  className="w-24 px-1.5 py-0.5 bg-background border border-border rounded text-xs text-foreground focus:outline-none"
                                />
                              ) : (
                                <span className="font-bold text-text-secondary">{mat.brand || 'Generic'}</span>
                              )}
                            </td>
                            <td className="py-3 font-bold">
                              {isEditing ? (
                                <input 
                                  type="text"
                                  value={editMatName}
                                  onChange={(e) => setEditMatName(e.target.value)}
                                  className="w-32 px-1.5 py-0.5 bg-background border border-border rounded text-xs text-foreground focus:outline-none"
                                />
                              ) : (
                                mat.name
                              )}
                            </td>
                            <td className="py-3">
                              {isEditing ? (
                                <select
                                  value={editMatType}
                                  onChange={(e) => setEditMatType(e.target.value)}
                                  className="px-1.5 py-0.5 bg-background border border-border rounded text-xs text-foreground focus:outline-none"
                                >
                                  <option value="PLA">PLA</option>
                                  <option value="PETG">PETG</option>
                                  <option value="ABS">ABS</option>
                                  <option value="TPU">TPU</option>
                                  <option value="Resin">Resin</option>
                                </select>
                              ) : (
                                mat.type || mat.name.split(' ')[0]
                              )}
                            </td>
                            <td className="py-3">
                              {isEditing ? (
                                <div className="flex items-center gap-1.5">
                                  <input 
                                    type="color"
                                    value={editMatColor}
                                    onChange={(e) => setEditMatColor(e.target.value)}
                                    className="w-6 h-6 rounded border border-border cursor-pointer p-0 bg-transparent"
                                  />
                                  <input 
                                    type="text"
                                    value={editMatColor}
                                    onChange={(e) => setEditMatColor(e.target.value)}
                                    className="w-20 px-1.5 py-0.5 bg-background border border-border rounded text-xs text-foreground focus:outline-none font-mono"
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  {(() => {
                                    const cHex = (mat.color && mat.color.startsWith('#'))
                                      ? mat.color
                                      : FILAMENT_COLORS.find(c => c.name.toLowerCase() === (mat.color || '').toLowerCase())?.hex || '#6b7280';
                                    return (
                                      <span 
                                        className="w-3 h-3 rounded-full border border-border/40 inline-block shadow-sm"
                                        style={{ backgroundColor: cHex }}
                                      />
                                    );
                                  })()}
                                  <span>{mat.color || 'Standard'}</span>
                                </div>
                              )}
                            </td>
                            <td className="py-3">
                              {isEditing ? (
                                <input 
                                  type="number"
                                  step="0.01"
                                  value={editMatStock}
                                  onChange={(e) => setEditMatStock(parseFloat(e.target.value) || 0.0)}
                                  className="w-20 px-1.5 py-0.5 bg-background border border-border rounded text-xs text-foreground focus:outline-none"
                                />
                              ) : (
                                <span className={`font-bold ${availableQty <= thresholdQty ? 'text-red-500' : 'text-foreground'}`}>
                                  {availableQty.toFixed(2)} kg
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-text-secondary">
                              {reservedQty.toFixed(2)} kg
                            </td>
                            <td className="py-3 text-text-secondary">
                              {isEditing ? (
                                <input 
                                  type="number"
                                  step="0.1"
                                  value={editMatReorder}
                                  onChange={(e) => setEditMatReorder(parseFloat(e.target.value) || 0.0)}
                                  className="w-16 px-1.5 py-0.5 bg-background border border-border rounded text-xs text-foreground focus:outline-none"
                                />
                              ) : (
                                <span>{thresholdQty.toFixed(1)} kg</span>
                              )}
                            </td>
                            <td className="py-3 text-right">
                              {isEditing ? (
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => handleSaveMaterialEdits(mat.id)}
                                    className="p-1 border border-border rounded bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-all cursor-pointer"
                                    title="Save"
                                  >
                                    <Check size={12} />
                                  </button>
                                  <button
                                    onClick={() => setEditingMaterialId(null)}
                                    className="p-1 border border-border rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all cursor-pointer"
                                    title="Cancel"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    onClick={() => {
                                      setEditingMaterialId(mat.id);
                                      setEditMatBrand(mat.brand || 'Generic');
                                      setEditMatStock(availableQty);
                                      setEditMatReorder(thresholdQty);
                                      setEditMatName(mat.name || '');
                                      setEditMatType(mat.type || 'PLA');
                                      setEditMatColor(mat.color || '#ef4444');
                                    }}
                                    className="p-1 border border-border rounded bg-foreground/5 hover:bg-foreground/10 text-foreground transition-all cursor-pointer"
                                    title="Edit"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMaterial(mat.id)}
                                    className="p-1 border border-border rounded bg-red-500/5 hover:bg-red-500/10 text-red-500 transition-all cursor-pointer"
                                    title="Delete"
                                  >
                                    <Trash size={12} />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Material Form */}
              <div className="border border-border rounded-xl p-6 bg-card space-y-4 h-fit">
                <h3 className="text-xs uppercase text-text-secondary">Register New Material</h3>
                <form onSubmit={handleAddMaterial} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-text-secondary uppercase mb-1">Brand Name *</label>
                      <input 
                        type="text" 
                        required 
                        value={newMatBrand}
                        onChange={(e) => setNewMatBrand(e.target.value)}
                        placeholder="e.g., eSUN, Polymaker"
                        className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:border-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-text-secondary uppercase mb-1">Material Name *</label>
                      <input 
                        type="text" 
                        required 
                        value={newMatName}
                        onChange={(e) => setNewMatName(e.target.value)}
                        placeholder="e.g., PLA Black Premium"
                        className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:border-foreground"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-text-secondary uppercase mb-1">Type *</label>
                      <select 
                        value={newMatType}
                        onChange={(e) => setNewMatType(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none"
                      >
                        <option value="PLA">PLA</option>
                        <option value="PETG">PETG</option>
                        <option value="ABS">ABS</option>
                        <option value="TPU">TPU</option>
                        <option value="Resin">Resin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-text-secondary uppercase mb-1">Initial Stock (kg) *</label>
                      <input 
                        type="number" 
                        required 
                        step="0.01"
                        value={newMatStock}
                        onChange={(e) => setNewMatStock(parseFloat(e.target.value) || 5.0)}
                        className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-[10px] text-text-secondary uppercase mb-1">
                      Color Selection * <span className="text-foreground font-bold">{newMatColor}</span>
                    </label>

                    {/* macOS/iOS style Color Picker Container */}
                    <div className="border border-border rounded-2xl bg-card p-4 space-y-4 max-w-[320px] shadow-lg mx-auto font-sans">
                      {/* Top bar */}
                      <div className="flex items-center justify-between">
                        {/* Eye dropper icon on left */}
                        <button
                          type="button"
                          onClick={handleOpenEyeDropper}
                          className="p-1 rounded hover:bg-muted/50 text-blue-500 transition-colors"
                          title="Eye Dropper"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19.35 2.54a2.72 2.72 0 00-3.83 0L12 6.03l-1.46-1.46a.5.5 0 00-.7.7l1.46 1.46-6.36 6.36a1 1 0 00-.28.53L3.54 19.8a.5.5 0 00.56.56l6.18-1.12a1 1 0 00.53-.28l6.36-6.36 1.46 1.46a.5.5 0 00.7-.7l-1.46-1.46 3.48-3.48a2.72 2.72 0 000-3.88zM9.54 18.25L4.8 19.1l.85-4.74z"/>
                          </svg>
                        </button>

                        <span className="text-xs font-bold text-foreground">Colors</span>

                        {/* Dummy close button on right to match iOS UI style */}
                        <div className="w-5 h-5 rounded-full bg-muted/40 flex items-center justify-center text-text-secondary text-[8px] cursor-not-allowed">
                          ✕
                        </div>
                      </div>

                      {/* Segmented control tabs */}
                      <div className="bg-muted/40 p-0.5 rounded-lg flex text-[10px]">
                        <button
                          type="button"
                          onClick={() => setColorPickerTab('grid')}
                          className={`flex-1 py-1 text-center font-bold rounded-md transition-all ${
                            colorPickerTab === 'grid'
                              ? 'bg-background text-foreground shadow'
                              : 'text-text-secondary hover:text-foreground'
                          }`}
                        >
                          Grid
                        </button>
                        <button
                          type="button"
                          className="flex-1 py-1 text-center font-medium text-text-secondary opacity-40 cursor-not-allowed"
                          title="Spectrum (Not implemented)"
                        >
                          Spectrum
                        </button>
                        <button
                          type="button"
                          onClick={() => setColorPickerTab('sliders')}
                          className={`flex-1 py-1 text-center font-bold rounded-md transition-all ${
                            colorPickerTab === 'sliders'
                              ? 'bg-background text-foreground shadow'
                              : 'text-text-secondary hover:text-foreground'
                          }`}
                        >
                          Sliders
                        </button>
                      </div>

                      {/* Tab contents */}
                      {colorPickerTab === 'grid' ? (
                        <div className="space-y-1">
                          {/* Row 1: Grayscale */}
                          <div className="grid grid-cols-12 gap-0.5">
                            {[
                              '#ffffff', '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280',
                              '#4b5563', '#374151', '#1f2937', '#111827', '#030712', '#000000'
                            ].map((shade) => (
                              <button
                                key={shade}
                                type="button"
                                onClick={() => handleSelectColor(shade)}
                                className={`w-full aspect-square rounded-[2px] transition-all hover:scale-125 border border-black/10 relative ${
                                  newMatColor.toLowerCase() === shade.toLowerCase() ? 'ring-1 ring-offset-1 ring-foreground z-10' : ''
                                }`}
                                style={{ backgroundColor: shade }}
                                title={shade}
                              />
                            ))}
                          </div>

                          {/* Rows 2-8: HSL grid */}
                          <div className="grid grid-cols-12 gap-0.5">
                            {[90, 80, 70, 60, 50, 40, 30].map((lightness) => (
                              <React.Fragment key={lightness}>
                                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((hue) => {
                                  const l = lightness / 100;
                                  const a = (100 * Math.min(l, 1 - l)) / 100;
                                  const f = (n: number) => {
                                    const k = (n + hue / 30) % 12;
                                    const colorVal = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                                    return Math.round(255 * colorVal).toString(16).padStart(2, '0');
                                  };
                                  const hexColor = `#${f(0)}${f(8)}${f(4)}`;

                                  const isSelected = newMatColor.toLowerCase() === hexColor.toLowerCase();

                                  return (
                                    <button
                                      key={`${hue}-${lightness}`}
                                      type="button"
                                      onClick={() => handleSelectColor(hexColor)}
                                      className={`w-full aspect-square rounded-[2px] transition-all hover:scale-125 border border-black/10 relative ${
                                        isSelected ? 'ring-1 ring-offset-1 ring-foreground z-10' : ''
                                      }`}
                                      style={{ backgroundColor: hexColor }}
                                      title={hexColor}
                                    />
                                  );
                                })}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {/* Red Slider */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-text-secondary font-mono">
                              <span>Red</span>
                              <span>{rgbRed}</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="255"
                              value={rgbRed}
                              onChange={(e) => updateColorFromRGB(parseInt(e.target.value), rgbGreen, rgbBlue)}
                              className="w-full h-1.5 rounded bg-gradient-to-r from-black to-red-500 appearance-none cursor-pointer"
                            />
                          </div>

                          {/* Green Slider */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-text-secondary font-mono">
                              <span>Green</span>
                              <span>{rgbGreen}</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="255"
                              value={rgbGreen}
                              onChange={(e) => updateColorFromRGB(rgbRed, parseInt(e.target.value), rgbBlue)}
                              className="w-full h-1.5 rounded bg-gradient-to-r from-black to-green-500 appearance-none cursor-pointer"
                            />
                          </div>

                          {/* Blue Slider */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-text-secondary font-mono">
                              <span>Blue</span>
                              <span>{rgbBlue}</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="255"
                              value={rgbBlue}
                              onChange={(e) => updateColorFromRGB(rgbRed, rgbGreen, parseInt(e.target.value))}
                              className="w-full h-1.5 rounded bg-gradient-to-r from-black to-blue-500 appearance-none cursor-pointer"
                            />
                          </div>
                        </div>
                      )}

                      {/* Opacity slider */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-text-secondary font-mono uppercase tracking-wider">
                          <span>Opacity</span>
                          <span>{pickerOpacity}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={pickerOpacity}
                            onChange={(e) => setPickerOpacity(parseInt(e.target.value))}
                            className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-neutral-200 dark:bg-neutral-800"
                            style={{
                              backgroundImage: `linear-gradient(to right, rgba(0,0,0,0), ${newMatColor})`
                            }}
                          />
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="border-t border-border/60 my-2" />

                      {/* Bottom Swatches Block */}
                      <div className="flex items-center gap-3">
                        {/* Large Color Preview Box */}
                        <div 
                          className="w-10 h-10 rounded-xl border border-border/40 shadow-inner shrink-0"
                          style={{ 
                            backgroundColor: newMatColor, 
                            opacity: pickerOpacity / 100 
                          }}
                        />

                        {/* Circular Swatches grid */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {savedSwatches.map((swatch, idx) => {
                            const isSwatchSelected = newMatColor.toLowerCase() === swatch.toLowerCase();
                            return (
                              <button
                                key={`${swatch}-${idx}`}
                                type="button"
                                onClick={() => handleSelectColor(swatch)}
                                className={`w-5 h-5 rounded-full border border-border/20 shadow-sm transition-transform active:scale-90 relative ${
                                  isSwatchSelected ? 'ring-1 ring-offset-1 ring-foreground scale-110 z-10' : 'hover:scale-105'
                                }`}
                                style={{ backgroundColor: swatch }}
                                title={swatch}
                              >
                                {isSwatchSelected && (
                                  <span className="absolute inset-0 flex items-center justify-center">
                                    <Check size={8} className={swatch === '#ffffff' ? 'text-black' : 'text-white'} />
                                  </span>
                                )}
                              </button>
                            );
                          })}

                          {/* Add (+) Swatch Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (!savedSwatches.map(s => s.toLowerCase()).includes(newMatColor.toLowerCase())) {
                                setSavedSwatches([...savedSwatches, newMatColor]);
                              }
                            }}
                            className="w-5 h-5 rounded-full border border-dashed border-text-secondary flex items-center justify-center text-text-secondary hover:border-foreground hover:text-foreground text-xs font-bold transition-all"
                            title="Save current color"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Manual input fallback */}
                    <input
                      type="text"
                      required
                      value={newMatColor}
                      onChange={(e) => handleSelectColor(e.target.value)}
                      placeholder="Or enter hex color code (e.g. #ef4444)"
                      className="w-full px-3 py-1.5 bg-background border border-border rounded text-[11px] focus:outline-none focus:border-foreground text-center font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-text-secondary uppercase mb-1">Reorder Level (kg) *</label>
                    <input 
                      type="number" 
                      required 
                      step="0.1"
                      value={newMatReorder}
                      onChange={(e) => setNewMatReorder(parseFloat(e.target.value) || 1.0)}
                      className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none"
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="w-full py-2 bg-foreground text-background font-bold uppercase tracking-wider rounded"
                  >
                    Add Material
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: ORDER MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-6 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-border pb-4">
              <div>
                <h2 className="text-base font-bold uppercase tracking-wider text-foreground">Order Management</h2>
                <p className="text-text-secondary text-[11px] mt-1">Manage direct catalog product orders, update delivery statuses, and process shipping details.</p>
              </div>
              <button 
                onClick={fetchOrders}
                className="p-2 border border-border rounded hover:bg-card text-foreground transition-all flex items-center gap-1.5 font-bold uppercase text-[10px]"
              >
                <RefreshCw size={12} className={loadingOrders ? 'animate-spin' : ''} />
                Refresh Orders
              </button>
            </div>

            {loadingOrders ? (
              <div className="flex justify-center p-12">
                <div className="w-6 h-6 rounded-full border-2 border-foreground border-t-transparent animate-spin"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="border border-border border-dashed rounded-lg p-12 text-center bg-card/30">
                <p className="text-text-secondary">No direct catalog orders found in the database.</p>
              </div>
            ) : (
              <div className="border border-border rounded-xl bg-card overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-background/50 font-bold uppercase text-[10px] tracking-wider text-text-secondary">
                      <th className="p-4">ID</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Product</th>
                      <th className="p-4">Quantity</th>
                      <th className="p-4">Total Price</th>
                      <th className="p-4">Shipping Address</th>
                      <th className="p-4">Tracking Info</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {orders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-background/20 transition-colors">
                        <td className="p-4 font-bold">#{ord.id}</td>
                        <td className="p-4 font-bold text-foreground">
                          {ord.customer_username}
                        </td>
                        <td className="p-4">
                          {ord.product_title}
                        </td>
                        <td className="p-4 font-bold">{ord.quantity}</td>
                        <td className="p-4 font-bold text-foreground">₹ {parseFloat(String(ord.total_price || '0')).toFixed(2)}</td>
                        <td className="p-4 max-w-xs truncate" title={ord.shipping_address}>
                          {ord.shipping_address}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <input 
                              type="text"
                              placeholder="Carrier"
                              defaultValue={ord.shipping_carrier || ''}
                              onBlur={(e) => handleUpdateOrderTracking(ord.id, e.target.value, ord.tracking_number || '')}
                              className="px-1.5 py-1 bg-background border border-border rounded w-28 focus:outline-none focus:border-foreground"
                            />
                            <input 
                              type="text"
                              placeholder="Tracking ID"
                              defaultValue={ord.tracking_number || ''}
                              onBlur={(e) => handleUpdateOrderTracking(ord.id, ord.shipping_carrier || '', e.target.value)}
                              className="px-1.5 py-1 bg-background border border-border rounded w-28 focus:outline-none focus:border-foreground"
                            />
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded text-[9px] border font-bold uppercase tracking-wider ${
                            ord.status === 'Pending' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' :
                            ord.status === 'Processing' ? 'text-blue-500 bg-blue-500/10 border-blue-500/20' :
                            ord.status === 'Shipped' ? 'text-purple-500 bg-purple-500/10 border-purple-500/20' :
                            ord.status === 'Delivered' ? 'text-green-500 bg-green-500/10 border-green-500/20' :
                            'text-red-500 bg-red-500/10 border-red-500/20'
                          }`}>
                            {ord.status}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end items-center gap-2">
                            <select 
                              value={ord.status}
                              onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                              className="px-2 py-1 bg-background border border-border rounded text-[10px] font-mono text-foreground focus:outline-none focus:border-foreground"
                            >
                              <option value="Pending">Pending</option>
                              <option value="Processing">Processing</option>
                              <option value="Shipped">Shipped</option>
                              <option value="Delivered">Delivered</option>
                              <option value="Cancelled">Cancelled</option>
                            </select>
                            
                            <button 
                              onClick={() => handleDeleteOrder(ord.id)}
                              className="p-1 border border-border rounded hover:border-red-500/50 hover:bg-red-500/5 text-red-500 transition-colors"
                              title="Delete Order"
                            >
                              <Trash size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: PRODUCT CATALOG MANAGEMENT */}
        {activeTab === 'products' && (
          <div className="space-y-8 font-mono text-xs">
            <h2 className="text-xs uppercase tracking-widest text-text-secondary border-b border-border pb-4">
              Product Catalog Management
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Products Table */}
              <div className="lg:col-span-2 border border-border rounded-xl p-6 bg-card space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs uppercase text-text-secondary">All Products</h3>
                  <button 
                    onClick={fetchProducts}
                    className="p-1 border border-border rounded hover:bg-card text-foreground flex items-center gap-1 text-[9px] uppercase font-bold"
                  >
                    <RefreshCw size={10} className={loadingProducts ? 'animate-spin' : ''} />
                    Refresh
                  </button>
                </div>
                
                {loadingProducts ? (
                  <div className="flex justify-center p-8">
                    <div className="w-5 h-5 rounded-full border border-foreground border-t-transparent animate-spin"></div>
                  </div>
                ) : products.length === 0 ? (
                  <div className="border border-border border-dashed rounded-lg p-8 text-center text-text-secondary">
                    No products found in the catalog.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {products.map((prod) => {
                      const isEditing = editingProductId === prod.id;
                      return (
                        <div key={prod.id} className="border border-border rounded-xl bg-card overflow-hidden flex flex-col justify-between group transition-all hover:border-foreground/30 hover:shadow-sm">
                          {/* Image section */}
                          <div className="relative w-full h-32 bg-background border-b border-border flex items-center justify-center overflow-hidden">
                            {isEditing ? (
                              <div className="absolute inset-0 p-3 bg-card/90 flex flex-col justify-center items-center gap-1.5 overflow-y-auto">
                                <label className="text-[9px] text-text-secondary uppercase">Upload Image or STL</label>
                                <input 
                                  type="file"
                                  multiple
                                  accept="image/*,.stl"
                                  onChange={(e) => {
                                    if (e.target.files && e.target.files.length > 0) {
                                      setEditProdMedia(Array.from(e.target.files));
                                      setEditProdPath(''); // Clear path if file selected
                                    }
                                  }}
                                  className="w-full text-[10px] cursor-pointer"
                                />
                                <div className="w-full flex items-center gap-1 text-[8px] text-text-secondary uppercase">
                                  <span className="h-px bg-border flex-1" />
                                  <span>OR Path</span>
                                  <span className="h-px bg-border flex-1" />
                                </div>
                                <input 
                                  type="text"
                                  value={editProdPath}
                                  onChange={(e) => {
                                    setEditProdPath(e.target.value);
                                    if (e.target.value) {
                                      setEditProdMedia([]);
                                      setEditProdImage(null);
                                    }
                                  }}
                                  placeholder="e.g. /models/lipstick_case.stl"
                                  className="w-full px-2 py-0.5 bg-background border border-border rounded text-[9px] focus:outline-none focus:border-foreground text-center"
                                />
                              </div>
                            ) : (
                              <>
                                {prod.image ? (
                                  prod.image.toLowerCase().endsWith('.stl') ? (
                                    <div className="w-full h-full bg-cyan-950/10 flex flex-col items-center justify-center p-3 text-center border-b border-border/10">
                                      <span className="text-cyan-500 font-bold text-[10px] uppercase tracking-wider mb-1">3D STL MODEL</span>
                                      <span className="text-[9px] text-text-secondary font-mono truncate max-w-[150px]">{prod.image.split('/').pop()}</span>
                                    </div>
                                  ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img 
                                      src={prod.image.startsWith('http') ? prod.image : `${R2_BASE}${prod.image}`}
                                      alt={prod.title} 
                                      className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
                                    />
                                  )
                                ) : (
                                  <div className="text-[9px] text-text-secondary uppercase">No Image</div>
                                )}
                              </>
                            )}

                            {/* Status badge in corner */}
                            {!isEditing && (
                              <span className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[8px] border font-bold uppercase tracking-wider ${
                                prod.status === 'active' 
                                  ? 'text-green-500 bg-green-500/10 border-green-500/20' 
                                  : 'text-red-500 bg-red-500/10 border-red-500/20'
                              }`}>
                                {prod.status}
                              </span>
                            )}
                          </div>

                          {/* Content section */}
                          <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                            <div className="space-y-2">
                              {isEditing ? (
                                <div className="space-y-2">
                                  <div>
                                    <label className="block text-[8px] text-text-secondary uppercase mb-0.5">Title</label>
                                    <input 
                                      type="text"
                                      value={editProdTitle}
                                      onChange={(e) => setEditProdTitle(e.target.value)}
                                      className="w-full px-2 py-1 bg-background border border-border rounded text-xs text-foreground focus:outline-none focus:border-foreground font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[8px] text-text-secondary uppercase mb-0.5">Description</label>
                                    <textarea 
                                      value={editProdDesc}
                                      onChange={(e) => setEditProdDesc(e.target.value)}
                                      rows={2}
                                      className="w-full px-2 py-1 bg-background border border-border rounded text-[10px] text-foreground focus:outline-none focus:border-foreground font-mono"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <h4 className="font-bold text-foreground text-sm line-clamp-1">{prod.title}</h4>
                                  <p className="text-[10px] text-text-secondary font-normal line-clamp-2 mt-1 leading-normal">{prod.description}</p>
                                </div>
                              )}
                            </div>

                            {/* Category, price, status */}
                            <div className="space-y-2 pt-2 border-t border-border/40">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="block text-[8px] text-text-secondary uppercase">Category</span>
                                  {isEditing ? (
                                    <select 
                                      value={editProdCategory}
                                      onChange={(e) => setEditProdCategory(e.target.value)}
                                      className="w-full px-1.5 py-0.5 bg-background border border-border rounded text-[10px] text-foreground focus:outline-none"
                                    >
                                      <option value="Personalized">Personalized</option>
                                      <option value="Engineering">Engineering</option>
                                      <option value="Robotics">Robotics</option>
                                      <option value="Home Decor">Home Decor</option>
                                      <option value="Gaming">Gaming</option>
                                      <option value="Education">Education</option>
                                    </select>
                                  ) : (
                                    <span className="text-[10px] font-semibold text-text-secondary">{prod.category}</span>
                                  )}
                                </div>

                                <div>
                                  <span className="block text-[8px] text-text-secondary uppercase">Price</span>
                                  {isEditing ? (
                                    <input 
                                      type="number"
                                      step="0.01"
                                      value={editProdRate}
                                      onChange={(e) => setEditProdRate(parseFloat(e.target.value) || 0.0)}
                                      className="w-full px-1.5 py-0.5 bg-background border border-border rounded text-[10px] text-foreground focus:outline-none font-mono"
                                    />
                                  ) : (
                                    <span className="text-[10px] font-bold text-foreground font-mono">₹ {Number(prod.rate || 0).toFixed(0)}</span>
                                  )}
                                </div>
                              </div>

                              {isEditing && (
                                <div>
                                  <label className="block text-[8px] text-text-secondary uppercase mb-0.5">Status</label>
                                  <select 
                                    value={editProdStatus}
                                    onChange={(e) => setEditProdStatus(e.target.value)}
                                    className="w-full px-1.5 py-0.5 bg-background border border-border rounded text-[10px] text-foreground focus:outline-none"
                                  >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Footer action bar */}
                          <div className="p-3 bg-muted/10 border-t border-border/40 flex justify-end gap-2 shrink-0">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSaveProductEdits(prod.id)}
                                  className="px-2.5 py-1 text-[10px] uppercase font-bold border border-green-500/30 rounded bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <Check size={10} />
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingProductId(null)}
                                  className="px-2.5 py-1 text-[10px] uppercase font-bold border border-border rounded bg-foreground/5 hover:bg-foreground/10 text-foreground transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <X size={10} />
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingProductId(prod.id);
                                    setEditProdTitle(prod.title);
                                    setEditProdDesc(prod.description);
                                    setEditProdCategory(prod.category);
                                    setEditProdRate(prod.rate || 0);
                                    setEditProdStatus(prod.status || 'active');
                                    setEditProdImage(null);
                                    setEditProdPath(prod.image_key || prod.image || '');
                                  }}
                                  className="px-2.5 py-1 text-[10px] uppercase font-bold border border-border rounded bg-foreground/5 hover:bg-foreground/10 text-foreground transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit2 size={10} />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(prod.id)}
                                  className="px-2.5 py-1 text-[10px] uppercase font-bold border border-red-500/20 rounded bg-red-500/5 hover:bg-red-500/10 text-red-500 transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <Trash size={10} />
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add Product Form */}
              <div className="border border-border rounded-xl p-6 bg-card space-y-4 h-fit">
                <h3 className="text-xs uppercase text-text-secondary">Register New Product</h3>
                <form onSubmit={handleAddProduct} className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-text-secondary uppercase mb-1">Product Title *</label>
                    <input 
                      type="text" 
                      required 
                      value={newProdTitle}
                      onChange={(e) => setNewProdTitle(e.target.value)}
                      placeholder="e.g., Customizable Aero Helmet"
                      className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:border-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-text-secondary uppercase mb-1">Description *</label>
                    <textarea 
                      required 
                      value={newProdDesc}
                      onChange={(e) => setNewProdDesc(e.target.value)}
                      placeholder="Product details, material suitability, etc."
                      rows={3}
                      className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:border-foreground"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] text-text-secondary uppercase mb-1">Category *</label>
                      <select 
                        value={newProdCategory}
                        onChange={(e) => setNewProdCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none"
                      >
                        <option value="Personalized">Personalized</option>
                        <option value="Engineering">Engineering</option>
                        <option value="Robotics">Robotics</option>
                        <option value="Home Decor">Home Decor</option>
                        <option value="Gaming">Gaming</option>
                        <option value="Education">Education</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-text-secondary uppercase mb-1">Price (₹) *</label>
                      <input 
                        type="number" 
                        required 
                        step="0.01"
                        value={newProdRate}
                        onChange={(e) => setNewProdRate(parseFloat(e.target.value) || 0.00)}
                        className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:border-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-text-secondary uppercase mb-1">Product Media (Images / 3D STL Models)</label>
                    <input 
                      type="file" 
                      multiple
                      required={!newProdPath && newProdMedia.length === 0 && !newProdImage}
                      accept="image/*,.stl"
                      id="new-prod-media"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setNewProdMedia(Array.from(e.target.files));
                          setNewProdImage(e.target.files[0]); // For backward compat visual
                          setNewProdPath('');
                        }
                      }}
                      className="w-full text-xs text-foreground bg-background border border-border rounded p-2 focus:outline-none cursor-pointer"
                    />
                    
                    {newProdMedia.length > 0 && (
                      <div className="mt-2 text-[10px] text-text-secondary flex flex-wrap gap-1">
                        {newProdMedia.map((f, idx) => (
                          <span key={idx} className="bg-foreground/10 px-2 py-1 rounded">{f.name}</span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-[8px] text-text-secondary my-2 uppercase font-bold tracking-wider">
                      <span className="h-px bg-border flex-1" />
                      <span>OR enter path manually</span>
                      <span className="h-px bg-border flex-1" />
                    </div>

                    <input 
                      type="text"
                      required={!newProdPath && !newProdImage}
                      value={newProdPath}
                      onChange={(e) => {
                        setNewProdPath(e.target.value);
                        if (e.target.value) {
                          setNewProdImage(null);
                          setNewProdMedia([]);
                          const fileInput = document.getElementById('new-prod-media') as HTMLInputElement;
                          if (fileInput) fileInput.value = '';
                        }
                      }}
                      placeholder="e.g. /models/lipstick_case_keychain.stl"
                      className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:border-foreground"
                    />
                    <p className="text-[10px] text-text-secondary mt-1">Upload a preview file (.stl, .jpg, .png) or specify a path directly.</p>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full py-2 bg-foreground text-background font-bold uppercase tracking-wider rounded"
                  >
                    Add Product
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-widest">User Management</h2>
                <p className="text-[11px] text-text-secondary font-mono mt-0.5">{allUsers.length} registered accounts</p>
              </div>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="px-3 py-2 text-xs font-mono bg-background border border-border rounded-lg focus:outline-none focus:border-foreground w-48"
                />
                <button
                  onClick={fetchUsers}
                  className="p-2 border border-border rounded-lg hover:bg-card text-foreground"
                  title="Refresh"
                >
                  <RefreshCw size={13} />
                </button>
                <button
                  onClick={() => setCreateUserOpen(true)}
                  className="px-3.5 py-2 text-xs font-mono bg-foreground text-background rounded-lg hover:opacity-90 transition-opacity font-bold uppercase tracking-wider flex items-center gap-1.5"
                >
                  <Plus size={13} />
                  Create User
                </button>
              </div>
            </div>

            {loadingUsers ? (
              <div className="flex items-center justify-center h-40 text-text-secondary text-xs font-mono">
                <span className="w-4 h-4 rounded-full border-2 border-foreground border-t-transparent animate-spin mr-3" />
                Loading users...
              </div>
            ) : (
              <div className="border border-border rounded-2xl overflow-hidden">
                <table className="w-full text-xs font-mono">
                  <thead className="bg-card border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 text-text-secondary uppercase tracking-wider text-[10px]">User</th>
                      <th className="text-left px-4 py-3 text-text-secondary uppercase tracking-wider text-[10px]">Email</th>
                      <th className="text-left px-4 py-3 text-text-secondary uppercase tracking-wider text-[10px]">Role</th>
                      <th className="text-left px-4 py-3 text-text-secondary uppercase tracking-wider text-[10px]">Joined</th>
                      <th className="text-right px-4 py-3 text-text-secondary uppercase tracking-wider text-[10px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {allUsers
                      .filter(u =>
                        !userSearch ||
                        u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.email.toLowerCase().includes(userSearch.toLowerCase())
                      )
                      .map((u: DashboardUser) => {
                        const roleBadge: Record<string, string> = {
                          super_admin: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
                          admin:       'bg-blue-500/10 text-blue-500 border-blue-500/20',
                          staff:       'bg-amber-500/10 text-amber-600 border-amber-500/20',
                          customer:    'bg-green-500/10 text-green-600 border-green-500/20',
                          visitor:     'bg-foreground/5 text-text-secondary border-border',
                        };
                        const isSelf = u.id === user?.id;
                        const isProtected = ['admin', 'super_admin'].includes(u.role) && user?.role !== 'super_admin';
                        return (
                          <tr key={u.id} className={`hover:bg-card/50 transition-colors ${isSelf ? 'bg-foreground/3' : ''}`}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-foreground/10 border border-border flex items-center justify-center text-[10px] font-bold text-foreground shrink-0">
                                  {u.username[0].toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-foreground">{u.username}</div>
                                  {isSelf && <div className="text-[9px] text-text-secondary">You</div>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-text-secondary">{u.email}</td>
                            <td className="px-4 py-3">
                              {!isSelf && !isProtected ? (
                                <select
                                  value={u.role}
                                  onChange={async (e) => {
                                    const res = await apiFetch(`/users/${u.id}`, {
                                      method: 'PATCH',
                                      body: JSON.stringify({ role: e.target.value }),
                                    });
                                    if (res.ok) fetchUsers();
                                  }}
                                  className="text-[10px] font-mono bg-background border border-border rounded-lg px-2 py-1 focus:outline-none focus:border-foreground"
                                >
                                  <option value="visitor">Visitor</option>
                                  <option value="customer">Customer</option>
                                  <option value="staff">Staff</option>
                                  <option value="admin">Admin</option>
                                  {user?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                                </select>
                              ) : (
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${roleBadge[u.role] ?? roleBadge.visitor}`}>
                                  {u.role.replace('_', ' ')}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-text-secondary">
                              {new Date(u.created_at || '').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {!isSelf && !isProtected ? (
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => startEditUser(u)}
                                    className="p-1.5 rounded-lg border border-border text-foreground hover:bg-card transition-colors"
                                    title="Edit user"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
                                      const res = await apiFetch(`/users/${u.id}`, { method: 'DELETE' });
                                      if (res.ok || res.status === 204) fetchUsers();
                                    }}
                                    className="p-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-colors"
                                    title="Delete user"
                                  >
                                    <Trash size={12} />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-text-secondary font-mono">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {allUsers.length === 0 && (
                  <div className="text-center py-12 text-text-secondary text-xs font-mono">No users found.</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Create User Modal */}
        {createUserOpen && (
          <div className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
              <button
                onClick={() => setCreateUserOpen(false)}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-foreground/5 text-text-secondary hover:text-foreground transition-colors"
                type="button"
              >
                <X size={16} />
              </button>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-4">Create New User</h3>
              <form onSubmit={handleCreateUser} className="space-y-4 font-mono text-xs">
                {createUserError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span>{createUserError}</span>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] text-text-secondary uppercase mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="john_doe"
                    className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:border-foreground"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-secondary uppercase mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:border-foreground"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-secondary uppercase mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:border-foreground"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-text-secondary uppercase mb-1">Role *</label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none"
                    >
                      <option value="visitor">Visitor</option>
                      <option value="customer">Customer</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                      {user?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-secondary uppercase mb-1">Phone</label>
                    <input
                      type="text"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="+91 XXXXX XXXXX"
                      className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:border-foreground"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-text-secondary uppercase mb-1">Address</label>
                  <textarea
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="123 Main St..."
                    rows={2}
                    className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:border-foreground"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="w-full py-2 bg-foreground text-background font-bold uppercase tracking-wider rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity mt-2"
                >
                  {creatingUser ? 'Creating...' : 'Create User'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {editingUser && (
          <div className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
              <button
                onClick={() => setEditingUser(null)}
                className="absolute top-4 right-4 p-1 rounded-full hover:bg-foreground/5 text-text-secondary hover:text-foreground transition-colors"
                type="button"
              >
                <X size={16} />
              </button>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-4">Edit User: {editingUser.username}</h3>
              <form onSubmit={handleSaveUserEdits} className="space-y-4 font-mono text-xs">
                {editUserError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span>{editUserError}</span>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] text-text-secondary uppercase mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:border-foreground"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-secondary uppercase mb-1">Email *</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:border-foreground"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-secondary uppercase mb-1">Reset Password (Optional)</label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Leave blank to keep current password"
                    className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:border-foreground"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-text-secondary uppercase mb-1">Role *</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none"
                    >
                      <option value="visitor">Visitor</option>
                      <option value="customer">Customer</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                      {user?.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-text-secondary uppercase mb-1">Phone</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:border-foreground"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-text-secondary uppercase mb-1">Address</label>
                  <textarea
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-background border border-border rounded focus:outline-none focus:border-foreground"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingUser}
                  className="w-full py-2 bg-foreground text-background font-bold uppercase tracking-wider rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity mt-2"
                >
                  {savingUser ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>
          </div>
        )}
        {/* TAB 9: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="max-w-4xl space-y-6">
            <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">Hero Section Settings</h2>
            <div className="bg-card border border-border p-6 rounded-xl shadow-sm">
              {settingsMessage && (
                <div className={`p-4 mb-6 rounded text-sm font-bold uppercase tracking-widest ${settingsMessage.includes('Error') ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                  {settingsMessage}
                </div>
              )}
              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div>
                  <label className="block text-[10px] text-text-secondary uppercase tracking-widest mb-2 font-bold">Hero Title Line 1</label>
                  <input
                    type="text"
                    required
                    value={heroSettings.hero_title1}
                    onChange={e => setHeroSettings({...heroSettings, hero_title1: e.target.value})}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-foreground"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-secondary uppercase tracking-widest mb-2 font-bold">Hero Title Line 2 (Gradient)</label>
                  <input
                    type="text"
                    required
                    value={heroSettings.hero_title2}
                    onChange={e => setHeroSettings({...heroSettings, hero_title2: e.target.value})}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-foreground"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-secondary uppercase tracking-widest mb-2 font-bold">Hero Description</label>
                  <textarea
                    required
                    rows={4}
                    value={heroSettings.hero_description}
                    onChange={e => setHeroSettings({...heroSettings, hero_description: e.target.value})}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-foreground"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-secondary uppercase tracking-widest mb-2 font-bold">Hero Price (₹)</label>
                  <input
                    type="text"
                    required
                    value={heroSettings.hero_price}
                    onChange={e => setHeroSettings({...heroSettings, hero_price: e.target.value})}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-foreground"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-text-secondary uppercase tracking-widest mb-2 font-bold">Hero 3D Model (STL)</label>
                  <select
                    value={heroSettings.hero_model_url}
                    onChange={e => setHeroSettings({...heroSettings, hero_model_url: e.target.value})}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:border-foreground"
                  >
                    <option value="">-- Select an STL File --</option>
                    {Array.from(new Set([
                      heroSettings.hero_model_url,
                      ...products.flatMap(p => [
                        ...(p.image && p.image.toLowerCase().endsWith('.stl') ? [p.image] : []),
                        ...(p.media ? p.media.filter(m => m.toLowerCase().endsWith('.stl')) : [])
                      ])
                    ].filter(Boolean))).map((stlUrl, idx) => (
                      <option key={idx} value={stlUrl as string}>{(stlUrl as string).split('/').pop()}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-6 py-3 bg-foreground text-background font-bold uppercase tracking-widest rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
