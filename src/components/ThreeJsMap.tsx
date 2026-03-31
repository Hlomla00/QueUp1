'use client';

/**
 * ThreeJsMap.tsx — QueUp Cape Town 3D Branch Map
 *
 * Features:
 *  • Dark scene matching QueUp brand (#0A0A0A background, #C4F135 lime accents)
 *  • Cape Town ground plane with grid + coordinate labels
 *  • BoxGeometry branch pillars at real geographic positions
 *  • Firestore onSnapshot live data binding
 *  • Pillar height = currentQueue / 10
 *  • Colour: LOW=lime, MODERATE=amber, HIGH=orange, FULL=red + halo + lock icon
 *  • Raycaster click popup with branch details
 *  • OrbitControls + slow auto-rotation
 *  • Smooth lerp animations for queue updates
 */

import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { onSnapshot, collection, getFirestore } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';

// ── Firebase client init ────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp() {
  return getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

// ── Cape Town geographic reference ──────────────────────────────────────────
const CT_CENTER = { lat: -33.9249, lng: 18.4241 };
const GEO_SCALE = 800; // pixels per degree — adjust to taste

function geoToScene(lat: number, lng: number): { x: number; z: number } {
  return {
    x: (lng - CT_CENTER.lng) * GEO_SCALE,
    z: (lat - CT_CENTER.lat) * GEO_SCALE,
  };
}

// ── Branch type ─────────────────────────────────────────────────────────────
interface BranchData {
  id: string;
  name: string;
  currentQueue: number;
  capacity: number;
  congestionLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'FULL';
  department: string;
  coordinates: { lat: number; lng: number };
  avgServiceTime?: number;
}

// ── Colour palette ───────────────────────────────────────────────────────────
const COLORS = {
  LOW: 0xc4f135,       // lime
  MODERATE: 0xf5a623,  // amber
  HIGH: 0xff6b00,      // orange
  FULL: 0xff2d2d,      // red
  GROUND: 0x111111,
  GRID: 0x222222,
  LABEL: 0x555555,
  BACKGROUND: 0x0a0a0a,
  HALO: 0xff2d2d,
};

// ── Popup overlay ────────────────────────────────────────────────────────────
interface PopupState {
  visible: boolean;
  name: string;
  queue: number;
  capacity: number;
  congestion: string;
  department: string;
  wait?: number;
  x: number;
  y: number;
}

