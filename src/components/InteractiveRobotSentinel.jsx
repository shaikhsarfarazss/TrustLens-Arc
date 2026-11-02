import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RotateCcw, Sparkles, ShieldAlert, ShieldCheck, Activity } from 'lucide-react';

export default function InteractiveRobotSentinel({ status = 'idle', className = '' }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadPct, setLoadPct] = useState(0);

  // References for mouse drag rotation & lighting
  const isDraggingRef = useRef(false);
  const previousMousePosRef = useRef({ x: 0, y: 0 });
  const rotationVelocityRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0, y: 0 });
  const currentRotationRef = useRef({ x: 0, y: 0 });
  const zoomLevelRef = useRef(3.5);
  const targetZoomRef = useRef(3.5);
  const cameraRef = useRef(null);
  const modelGroupRef = useRef(null);
  const headPivotRef = useRef(null);
  const targetHeadRotX = useRef(0);
  const targetHeadRotY = useRef(0);
  const curHeadRotX = useRef(0);
  const curHeadRotY = useRef(0);
  const rimLightRef = useRef(null);
  const floorLightRef = useRef(null);
  const statusRef = useRef(status);

  useEffect(() => {
    statusRef.current = status;
    // Update rim and floor lights according to status
    if (rimLightRef.current && floorLightRef.current) {
      if (status === 'deepfake') {
        rimLightRef.current.color.setHex(0xff3355);
        floorLightRef.current.color.setHex(0xff1144);
        floorLightRef.current.intensity = 5.0;
      } else if (status === 'authentic') {
        rimLightRef.current.color.setHex(0x10b981);
        floorLightRef.current.color.setHex(0x10b981);
        floorLightRef.current.intensity = 4.0;
      } else if (status === 'scanning') {
        rimLightRef.current.color.setHex(0x00f0ff);
        floorLightRef.current.color.setHex(0x00f0ff);
        floorLightRef.current.intensity = 4.5;
      } else {
        rimLightRef.current.color.setHex(0x00f0ff);
        floorLightRef.current.color.setHex(0x00c4ff);
        floorLightRef.current.intensity = 2.8;
      }
    }
  }, [status]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animId;
    let isDisposed = false;

    // Blinking eye textures & state for robot screen
    let screenMat = null;
    const texLoader = new THREE.TextureLoader();
    const openTex = texLoader.load('/robot_emissive_open.jpg');
    openTex.flipY = false;
    const halfTex = texLoader.load('/robot_emissive_half.jpg');
    halfTex.flipY = false;
    const blinkTex = texLoader.load('/robot_emissive_blink.jpg');
    blinkTex.flipY = false;
    const blinkTextures = { openTex, halfTex, blinkTex };

    let nextBlinkTime = 2.5;
    let blinkStartTime = 0;
    let isBlinking = false;
    let isDoubleBlink = false;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 3.5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // 2. Cyber Command Studio Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const mainKeyLight = new THREE.DirectionalLight(0xffffff, 2.8);
    mainKeyLight.position.set(2.5, 4.0, 3.5);
    scene.add(mainKeyLight);

    const cyanRimLight = new THREE.DirectionalLight(0x00f0ff, 2.2);
    cyanRimLight.position.set(-3.0, 1.5, 2.5);
    scene.add(cyanRimLight);
    rimLightRef.current = cyanRimLight;

    const floorLight = new THREE.PointLight(0x00f0ff, 3.0, 8);
    floorLight.position.set(0, -1.3, 1.0);
    scene.add(floorLight);
    floorLightRef.current = floorLight;

    const backRimLight = new THREE.PointLight(0x3b82f6, 2.2, 8);
    backRimLight.position.set(0, 1.2, -2.5);
    scene.add(backRimLight);

    // 3. Load GLB Model
    const loader = new GLTFLoader();
    loader.load(
      '/mini_robot.glb',
      (gltf) => {
        if (isDisposed) return;
        const model = gltf.scene;
        model.updateMatrixWorld(true);

        // Ensure front face (screen) points towards camera (+Z)
        const screenObj = model.getObjectByName('screen');
        const bagObj = model.getObjectByName('bag') || model.getObjectByName('bag.001');
        if (screenObj && bagObj) {
          const sPos = new THREE.Vector3();
          const bPos = new THREE.Vector3();
          screenObj.getWorldPosition(sPos);
          bagObj.getWorldPosition(bPos);
          if (sPos.z < bPos.z) {
            model.rotation.y = Math.PI;
            model.updateMatrixWorld(true);
          }
        }

        // Setup isolated screen blinking texture (modifies ONLY screen face)
        if (screenObj) {
          screenObj.traverse((child) => {
            if (child.isMesh) {
              screenMat = child.material.clone();
              // Eliminate dirty fabric/grunge texture from original model
              screenMat.map = null;
              screenMat.color = new THREE.Color(0x050814); // Deep Obsidian Cyber OLED Glass
              screenMat.roughness = 0.12; // Ultra-clean glossy screen
              screenMat.metalness = 0.88; // Sleek reflections
              screenMat.emissive = new THREE.Color(0x00f0ff); // Radiant neon cyan
              screenMat.emissiveIntensity = 2.4;
              screenMat.emissiveMap = openTex;
              screenMat.needsUpdate = true;
              child.material = screenMat;
            }
          });
        }

        // Measure bounding box
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // Target height ~2.1 units in world coordinates
        const TARGET_HEIGHT = 2.15;
        const scale = TARGET_HEIGHT / (size.y || 1);

        const rootGroup = new THREE.Group();
        rootGroup.scale.set(scale, scale, scale);

        // Center horizontally and align feet to local y = 0
        model.position.x = -center.x;
        model.position.y = -box.min.y;
        model.position.z = -center.z;
        rootGroup.add(model);

        // Position feet on the pedestal plane (y = -1.15 in world units)
        rootGroup.position.set(0, -1.15, 0);
        scene.add(rootGroup);
        modelGroupRef.current = rootGroup;

        // Setup isolated Head Pivot for Fast Head-Only Tracking (Body stays still)
        const headPivot = new THREE.Group();
        const headBox = new THREE.Box3();
        const headPartNames = ['head', 'screen', 'cap', 'ears', 'ears_part_1', 'ears_part_2'];
        const headParts = [];

        headPartNames.forEach((name) => {
          const part = model.getObjectByName(name);
          if (part) {
            headBox.expandByObject(part);
            headParts.push(part);
          }
        });

        const headCenter = new THREE.Vector3();
        headBox.getCenter(headCenter);
        // Position pivot at the neck base
        headPivot.position.set(headCenter.x, headBox.min.y + 0.12, headCenter.z);
        model.add(headPivot);

        headParts.forEach((part) => {
          headPivot.attach(part);
        });
        headPivotRef.current = headPivot;

        setLoading(false);
      },
      (xhr) => {
        if (xhr.total > 0) {
          setLoadPct(Math.round((xhr.loaded / xhr.total) * 100));
        }
      },
      (err) => {
        console.error('Error loading robot GLB:', err);
        setLoading(false);
      }
    );

    // 4. Mouse & Touch Drag Rotation Event Handlers
    const onMouseDown = (e) => {
      isDraggingRef.current = true;
      previousMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (isDraggingRef.current) {
        // Manual drag rotation
        const deltaX = e.clientX - previousMousePosRef.current.x;
        const deltaY = e.clientY - previousMousePosRef.current.y;
        previousMousePosRef.current = { x: e.clientX, y: e.clientY };

        targetRotationRef.current.y += deltaX * 0.008;
        targetRotationRef.current.x = Math.max(
          -0.35,
          Math.min(0.35, targetRotationRef.current.x + deltaY * 0.006)
        );
      } else {
        // Ultra-Fast Head-Only Tracking towards Cursor (body stays still)
        const rect = container.getBoundingClientRect();
        const normX = ((e.clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2));
        const normY = ((e.clientY - (rect.top + rect.height / 2)) / (window.innerHeight / 2));

        targetHeadRotY.current = Math.max(-1.0, Math.min(1.0, normX)) * 0.52;
        targetHeadRotX.current = Math.max(-1.0, Math.min(1.0, normY)) * 0.30;
      }
    };

    const onMouseLeave = () => {
      targetHeadRotX.current = 0;
      targetHeadRotY.current = 0;
      if (!isDraggingRef.current) {
        targetRotationRef.current.x = 0;
        targetRotationRef.current.y = 0;
      }
    };

    const onMouseUp = () => {
      isDraggingRef.current = false;
    };

    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        isDraggingRef.current = true;
        previousMousePosRef.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY
        };
      }
    };

    const onTouchMove = (e) => {
      if (!isDraggingRef.current || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - previousMousePosRef.current.x;
      const deltaY = e.touches[0].clientY - previousMousePosRef.current.y;
      previousMousePosRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };

      targetRotationRef.current.y += deltaX * 0.008;
      targetRotationRef.current.x = Math.max(
        -0.35,
        Math.min(0.35, targetRotationRef.current.x + deltaY * 0.006)
      );
    };

    const onTouchEnd = () => {
      isDraggingRef.current = false;
    };

    const onWheel = (e) => {
      // Zoom with wheel clamped between 2.6 and 4.6
      targetZoomRef.current = Math.max(2.6, Math.min(4.6, targetZoomRef.current + e.deltaY * 0.002));
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    container.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    container.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('mouseleave', onMouseLeave);

    // 5. Animation Loop with Smooth Damping & Subtle Breathing
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth damping interpolation towards target rotation
      currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.12;
      currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.12;

      // Smooth zoom interpolation
      zoomLevelRef.current += (targetZoomRef.current - zoomLevelRef.current) * 0.1;
      camera.position.z = zoomLevelRef.current;

      if (modelGroupRef.current) {
        // Minimal subtle breathing hover (up and down by 0.025)
        const breathe = Math.sin(elapsedTime * 2.2) * 0.025;
        modelGroupRef.current.position.y = -1.15 + breathe;

        // Apply interactive rotation (manual drag)
        modelGroupRef.current.rotation.y = currentRotationRef.current.y;
        modelGroupRef.current.rotation.x = currentRotationRef.current.x;

        // If scanning, add subtle scanning pulse to floor light
        if (statusRef.current === 'scanning' && floorLightRef.current) {
          floorLightRef.current.intensity = 3.5 + Math.sin(elapsedTime * 8) * 1.5;
        }
      }

      // Ultra-Fast Head-Only Gaze Tracking (body stays still, head turns fast)
      curHeadRotX.current += (targetHeadRotX.current - curHeadRotX.current) * 0.35;
      curHeadRotY.current += (targetHeadRotY.current - curHeadRotY.current) * 0.35;

      if (headPivotRef.current) {
        headPivotRef.current.rotation.x = curHeadRotX.current;
        headPivotRef.current.rotation.y = curHeadRotY.current;
      }

      // Natural Screen Eye Blink Logic (operates strictly on robot screen face)
      if (screenMat && blinkTextures) {
        if (elapsedTime >= nextBlinkTime && !isBlinking) {
          isBlinking = true;
          blinkStartTime = elapsedTime;
          isDoubleBlink = Math.random() < 0.25; // 25% chance of realistic double-blink
        }

        if (isBlinking) {
          const dt = (elapsedTime - blinkStartTime) * 1000;

          if (dt < 40) {
            if (screenMat.emissiveMap !== blinkTextures.halfTex) {
              screenMat.emissiveMap = blinkTextures.halfTex;
              screenMat.needsUpdate = true;
            }
          } else if (dt < 160) {
            if (screenMat.emissiveMap !== blinkTextures.blinkTex) {
              screenMat.emissiveMap = blinkTextures.blinkTex;
              screenMat.needsUpdate = true;
            }
          } else if (dt < 200) {
            if (screenMat.emissiveMap !== blinkTextures.halfTex) {
              screenMat.emissiveMap = blinkTextures.halfTex;
              screenMat.needsUpdate = true;
            }
          } else if (isDoubleBlink && dt < 280) {
            // Brief open pause between double-blinks
            if (screenMat.emissiveMap !== blinkTextures.openTex) {
              screenMat.emissiveMap = blinkTextures.openTex;
              screenMat.needsUpdate = true;
            }
          } else if (isDoubleBlink && dt < 320) {
            // Second blink: half
            if (screenMat.emissiveMap !== blinkTextures.halfTex) {
              screenMat.emissiveMap = blinkTextures.halfTex;
              screenMat.needsUpdate = true;
            }
          } else if (isDoubleBlink && dt < 420) {
            // Second blink: closed
            if (screenMat.emissiveMap !== blinkTextures.blinkTex) {
              screenMat.emissiveMap = blinkTextures.blinkTex;
              screenMat.needsUpdate = true;
            }
          } else if (isDoubleBlink && dt < 460) {
            // Second blink: reopening
            if (screenMat.emissiveMap !== blinkTextures.halfTex) {
              screenMat.emissiveMap = blinkTextures.halfTex;
              screenMat.needsUpdate = true;
            }
          } else {
            // Return to normal open eyes
            if (screenMat.emissiveMap !== blinkTextures.openTex) {
              screenMat.emissiveMap = blinkTextures.openTex;
              screenMat.needsUpdate = true;
            }
            isBlinking = false;
            // Schedule next blink in 3.0 to 5.5 seconds
            nextBlinkTime = elapsedTime + 3.0 + Math.random() * 2.5;
          }
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // 6. Resize handler
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      container.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('wheel', onWheel);
      window.removeEventListener('mouseleave', onMouseLeave);
      openTex.dispose();
      halfTex.dispose();
      blinkTex.dispose();
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleResetView = () => {
    targetRotationRef.current = { x: 0, y: 0 };
    targetZoomRef.current = 3.5;
  };

  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-center select-none ${className}`}>
      
      {/* Pedestal Ambient Lighting Aura based on Status */}
      <div 
        className={`absolute bottom-6 sm:bottom-8 w-72 sm:w-80 h-16 rounded-[100%] blur-xl transition-all duration-700 pointer-events-none ${
          status === 'deepfake' 
            ? 'bg-red-500/30' 
            : status === 'authentic' 
            ? 'bg-emerald-500/30' 
            : status === 'scanning'
            ? 'bg-cyan-400/40 animate-pulse'
            : 'bg-cyan-500/20'
        }`} 
      />

      {/* Futuristic Concentric Pedestal Rings */}
      <div 
        className={`absolute bottom-7 sm:bottom-9 w-60 sm:w-72 h-10 rounded-[100%] border transition-all duration-700 pointer-events-none ${
          status === 'deepfake'
            ? 'border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
            : status === 'authentic'
            ? 'border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.5)]'
            : 'border-cyan-400/40 shadow-[0_0_25px_rgba(0,240,255,0.35)]'
        }`}
      />
      <div className="absolute bottom-8 sm:bottom-10 w-44 sm:w-56 h-6 rounded-[100%] border border-dashed border-cyan-300/30 animate-spin pointer-events-none" style={{ animationDuration: '24s' }} />

      {/* Top Floating Badge on Robot View */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/80 border border-cyan-400/30 text-cyan-300 text-[11px] font-mono backdrop-blur-md shadow-md">
          <span className={`w-2 h-2 rounded-full ${
            status === 'deepfake' ? 'bg-red-500 animate-ping' : status === 'authentic' ? 'bg-emerald-400' : 'bg-cyan-400 animate-pulse'
          }`}></span>
          <span>ARC SENTINEL v3.8</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300 uppercase tracking-wider text-[10px]">
            {status === 'deepfake' ? 'Threat Detected' : status === 'authentic' ? 'Human Verified' : status === 'scanning' ? 'Analyzing' : 'Ready'}
          </span>
        </div>

        {/* Reset Angle Button */}
        <button
          onClick={handleResetView}
          title="Reset Camera Angle"
          className="pointer-events-auto p-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700 hover:border-cyan-400 text-slate-400 hover:text-cyan-300 transition-all shadow-md active:scale-90"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3D Three.js Mount Canvas */}
      <div 
        ref={containerRef} 
        className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center relative z-10" 
      />

      {/* Loading State Indicator */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/60 backdrop-blur-sm z-20">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400/20 border-t-cyan-400 animate-spin" />
          <span className="text-xs font-mono text-cyan-300">
            Materializing 3D Mascot... {loadPct > 0 ? `${loadPct}%` : ''}
          </span>
        </div>
      )}

      {/* Bottom Rotation Interaction Prompt */}
      <div className="absolute bottom-3 z-20 flex items-center gap-2 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-3 py-1 rounded-full border border-slate-800/80 pointer-events-none">
        <span className="text-cyan-400">❖</span>
        <span>Drag to rotate 360° • Scroll to zoom</span>
      </div>

    </div>
  );
}

