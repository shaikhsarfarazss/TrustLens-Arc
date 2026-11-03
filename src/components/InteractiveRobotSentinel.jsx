import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RotateCcw, Sparkles } from 'lucide-react';

export default function InteractiveRobotSentinel({ status = 'idle', className = '' }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [loadPct, setLoadPct] = useState(0);
  const [activeEmote, setActiveEmote] = useState(null);
  const triggerEmoteRef = useRef(null);

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
        rimLightRef.current.color.setHex(0xEE8656);
        floorLightRef.current.color.setHex(0xFA9C72);
        floorLightRef.current.intensity = 2.8;
      }
    }
  }, [status]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animId;
    let isDisposed = false;

    // Emissive eye textures for blinking & emotes
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
    const BASE_Y = -1.15;

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

      nextIdleEmoteTime = t + 50.0 + Math.random() * 25.0;
    };
    triggerEmoteRef.current = triggerEmote;

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

        // Measure bounding box
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const TARGET_HEIGHT = 2.15;
        const scale = TARGET_HEIGHT / (size.y || 1);

        const rootGroup = new THREE.Group();
        rootGroup.scale.set(scale, scale, scale);

        model.position.x = -center.x;
        model.position.y = -box.min.y;
        model.position.z = -center.z;
        rootGroup.add(model);

        rootGroup.position.set(0, BASE_Y, 0);
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
        const deltaX = e.clientX - previousMousePosRef.current.x;
        const deltaY = e.clientY - previousMousePosRef.current.y;
        previousMousePosRef.current = { x: e.clientX, y: e.clientY };

        targetRotationRef.current.y += deltaX * 0.008;
        targetRotationRef.current.x = Math.max(
          -0.35,
          Math.min(0.35, targetRotationRef.current.x + deltaY * 0.006)
        );
      } else {
        const rect = container.getBoundingClientRect();
        const normX = ((e.clientX - (rect.left + rect.width / 2)) / (window.innerWidth / 2));
        const normY = ((e.clientY - (rect.top + rect.height / 2)) / (window.innerHeight / 2));

        targetHeadRotY.current = Math.max(-1.0, Math.min(1.0, normX)) * 0.52;
        targetHeadRotX.current = Math.max(-1.0, Math.min(1.0, normY)) * 0.30;
      }

      // Continuous movement detection for Dizzy Easter Egg (4-5s continuous spinning/moving)
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

    const onMouseLeave = () => {
      targetHeadRotX.current = 0;
      targetHeadRotY.current = 0;
      continuousMoveDuration = 0;
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

    // 5. Animation Loop with Smooth Damping & Lifelike Emotes
    const animate = () => {
      animId = requestAnimationFrame(animate);
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

      // Smooth damping interpolation towards target rotation
      currentRotationRef.current.y += (targetRotationRef.current.y - currentRotationRef.current.y) * 0.12;
      currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.12;

      // Smooth zoom interpolation
      zoomLevelRef.current += (targetZoomRef.current - zoomLevelRef.current) * 0.1;
      camera.position.z = zoomLevelRef.current;

      // Ultra-Fast Head-Only Gaze Tracking
      curHeadRotX.current += (targetHeadRotX.current - curHeadRotX.current) * 0.35;
      curHeadRotY.current += (targetHeadRotY.current - curHeadRotY.current) * 0.35;

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
          if (headPivotRef.current) {
            headPivotRef.current.rotation.x = curHeadRotX.current + nod;
            headPivotRef.current.rotation.y = curHeadRotY.current;
            headPivotRef.current.rotation.z = 0;
          }
          if (modelGroupRef.current) {
            modelGroupRef.current.position.y = BASE_Y + hop;
            modelGroupRef.current.rotation.y = currentRotationRef.current.y;
            modelGroupRef.current.rotation.x = currentRotationRef.current.x;
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
          if (headPivotRef.current) {
            headPivotRef.current.rotation.z = tiltZ;
            headPivotRef.current.rotation.x = curHeadRotX.current + tiltX;
            headPivotRef.current.rotation.y = curHeadRotY.current + 0.12;
          }
          if (modelGroupRef.current) {
            modelGroupRef.current.position.y = BASE_Y;
            modelGroupRef.current.rotation.y = currentRotationRef.current.y;
            modelGroupRef.current.rotation.x = currentRotationRef.current.x;
          }
        } else if (currentEmote === 'scan') {
          if (screenMat && screenMat.emissiveMap !== scanTex) {
            screenMat.emissiveMap = scanTex;
            screenMat.needsUpdate = true;
          }
          const sweep = Math.sin(eDt * 3.8) * 0.55;
          if (headPivotRef.current) {
            headPivotRef.current.rotation.y = sweep;
            headPivotRef.current.rotation.x = -0.06;
            headPivotRef.current.rotation.z = 0;
          }
          if (modelGroupRef.current) {
            modelGroupRef.current.position.y = BASE_Y;
            modelGroupRef.current.rotation.y = currentRotationRef.current.y;
            modelGroupRef.current.rotation.x = currentRotationRef.current.x;
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
          if (headPivotRef.current) {
            headPivotRef.current.rotation.z = perkZ;
            headPivotRef.current.rotation.x = curHeadRotX.current - 0.12;
            headPivotRef.current.rotation.y = curHeadRotY.current;
          }
          if (modelGroupRef.current) {
            modelGroupRef.current.position.y = BASE_Y;
            modelGroupRef.current.rotation.y = currentRotationRef.current.y;
            modelGroupRef.current.rotation.x = currentRotationRef.current.x;
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
            if (headPivotRef.current) {
              headPivotRef.current.rotation.y = Math.sin(eDt * freq) * 0.40;
              headPivotRef.current.rotation.z = Math.cos(eDt * freq) * 0.28;
              headPivotRef.current.rotation.x = Math.sin(eDt * freq * 0.5) * 0.22;
            }
            if (modelGroupRef.current) {
              modelGroupRef.current.rotation.z = Math.sin(eDt * 9) * 0.12 * p;
              modelGroupRef.current.rotation.x = 0;
              modelGroupRef.current.position.y = BASE_Y;
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
            if (modelGroupRef.current) {
              modelGroupRef.current.rotation.x = fallAngle * easeFall;
              modelGroupRef.current.rotation.z = (1 - easeFall) * 0.1;
              modelGroupRef.current.position.y = BASE_Y - 0.52 * easeFall + bounce;
            }
            if (headPivotRef.current) {
              headPivotRef.current.rotation.set(0.1, 0, 0);
            }
          } else if (eDt < 3.2) {
            // Phase 3: Dazed resting on floor
            if (modelGroupRef.current) {
              modelGroupRef.current.rotation.x = -(Math.PI / 2.3);
              modelGroupRef.current.rotation.z = 0;
              modelGroupRef.current.position.y = BASE_Y - 0.52;
            }
            if (headPivotRef.current) {
              headPivotRef.current.rotation.y = Math.sin((eDt - 2.2) * 12) * 0.07;
              headPivotRef.current.rotation.z = Math.cos((eDt - 2.2) * 12) * 0.05;
            }
          } else if (eDt < 4.9) {
            // Phase 4: Stand back up and recover
            const tRise = (eDt - 3.2) / 1.7;
            const s = 1 - Math.pow(1 - tRise, 3);
            const fallAngle = -(Math.PI / 2.3);
            if (modelGroupRef.current) {
              modelGroupRef.current.rotation.x = fallAngle * (1 - s);
              modelGroupRef.current.position.y = (BASE_Y - 0.52) + 0.52 * s;
              modelGroupRef.current.rotation.z = 0;
            }
            if (tRise > 0.6 && screenMat && screenMat.emissiveMap !== openTex) {
              screenMat.emissiveMap = openTex;
              screenMat.needsUpdate = true;
            }
            if (headPivotRef.current) {
              if (tRise > 0.75) {
                headPivotRef.current.rotation.y = Math.sin(tRise * 35) * 0.18 * (1 - tRise);
                headPivotRef.current.rotation.z = 0;
                headPivotRef.current.rotation.x = 0;
              } else {
                headPivotRef.current.rotation.set(0, 0, 0);
              }
            }
          }
        }

        // Emote completion
        if (eDt >= emoteDuration) {
          currentEmote = null;
          setActiveEmote(null);
          if (modelGroupRef.current) {
            modelGroupRef.current.rotation.set(0, 0, 0);
            modelGroupRef.current.position.set(0, BASE_Y, 0);
          }
          if (headPivotRef.current) {
            headPivotRef.current.rotation.set(0, 0, 0);
          }
          if (screenMat) {
            screenMat.emissiveMap = openTex;
            screenMat.needsUpdate = true;
          }
        }
      } else {
        // Normal state: Breathing hover + manual drag + fast head-only gaze tracking
        if (modelGroupRef.current) {
          const breathe = Math.sin(elapsedTime * 2.2) * 0.025;
          modelGroupRef.current.position.y = BASE_Y + breathe;
          modelGroupRef.current.rotation.y = currentRotationRef.current.y;
          modelGroupRef.current.rotation.x = currentRotationRef.current.x;
          modelGroupRef.current.rotation.z = 0;

          if (statusRef.current === 'scanning' && floorLightRef.current) {
            floorLightRef.current.intensity = 3.5 + Math.sin(elapsedTime * 8) * 1.5;
          }
        }

        if (headPivotRef.current) {
          headPivotRef.current.rotation.x = curHeadRotX.current;
          headPivotRef.current.rotation.y = curHeadRotY.current;
          headPivotRef.current.rotation.z = 0;
        }

        // Natural Screen Eye Blink Logic
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

  const handleResetView = () => {
    targetRotationRef.current = { x: 0, y: 0 };
    targetZoomRef.current = 3.5;
  };

  const handleManualEmote = (emoteName) => {
    triggerEmoteRef.current?.(emoteName);
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
            ? 'bg-[#EE8656]/40 animate-pulse'
            : 'bg-[#EE8656]/20'
        }`} 
      />

      {/* Futuristic Concentric Pedestal Rings */}
      <div 
        className={`absolute bottom-7 sm:bottom-9 w-60 sm:w-72 h-10 rounded-[100%] border transition-all duration-700 pointer-events-none ${
          status === 'deepfake'
            ? 'border-red-500/60 shadow-[0_0_25px_rgba(239,68,68,0.5)]'
            : status === 'authentic'
            ? 'border-emerald-500/60 shadow-[0_0_25px_rgba(16,185,129,0.5)]'
            : 'border-[#EE8656]/40 shadow-[0_0_25px_rgba(238,134,86,0.35)]'
        }`}
      />
      <div className="absolute bottom-8 sm:bottom-10 w-44 sm:w-56 h-6 rounded-[100%] border border-dashed border-[#EE8656]/30 animate-spin pointer-events-none" style={{ animationDuration: '24s' }} />

      {/* Top Floating Header & Reset on Robot View */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0B1519]/90 border border-[#EE8656]/30 text-[#FA9C72] text-[11px] font-mono backdrop-blur-md shadow-md">
          <span className={`w-2 h-2 rounded-full ${
            status === 'deepfake' ? 'bg-red-500 animate-ping' : status === 'authentic' ? 'bg-emerald-400' : 'bg-[#EE8656] animate-pulse'
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

      {/* Interactive Emote Actions Toolbar (Top-Right Floating below Header) */}
      <div className="absolute top-16 right-4 z-20 flex items-center gap-1.5 p-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-cyan-500/25 shadow-xl pointer-events-auto">
        <div className="flex items-center gap-1 px-1.5 text-[10px] font-mono text-slate-400 border-r border-slate-800 pr-2">
          <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span className="hidden sm:inline">Emotes</span>
        </div>
        <button
          onClick={() => handleManualEmote('happy')}
          title="Happy Double Nod"
          className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 ${
            activeEmote === 'happy'
              ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.4)]'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-cyan-500/40'
          }`}
        >
          <span>😊</span>
          <span className="hidden md:inline">Happy</span>
        </button>
        <button
          onClick={() => handleManualEmote('curious')}
          title="Curious Head Tilt"
          className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 ${
            activeEmote === 'curious'
              ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.4)]'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-cyan-500/40'
          }`}
        >
          <span>🤔</span>
          <span className="hidden md:inline">Curious</span>
        </button>
        <button
          onClick={() => handleManualEmote('scan')}
          title="Radar Sweep Scan"
          className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 ${
            activeEmote === 'scan'
              ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.4)]'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-cyan-500/40'
          }`}
        >
          <span>📡</span>
          <span className="hidden md:inline">Scan</span>
        </button>
        <button
          onClick={() => handleManualEmote('wink')}
          title="Cheeky Wink"
          className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 ${
            activeEmote === 'wink'
              ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400 shadow-[0_0_10px_rgba(0,240,255,0.4)]'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-cyan-500/40'
          }`}
        >
          <span>😉</span>
          <span className="hidden md:inline">Wink</span>
        </button>
        <button
          onClick={() => handleManualEmote('dizzy')}
          title="Dizzy & Tumble Fall Easter Egg (or continuously spin cursor for 4s!)"
          className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1 ${
            activeEmote === 'dizzy'
              ? 'bg-rose-500/30 text-rose-300 border border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
              : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 hover:border-rose-400/60'
          }`}
        >
          <span>💫</span>
          <span>Tumble</span>
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
        <span>Drag to rotate 360° • Fast head cursor tracking • Spin cursor for 4s to tumble</span>
      </div>

    </div>
  );
}