const defaultPopup: PopupState = {
  visible: false,
  name: '',
  queue: 0,
  capacity: 0,
  congestion: '',
  department: '',
  x: 0,
  y: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
export default function ThreeJsMap() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animFrameRef = useRef<number>(0);
  const branchMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const haloMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const targetHeightsRef = useRef<Map<string, number>>(new Map());
  const branchDataRef = useRef<Map<string, BranchData>>(new Map());
  const [popup, setPopup] = React.useState<PopupState>(defaultPopup);

  // ── Build scene ─────────────────────────────────────────────────────────
  const buildScene = useCallback(() => {
    if (!mountRef.current) return;

    const W = mountRef.current.clientWidth;
    const H = mountRef.current.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setClearColor(COLORS.BACKGROUND);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(COLORS.BACKGROUND, 0.008);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 2000);
    camera.position.set(0, 60, 120);
    cameraRef.current = camera;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.minDistance = 30;
    controls.maxDistance = 300;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.3;
    controlsRef.current = controls;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    scene.add(dirLight);
    const limePoint = new THREE.PointLight(0xc4f135, 0.6, 200);
    limePoint.position.set(0, 30, 0);
    scene.add(limePoint);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(320, 320, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: COLORS.GROUND,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Grid
    const grid = new THREE.GridHelper(320, 32, COLORS.GRID, COLORS.GRID);
    (grid.material as THREE.Material).opacity = 0.4;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);

    // Label: "Cape Town CBD"
    addTextSprite(scene, 'Cape Town CBD', 0, 0.5, 0, 0xc4f135, 1.2);
    addTextSprite(scene, 'Bellville', geoToScene(-33.8998, 18.6308).x, 0.5, geoToScene(-33.8998, 18.6308).z, 0x888888, 0.8);

    // Raycaster click
    renderer.domElement.addEventListener('click', (e) => handleClick(e, renderer, camera, scene));

    // Animate
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      lerpPillars();
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('click', handleClick as never);
    };
  }, []);

  // ── Lerp pillar heights ──────────────────────────────────────────────────
  function lerpPillars() {
    branchMeshesRef.current.forEach((mesh, id) => {
      const target = targetHeightsRef.current.get(id) ?? 1;
      const current = mesh.scale.y;
      if (Math.abs(current - target) > 0.01) {
        mesh.scale.y = THREE.MathUtils.lerp(current, target, 0.05);
        mesh.position.y = (mesh.scale.y * 1) / 2; // keep base on ground
      }
    });
    haloMeshesRef.current.forEach((halo) => {
      halo.rotation.y += 0.01;
      const s = 1 + 0.05 * Math.sin(Date.now() / 400);
      halo.scale.setScalar(s);
    });
  }

  // ── Spawn or update a branch pillar ─────────────────────────────────────
  function upsertBranchPillar(branch: BranchData, scene: THREE.Scene) {
    const pos = geoToScene(branch.coordinates.lat, branch.coordinates.lng);
    const height = Math.max(branch.currentQueue / 10, 0.5);
    const color = COLORS[branch.congestionLevel] ?? COLORS.LOW;

    if (branchMeshesRef.current.has(branch.id)) {
      // Update existing
      const mesh = branchMeshesRef.current.get(branch.id)!;
      (mesh.material as THREE.MeshStandardMaterial).color.setHex(color);
      (mesh.material as THREE.MeshStandardMaterial).emissive.setHex(color);
      (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = branch.congestionLevel === 'FULL' ? 0.6 : 0.15;
      targetHeightsRef.current.set(branch.id, height);

      // Halo for FULL branches
      if (branch.congestionLevel === 'FULL') {
        if (!haloMeshesRef.current.has(branch.id)) addHalo(scene, branch.id, pos);
      } else {
        removeHalo(scene, branch.id);
      }
    } else {
      // Create new pillar
      const geo = new THREE.BoxGeometry(4, 1, 4);
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: branch.congestionLevel === 'FULL' ? 0.6 : 0.15,
        roughness: 0.4,
        metalness: 0.3,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(pos.x, height / 2, pos.z);
      mesh.scale.y = height;
      mesh.castShadow = true;
      mesh.userData = { branchId: branch.id };
      scene.add(mesh);
      branchMeshesRef.current.set(branch.id, mesh);
      targetHeightsRef.current.set(branch.id, height);

      // Label
      addTextSprite(scene, branch.name, pos.x, height + 1.5, pos.z, color, 0.7);

      if (branch.congestionLevel === 'FULL') addHalo(scene, branch.id, pos);
    }
  }

  function addHalo(scene: THREE.Scene, id: string, pos: { x: number; z: number }) {
    if (haloMeshesRef.current.has(id)) return;
    const geo = new THREE.RingGeometry(3, 4.5, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: COLORS.HALO,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.4,
    });
    const halo = new THREE.Mesh(geo, mat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(pos.x, 0.05, pos.z);
    scene.add(halo);
    haloMeshesRef.current.set(id, halo);
  }

  function removeHalo(scene: THREE.Scene, id: string) {
    const halo = haloMeshesRef.current.get(id);
    if (halo) {
      scene.remove(halo);
      haloMeshesRef.current.delete(id);
    }
  }

  // ── Raycaster click ──────────────────────────────────────────────────────
  function handleClick(
    e: MouseEvent,
    renderer: THREE.WebGLRenderer,
    camera: THREE.PerspectiveCamera,
    scene: THREE.Scene
  ) {
    const rect = renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const meshes = Array.from(branchMeshesRef.current.values());
    const hits = raycaster.intersectObjects(meshes);
    if (hits.length > 0) {
      const hit = hits[0];
      const branchId = hit.object.userData.branchId as string;
      const branch = branchDataRef.current.get(branchId);
      if (branch) {
        setPopup({
          visible: true,
          name: branch.name,
          queue: branch.currentQueue,
          capacity: branch.capacity,
          congestion: branch.congestionLevel,
          department: branch.department,
          wait: branch.avgServiceTime
            ? Math.round(branch.currentQueue * (branch.avgServiceTime || 10))
            : undefined,
          x: e.clientX,
          y: e.clientY,
        });
      }
    } else {
      setPopup(defaultPopup);
    }
  }

  // ── Text sprite helper ───────────────────────────────────────────────────
  function addTextSprite(
    scene: THREE.Scene,
    text: string,
    x: number,
    y: number,
    z: number,
    color: number,
    scale: number
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.font = 'bold 20px Inter, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, 128, 40);
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y, z);
    sprite.scale.set(20 * scale, 5 * scale, 1);
    scene.add(sprite);
  }

  // ── Firestore subscription ───────────────────────────────────────────────
  useEffect(() => {
    const cleanup = buildScene();
    const app = getFirebaseApp();
    const db = getFirestore(app);

    const unsub = onSnapshot(collection(db, 'branches'), (snap) => {
      if (!sceneRef.current) return;
      snap.docs.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() } as BranchData;
        branchDataRef.current.set(data.id, data);
        upsertBranchPillar(data, sceneRef.current!);
      });
    });

    return () => {
      unsub();
      cleanup?.();
      cancelAnimationFrame(animFrameRef.current);
      rendererRef.current?.dispose();
      if (mountRef.current && rendererRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [buildScene]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full" style={{ background: '#0A0A0A' }}>
      {/* Three.js canvas mount */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Legend */}
      <div className="absolute top-4 left-4 bg-black/70 border border-white/10 rounded-xl p-4 text-xs space-y-2 backdrop-blur">
        <p className="font-bold text-[#C4F135] tracking-widest uppercase text-[10px]">Queue Density</p>
        {[
          { label: 'Low', color: '#C4F135' },
          { label: 'Moderate', color: '#F5A623' },
          { label: 'High', color: '#FF6B00' },
          { label: 'Full', color: '#FF2D2D' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm" style={{ background: color }} />
            <span className="text-white/70">{label}</span>
          </div>
        ))}
        <p className="text-white/30 text-[9px] pt-1">Pillar height = queue size / 10</p>
      </div>

      {/* Title */}
      <div className="absolute top-4 right-4 text-right">
        <p className="text-[#C4F135] font-bold text-xs tracking-widest uppercase">Live Branch Map</p>
        <p className="text-white/40 text-[10px]">Cape Town Metropolitan Area</p>
      </div>

      {/* Click popup */}
      {popup.visible && (
        <div
          className="absolute z-50 bg-black/90 border border-white/10 rounded-xl p-4 min-w-[200px] shadow-2xl pointer-events-none"
          style={{ left: popup.x + 12, top: popup.y - 60 }}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold text-white text-sm">{popup.name}</p>
            {popup.congestion === 'FULL' && (
              <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-bold">FULL</span>
            )}
          </div>
          <div className="space-y-1 text-[11px] text-white/60">
            <p>Department: <span className="text-white">{popup.department}</span></p>
            <p>Queue: <span className="text-white">{popup.queue} / {popup.capacity}</span></p>
            <p>Status: <span style={{ color: popup.congestion === 'FULL' ? '#FF2D2D' : popup.congestion === 'HIGH' ? '#FF6B00' : popup.congestion === 'MODERATE' ? '#F5A623' : '#C4F135' }}>{popup.congestion}</span></p>
            {popup.wait !== undefined && (
              <p>Est. wait: <span className="text-[#C4F135] font-bold">{popup.wait}m</span></p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
