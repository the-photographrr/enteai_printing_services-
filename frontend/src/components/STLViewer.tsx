'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

interface STLViewerProps {
  fileUrl?: string;
  fileObject?: File;
  height?: string;
  modelColor?: string;
  onLoadDimensions?: (dimensions: { x: number; y: number; z: number }) => void;
}

export default function STLViewer({ fileUrl, fileObject, height = '300px', modelColor, onLoadDimensions }: STLViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onLoadDimensionsRef = useRef(onLoadDimensions);
  useEffect(() => {
    onLoadDimensionsRef.current = onLoadDimensions;
  }, [onLoadDimensions]);

  function geometryRefCleanup(mesh: THREE.Mesh | null) {
    if (mesh) {
      if (mesh.geometry) mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else if (mesh.material) {
        mesh.material.dispose();
      }
    }
  }

  useEffect(() => {
    if (!containerRef.current) return;

    const safeSetLoading = (val: boolean) => {
      Promise.resolve().then(() => setLoading(val));
    };
    const safeSetError = (val: string | null) => {
      Promise.resolve().then(() => setError(val));
    };

    const container = containerRef.current;
    const width = container.clientWidth;
    const heightPx = container.clientHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(
      document.documentElement.classList.contains('dark') ? 0x111111 : 0xf8f8f8
    );

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / heightPx, 0.1, 1000);
    camera.position.set(0, 0, 100);

    // 3. Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.1; // Don't go below grid too much

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(1, 1, 1).normalize();
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x555555, 0.5);
    dirLight2.position.set(-1, -1, -1).normalize();
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0x3b82f6, 1, 100); // Accent light
    pointLight.position.set(0, 20, 20);
    scene.add(pointLight);

    // 6. Grid Helper
    const gridHelper = new THREE.GridHelper(
      100,
      20,
      document.documentElement.classList.contains('dark') ? 0x444444 : 0xcccccc,
      document.documentElement.classList.contains('dark') ? 0x222222 : 0xeeeeee
    );
    gridHelper.position.y = -10;
    scene.add(gridHelper);

    // 7. STL Loader
    const loader = new STLLoader();
    let mesh: THREE.Mesh | null = null;

    const loadGeometry = (geometry: THREE.BufferGeometry) => {
      // Material choice - premium industrial plastic matte
      const isDark = document.documentElement.classList.contains('dark');
      const material = new THREE.MeshStandardMaterial({
        color: modelColor ? new THREE.Color(modelColor) : (isDark ? 0xdddddd : 0x333333),
        roughness: 0.6,
        metalness: 0.1,
        flatShading: true,
      });

      geometry.computeVertexNormals();
      mesh = new THREE.Mesh(geometry, material);

      // Center model
      geometry.center();

      // Fit to camera viewport
      geometry.computeBoundingSphere();
      const sphere = geometry.boundingSphere;
      if (sphere) {
        const radius = sphere.radius;
        // Position mesh so it rests on grid
        mesh.position.y = -10 + radius;
        scene.add(mesh);

        // Adjust camera position based on model size
        camera.position.set(radius * 1.5, radius * 1.5, radius * 2.5);
        camera.lookAt(mesh.position);
        controls.target.copy(mesh.position);
      }

      // Compute bounding box sizes and callback
      geometry.computeBoundingBox();
      const bbox = geometry.boundingBox;
      if (bbox) {
        const size = new THREE.Vector3();
        bbox.getSize(size);
        if (onLoadDimensionsRef.current) {
          onLoadDimensionsRef.current({
            x: size.x,
            y: size.y,
            z: size.z
          });
        }
      }

      safeSetLoading(false);
    };

    if (fileUrl) {
      loader.load(
        fileUrl,
        loadGeometry,
        () => {},
        (err) => {
          console.error(err);
          safeSetError('Failed to load STL file URL.');
          safeSetLoading(false);
        }
      );
    } else if (fileObject) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const contents = e.target?.result as ArrayBuffer;
        try {
          const geometry = loader.parse(contents);
          loadGeometry(geometry);
        } catch (err) {
          console.error(err);
          safeSetError('Failed to parse STL file content.');
          safeSetLoading(false);
        }
      };
      reader.onerror = () => {
        safeSetError('Failed to read STL file.');
        safeSetLoading(false);
      };
      reader.readAsArrayBuffer(fileObject);
    } else {
      safeSetError('No file provided.');
      safeSetLoading(false);
    }

    // 8. Animation & Resize handlers
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      
      // Auto rotate slightly if user is idle
      if (mesh && (controls as unknown as { state: number }).state === -1) {
        mesh.rotation.y += 0.005;
      }
      
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometryRefCleanup(mesh);
    };
  }, [fileUrl, fileObject, modelColor]);

  return (
    <div className="relative w-full rounded-lg overflow-hidden border border-border bg-card" style={{ height }}>
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm z-10">
          <div className="w-8 h-8 rounded-full border-2 border-foreground border-t-transparent animate-spin mb-2"></div>
          <span className="text-xs text-text-secondary uppercase tracking-widest font-mono">Loading 3D Mesh...</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-card text-center z-10">
          <span className="text-xs text-red-500 font-mono mb-2">Error: {error}</span>
          <span className="text-xs text-text-secondary uppercase tracking-widest font-mono">3D View Unavailable</span>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}
