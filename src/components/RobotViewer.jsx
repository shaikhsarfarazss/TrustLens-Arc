import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ChevronDown, ShieldCheck, Sparkles } from 'lucide-react';

export default function RobotViewer({ onEnterDashboard, isVisible = true }) {
  const mountRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadPct, setLoadPct] = useState(0);
  const [activeEmote, setActiveEmote] = useState(null);
  const triggerEmoteRef = useRef(null);
  const isVisibleRef = useRef(isVisible);

  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let animId;
    let isDisposed = false;

    // Emissive eye textures for blinking & expressive emotes
    let screenMat = null;
    const texLoader = new THREE.TextureLoader();
    const openTex = texLoader.load('/robot_emissive_open.jpg');
    openTex.flipY = false;
    const halfTex = texLoader.load('/robot_emissive_half.jpg');
    halfTex.flipY = false;
    const blinkTex = texLoader.load('/robot_emissive_blink.jpg');
    blinkTex.flipY = false;
    const happyTex = texLoader.load('/robot_emissive_happy.jpg');
    happyTex.flipY = false;
    const winkTex = texLoader.load('/robot_emissive_wink.jpg');
    winkTex.flipY = false;
    const dizzyTex = texLoader.load('/robot_emissive_dizzy.jpg');
    dizzyTex.flipY = false;
    const scanTex = texLoader.load('/robot_emissive_scan.jpg');
    scanTex.flipY = false;

    const blinkTextures = { openTex, halfTex, blinkTex };

    let nextBlinkTime = 2.5;
    let blinkStartTime = 0;
    let isBlinking = false;
    let isDoubleBlink = false;

    // Fast Head-Only Tracking State (Body stays completely still)
    let rootGroupRef = null;
    let headPivotRef = null;
    let targetHeadRotX = 0;
    let targetHeadRotY = 0;
    let curHeadRotX = 0;
    let curHeadRotY = 0;
    const BASE_Y = -1.26;

    // Emote State Machine & Timers
    let currentEmote = null;
    let emoteStartTime = 0;
    let emoteDuration = 0;
    let nextIdleEmoteTime = 40.0 + Math.random() * 20.0;
    let lastInteractionTime = 0;

    // Continuous mouse movement tracker for Dizzy Easter Egg
    let lastMoveTimestamp = 0;
    let continuousMoveDuration = 0;
    let lastMousePos = { x: 0, y: 0 };

    let clock = new THREE.Clock();

    const triggerEmote = (name) => {
      if (isDisposed) return;
      if (currentEmote === 'dizzy' && name !== 'dizzy') return;

      const t = clock.getElapsedTime();
      currentEmote = name;
      emoteStartTime = t;
      setActiveEmote(name);

      if (name === 'happy') emoteDuration = 2.4;
      else if (name === 'curious') emoteDuration = 2.4;
      else if (name === 'scan') emoteDuration = 2.8;
      else if (name === 'wink') emoteDuration = 1.8;
      else if (name === 'dizzy') emoteDuration = 5.0;
      else emoteDuration = 2.0;

      nextIdleEmoteTime = t + 55.0 + Math.random() * 25.0;
    };
    triggerEmoteRef.current = triggerEmote;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 3.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // 2. Cyber Command Room Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const mainKeyLight = new THREE.DirectionalLight(0xffffff, 2.6);
    mainKeyLight.position.set(2, 4, 3.5);
    scene.add(mainKeyLight);

    const cyanRimLight = new THREE.DirectionalLight(0x00f0ff, 2.0);
    cyanRimLight.position.set(-2.5, 1, 2.5);
    scene.add(cyanRimLight);

    const floorRimLight = new THREE.PointLight(0x00f0ff, 3.5, 10);
    floorRimLight.position.set(0, -1.2, 1.2);
    scene.add(floorRimLight);

    const backRimLight = new THREE.PointLight(0x0077ff, 2.5, 8);
    backRimLight.position.set(0, 1.0, -2);
    scene.add(backRimLight);

    // 3. Load GLB Model and Position Still in Center
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
              screenMat.map = null;
              screenMat.color = new THREE.Color(0x050814); // Deep Obsidian Cyber OLED Glass
              screenMat.roughness = 0.12;
              screenMat.metalness = 0.88;
              screenMat.emissive = new THREE.Color(0x00f0ff);
              screenMat.emissiveIntensity = 2.4;
              screenMat.emissiveMap = openTex;
              screenMat.needsUpdate = true;
              child.material = screenMat;
            }
          });
        }

        // Measure true bounding box
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const TARGET_HEIGHT = 2.26;
        const scale = TARGET_HEIGHT / (size.y || 1);

        const rootGroup = new THREE.Group();
        rootGroup.scale.set(scale, scale, scale);

        model.position.x = -center.x;
        model.position.y = -box.min.y;
        model.position.z = -center.z;
        rootGroup.add(model);

        rootGroup.position.set(0, BASE_Y, 0);
        scene.add(rootGroup);
        rootGroupRef = rootGroup;

        // Setup isolated Head Pivot: moves ONLY head, body stays 100% still
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
        headPivot.position.set(headCenter.x, headBox.min.y + 0.12, headCenter.z);
        model.add(headPivot);

        headParts.forEach((part) => {
          headPivot.attach(part);
        });
        headPivotRef = headPivot;

        setLoading(false);
      },
      (xhr) => {
        if (xhr.total > 0) {
          setLoadPct(Math.round((xhr.loaded / xhr.total) * 100));
        }
      },
      (err) => {
        console.error('Error loading 3D robot model:', err);
        setLoading(false);
      }
    );

    // 4. Animation Loop with Lifelike Screen Blinking, Emotes & Fall Kinematics
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isVisibleRef.current) return;

      const elapsedTime = clock.getElapsedTime();

      // Check if continuous movement stopped
      if (performance.now() - lastMoveTimestamp > 450) {
        continuousMoveDuration = 0;
      }

      // Periodic Idle Emote (triggers naturally every 50-80s when user idle > 5s)
      if (!currentEmote && (elapsedTime - lastInteractionTime > 5.0) && elapsedTime >= nextIdleEmoteTime) {
        const idlePool = ['curious', 'happy', 'scan', 'wink'];
        const picked = idlePool[Math.floor(Math.random() * idlePool.length)];
        triggerEmote(picked);
      }

      // Ultra-Fast Head-Only Gaze Tracking (snappy lerp 0.35)
      curHeadRotX += (targetHeadRotX - curHeadRotX) * 0.35;
      curHeadRotY += (targetHeadRotY - curHeadRotY) * 0.35;

      // Handle Active Emotes
      if (currentEmote) {
        const eDt = elapsedTime - emoteStartTime;

        if (currentEmote === 'happy') {
          if (screenMat && screenMat.emissiveMap !== happyTex) {
            screenMat.emissiveMap = happyTex;
            screenMat.needsUpdate = true;
          }
          const nod = Math.sin(eDt * 14) * 0.14 * Math.exp(-eDt * 0.7);
          const hop = Math.abs(Math.sin(eDt * 14)) * 0.05 * Math.exp(-eDt * 0.7);
          if (headPivotRef) {
            headPivotRef.rotation.x = curHeadRotX + nod;
            headPivotRef.rotation.y = curHeadRotY;
            headPivotRef.rotation.z = 0;
          }
          if (rootGroupRef) {
            rootGroupRef.position.y = BASE_Y + hop;
          }
        } else if (currentEmote === 'curious') {
          if (screenMat && screenMat.emissiveMap !== openTex) {
            screenMat.emissiveMap = openTex;
            screenMat.needsUpdate = true;
          }
          let tiltZ = 0;
          let tiltX = 0;
          if (eDt < 0.6) {
            const p = eDt / 0.6;
            tiltZ = 0.32 * Math.sin(p * Math.PI * 0.5);
            tiltX = -0.15 * Math.sin(p * Math.PI * 0.5);
          } else if (eDt < 1.8) {
            tiltZ = 0.32 + Math.sin(eDt * 3) * 0.02;
            tiltX = -0.15;
          } else {
            const p = (eDt - 1.8) / 0.6;
            tiltZ = 0.32 * (1 - Math.sin(p * Math.PI * 0.5));
            tiltX = -0.15 * (1 - Math.sin(p * Math.PI * 0.5));
          }
          if (headPivotRef) {
            headPivotRef.rotation.z = tiltZ;
            headPivotRef.rotation.x = curHeadRotX + tiltX;
            headPivotRef.rotation.y = curHeadRotY + 0.12;
          }
        } else if (currentEmote === 'scan') {
          if (screenMat && screenMat.emissiveMap !== scanTex) {
            screenMat.emissiveMap = scanTex;
            screenMat.needsUpdate = true;
          }
          const sweep = Math.sin(eDt * 3.8) * 0.55;
          if (headPivotRef) {
            headPivotRef.rotation.y = sweep;
            headPivotRef.rotation.x = -0.06;
            headPivotRef.rotation.z = 0;
          }
        } else if (currentEmote === 'wink') {
          if (screenMat) {
            const targetTex = eDt < 0.15 ? halfTex : eDt < 1.4 ? winkTex : eDt < 1.6 ? halfTex : openTex;
            if (screenMat.emissiveMap !== targetTex) {
              screenMat.emissiveMap = targetTex;
              screenMat.needsUpdate = true;
            }
          }
          const perkZ = Math.sin(eDt * 5) * 0.18 * Math.exp(-eDt * 0.9);
          if (headPivotRef) {
            headPivotRef.rotation.z = perkZ;
            headPivotRef.rotation.x = curHeadRotX - 0.12;
            headPivotRef.rotation.y = curHeadRotY;
          }
        } else if (currentEmote === 'dizzy') {
          // Dizzy Easter Egg Sequence: Wobble -> Fall -> Dazed -> Stand up
          if (screenMat && screenMat.emissiveMap !== dizzyTex && eDt < 3.8) {
            screenMat.emissiveMap = dizzyTex;
            screenMat.needsUpdate = true;
          }

          if (eDt < 1.3) {
            // Phase 1: Rapid dizzy wobble
            const p = eDt / 1.3;
            const freq = 18 + p * 16;
            if (headPivotRef) {
              headPivotRef.rotation.y = Math.sin(eDt * freq) * 0.40;
              headPivotRef.rotation.z = Math.cos(eDt * freq) * 0.28;
              headPivotRef.rotation.x = Math.sin(eDt * freq * 0.5) * 0.22;
            }
            if (rootGroupRef) {
              rootGroupRef.rotation.z = Math.sin(eDt * 9) * 0.12 * p;
              rootGroupRef.rotation.x = 0;
              rootGroupRef.position.y = BASE_Y;
            }
          } else if (eDt < 2.2) {
            // Phase 2: Tumble and fall onto floor
            const tFall = (eDt - 1.3) / 0.9;
            const easeFall = tFall * tFall;
            const fallAngle = -(Math.PI / 2.3);
            let bounce = 0;
            if (tFall > 0.8) {
              bounce = Math.sin((tFall - 0.8) / 0.2 * Math.PI) * 0.08;
            }
            if (rootGroupRef) {
              rootGroupRef.rotation.x = fallAngle * easeFall;
              rootGroupRef.rotation.z = (1 - easeFall) * 0.1;
              rootGroupRef.position.y = BASE_Y - 0.52 * easeFall + bounce;
            }
            if (headPivotRef) {
              headPivotRef.rotation.set(0.1, 0, 0);
            }
          } else if (eDt < 3.2) {
            // Phase 3: Dazed resting on floor with spiral eyes
            if (rootGroupRef) {
              rootGroupRef.rotation.x = -(Math.PI / 2.3);
              rootGroupRef.rotation.z = 0;
              rootGroupRef.position.y = BASE_Y - 0.52;
            }
            if (headPivotRef) {
              headPivotRef.rotation.y = Math.sin((eDt - 2.2) * 12) * 0.07;
              headPivotRef.rotation.z = Math.cos((eDt - 2.2) * 12) * 0.05;
            }
          } else if (eDt < 4.9) {
            // Phase 4: Stand back up and recover
            const tRise = (eDt - 3.2) / 1.7;
            const s = 1 - Math.pow(1 - tRise, 3);
            const fallAngle = -(Math.PI / 2.3);
            if (rootGroupRef) {
              rootGroupRef.rotation.x = fallAngle * (1 - s);
              rootGroupRef.position.y = (BASE_Y - 0.52) + 0.52 * s;
              rootGroupRef.rotation.z = 0;
            }
            if (tRise > 0.6 && screenMat && screenMat.emissiveMap !== openTex) {
              screenMat.emissiveMap = openTex;
              screenMat.needsUpdate = true;
            }
            if (headPivotRef) {
              if (tRise > 0.75) {
                headPivotRef.rotation.y = Math.sin(tRise * 35) * 0.18 * (1 - tRise);
                headPivotRef.rotation.z = 0;
                headPivotRef.rotation.x = 0;
              } else {
                headPivotRef.rotation.set(0, 0, 0);
              }
            }
          }
        }

        // Check if emote ended
        if (eDt >= emoteDuration) {
          currentEmote = null;
          setActiveEmote(null);
          if (rootGroupRef) {
            rootGroupRef.rotation.set(0, 0, 0);
            rootGroupRef.position.set(0, BASE_Y, 0);
          }
          if (headPivotRef) {
            headPivotRef.rotation.set(0, 0, 0);
          }
          if (screenMat) {
            screenMat.emissiveMap = openTex;
            screenMat.needsUpdate = true;
          }
        }
      } else {
        // Normal state: Lifelike Eye Blink logic + cursor gaze tracking
        if (headPivotRef) {
          headPivotRef.rotation.x = curHeadRotX;
          headPivotRef.rotation.y = curHeadRotY;
          headPivotRef.rotation.z = 0;
        }

        if (screenMat && blinkTextures) {
          if (elapsedTime >= nextBlinkTime && !isBlinking) {
            isBlinking = true;
            blinkStartTime = elapsedTime;
            isDoubleBlink = Math.random() < 0.25;
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
              if (screenMat.emissiveMap !== blinkTextures.openTex) {
                screenMat.emissiveMap = blinkTextures.openTex;
                screenMat.needsUpdate = true;
              }
            } else if (isDoubleBlink && dt < 320) {
              if (screenMat.emissiveMap !== blinkTextures.halfTex) {
                screenMat.emissiveMap = blinkTextures.halfTex;
                screenMat.needsUpdate = true;
              }
            } else if (isDoubleBlink && dt < 420) {
              if (screenMat.emissiveMap !== blinkTextures.blinkTex) {
                screenMat.emissiveMap = blinkTextures.blinkTex;
                screenMat.needsUpdate = true;
              }
            } else if (isDoubleBlink && dt < 460) {
              if (screenMat.emissiveMap !== blinkTextures.halfTex) {
                screenMat.emissiveMap = blinkTextures.halfTex;
                screenMat.needsUpdate = true;
              }
            } else {
              if (screenMat.emissiveMap !== blinkTextures.openTex) {
                screenMat.emissiveMap = blinkTextures.openTex;
                screenMat.needsUpdate = true;
              }
              isBlinking = false;
              nextBlinkTime = elapsedTime + 3.0 + Math.random() * 2.5;
            }
          }
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    // 5. Cursor Tracking & Continuous Movement Detection
    const onPointerMove = (e) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const normX = ((e.clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2));
      const normY = ((e.clientY - (rect.top + rect.height / 2)) / (window.innerHeight / 2));

      targetHeadRotY = Math.max(-1.0, Math.min(1.0, normX)) * 0.52;
      targetHeadRotX = Math.max(-1.0, Math.min(1.0, normY)) * 0.30;

      // Continuous motion check for Dizzy trigger (4-5s continuous spinning/moving)
      const now = performance.now();
      if (lastMoveTimestamp > 0) {
        const dt = (now - lastMoveTimestamp) / 1000;
        const dist = Math.hypot(e.clientX - lastMousePos.x, e.clientY - lastMousePos.y);

        if (dt < 0.40 && dist > 4) {
          continuousMoveDuration += dt;
          if (continuousMoveDuration >= 4.0 && currentEmote !== 'dizzy') {
            triggerEmote('dizzy');
            continuousMoveDuration = 0;
          }
        } else if (dt >= 0.40) {
          continuousMoveDuration = 0;
        }
      }
      lastMoveTimestamp = now;
      lastMousePos = { x: e.clientX, y: e.clientY };
      lastInteractionTime = clock.getElapsedTime();
    };

    const onPointerLeave = () => {
      targetHeadRotX = 0;
      targetHeadRotY = 0;
      continuousMoveDuration = 0;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);

    // Resize handler
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
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
      openTex.dispose();
      halfTex.dispose();
      blinkTex.dispose();
      happyTex.dispose();
      winkTex.dispose();
      dizzyTex.dispose();
      scanTex.dispose();
      renderer.dispose();
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const handleManualEmote = (emoteName) => {
    triggerEmoteRef.current?.(emoteName);
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center select-none pointer-events-auto">
      
      {/* Subtle Holographic Glowing Ring at Robot's Feet on the Floor */}
      <div className="absolute bottom-8 sm:bottom-10 w-72 sm:w-96 h-16 rounded-[100%] bg-gradient-to-r from-cyan-500/0 via-cyan-400/20 to-cyan-500/0 blur-xl pointer-events-none" />
      <div className="absolute bottom-9 sm:bottom-11 w-60 sm:w-80 h-10 rounded-[100%] border border-cyan-400/30 shadow-[0_0_25px_rgba(34,211,238,0.3)] pointer-events-none" />

      {/* 3D Canvas Mount (Full Screen) */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full z-10 pointer-events-none" />

      {/* Interactive Emote Actions Toolbar (Top Right) */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.5)] pointer-events-auto">
        <div className="flex items-center gap-1 px-2 text-[11px] font-mono font-semibold text-slate-400 border-r border-slate-700/60 mr-0.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="hidden sm:inline">Emotes</span>
        </div>
        <button
          onClick={() => handleManualEmote('happy')}
          title="Happy Double Nod"
          className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
            activeEmote === 'happy'
              ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
              : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/50 hover:border-cyan-500/40'
          }`}
        >
          <span>😊</span>
          <span className="hidden md:inline">Happy</span>
        </button>
        <button
          onClick={() => handleManualEmote('curious')}
          title="Curious Head Tilt"
          className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
            activeEmote === 'curious'
              ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
              : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/50 hover:border-cyan-500/40'
          }`}
        >
          <span>🤔</span>
          <span className="hidden md:inline">Curious</span>
        </button>
        <button
          onClick={() => handleManualEmote('scan')}
          title="Radar Sweep Scan"
          className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
            activeEmote === 'scan'
              ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
              : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/50 hover:border-cyan-500/40'
          }`}
        >
          <span>📡</span>
          <span className="hidden md:inline">Scan</span>
        </button>
        <button
          onClick={() => handleManualEmote('wink')}
          title="Cheeky Wink"
          className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
            activeEmote === 'wink'
              ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
              : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/50 hover:border-cyan-500/40'
          }`}
        >
          <span>😉</span>
          <span className="hidden md:inline">Wink</span>
        </button>
        <button
          onClick={() => handleManualEmote('dizzy')}
          title="Dizzy & Tumble Fall Easter Egg (or continuously spin cursor for 4s!)"
          className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
            activeEmote === 'dizzy'
              ? 'bg-rose-500/30 text-rose-300 border border-rose-400 shadow-[0_0_14px_rgba(244,63,94,0.5)]'
              : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 hover:border-rose-400/60'
          }`}
        >
          <span>💫</span>
          <span>Tumble</span>
        </button>
      </div>

      {/* Loading state indicator */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/40 backdrop-blur-sm z-20">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-400/20 border-t-cyan-400 animate-spin" />
          <span className="text-[11px] font-mono text-cyan-300">
            Materializing 3D Sentinel... {loadPct > 0 ? `${loadPct}%` : ''}
          </span>
        </div>
      )}

      {/* Sleek Bottom Action Pill (Unobstructed at bottom) */}
      {!loading && (
        <div className="absolute bottom-6 sm:bottom-8 z-30 flex items-center justify-center pointer-events-auto">
          <button
            onClick={onEnterDashboard}
            className="group px-6 py-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-[0_0_30px_rgba(6,182,212,0.45)] hover:shadow-[0_0_45px_rgba(6,182,212,0.7)] hover:scale-105 active:scale-95 transition-all flex items-center gap-2 border border-cyan-300/40"
          >
            <ShieldCheck className="w-4 h-4 text-slate-950" />
            <span>Enter Forensics Lab</span>
            <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
          </button>
        </div>
      )}

    </div>
  );
}
