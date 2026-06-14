'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/app/AppContext';
import STLViewer from '@/components/STLViewer';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import AuthModal from '@/components/AuthModal';
import {
  Upload, Check, AlertCircle, FileText, X
} from 'lucide-react';
import Link from 'next/link';

interface DbMaterial {
  id: number;
  type: string;
  color: string;
  available_stock: number;
  reorder_level: number;
  brand?: string;
}

export default function CustomPrint() {
  const { user, apiFetch } = useApp();
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMaterials();
  }, [fetchMaterials]);

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

  const resetStl = () => {
    setStlFiles([]);
    setBaseX(2.0);
    setBaseY(2.0);
    setBaseZ(2.0);
    setScalePercent(100);
    setDimensions('2.000 x 2.000 x 2.000 cm');
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

  return (
    <div className="min-h-screen flex flex-col font-sans bg-background">
      <Header setAuthModal={setAuthModal} />

      <main className="flex-1">
        {/* Header Section */}
        <div className="bg-gradient-to-b from-card to-background border-b border-border py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground font-sans uppercase">
              Custom 3D Printing
            </h1>
            <p className="mt-4 text-sm text-text-secondary font-mono max-w-2xl mx-auto">
              Upload your designs for instant engineering review and premium FDM manufacturing.
            </p>
          </div>
        </div>

        {/* Steps of Custom Print Section */}
        <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { num: "01", title: "Upload Design", desc: "Drag-and-drop your STL design files. The platform parses model dimensions and extracts volume metrics automatically." },
              { num: "02", title: "Expert Review", desc: "Engineers assess mesh structure, approve printability parameters, and generate an itemized cost quotation." },
              { num: "03", title: "Approve & Pay", desc: "Review your quotation sheet, complete the transaction via UPI or bank transfer, and upload your reference receipt." },
              { num: "04", title: "Live Production", desc: "Your model gets assigned to an active industrial printer. Monitor scheduling queues and build completion live." }
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
        </section>

        {/* Custom Request Portal */}
        <section className="py-12 pb-24">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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

                      <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-full text-xs font-mono">
                        <span className="text-text-secondary">Material:</span>
                        <div className="w-3.5 h-3.5 rounded border border-border/50" style={{ backgroundColor: selectedColorHex }} />
                        <span className="font-bold text-foreground uppercase">{materialPref} - {colorPref}</span>
                      </div>

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
                                <div className="w-[70%] flex flex-col justify-center">
                                  <span className="text-[10px] font-bold text-foreground uppercase tracking-wider truncate">
                                    {m.type}
                                  </span>
                                </div>
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
                      <div className="space-y-6">
                        <div className="relative border border-border rounded-xl overflow-hidden bg-background/45">
                          <STLViewer 
                            fileObject={stlFiles[0]} 
                            modelColor={selectedColorHex} 
                            onLoadDimensions={handleModelLoaded} 
                            height="360px" 
                          />
                          
                          <div className="absolute top-3 left-3 px-3 py-1 bg-background/90 dark:bg-[#111111]/90 border border-border rounded-lg shadow-sm flex items-center gap-2 max-w-[80%]">
                            <FileText size={12} className="text-foreground shrink-0" />
                            <span className="text-[10px] font-mono text-foreground truncate">{stlFiles[0].name}</span>
                            <span className="text-[9px] font-mono text-text-secondary shrink-0">
                              ({(stlFiles[0].size / 1024 / 1024).toFixed(2)} MB)
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => resetStl()}
                            className="absolute top-3 right-3 p-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-sm"
                            title="Remove file"
                          >
                            <X size={12} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                          <div className="border border-border rounded-xl p-4 bg-background/45 space-y-2 font-mono text-xs">
                            <span className="text-[10px] text-text-secondary uppercase block">Calculated Dimensions</span>
                            <span className="text-sm font-bold text-foreground block tracking-tight">
                              {dimensions}
                            </span>
                            <span className="text-[9px] text-text-secondary/80 leading-relaxed block">
                              Real-time bounds calculation linked to aspect ratio lock.
                            </span>
                          </div>

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
      </main>

      <Footer />
      <AuthModal authModal={authModal} setAuthModal={setAuthModal} />
    </div>
  );
}
