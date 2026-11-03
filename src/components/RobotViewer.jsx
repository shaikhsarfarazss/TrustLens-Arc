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

    // Emissive eye textures for blinking, game emotes & expressions
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
    const combatTex = texLoader.load('/robot_emissive_combat.jpg');
    combatTex.flipY = false;
    const hypeTex = texLoader.load('/robot_emissive_hype.jpg');
    hypeTex.flipY = false;

    const blinkTextures = { openTex, halfTex, blinkTex };

    let nextBlinkTime = 2.5;
    let blinkStartTime = 0;
    let isBlinking = false;
    let isDoubleBlink = false;

    // Multi-Joint Hierarchy Nodes (Root, Upper Body Spine, Neck Head)
    let rootGroupRef = null;
    let upperBodyPivotRef = null;
    let headPivotRef = null;
    let modelRef = null;
    let baseModelScale = 1.0;
    const BASE_Y = -1.26;

    // Gaze Cursor Tracking
    let targetHeadRotX = 0;
    let targetHeadRotY = 0;
    let curHeadRotX = 0;
    let curHeadRotY = 0;

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

      if (name === 'booyah') emoteDuration = 5.2;
      else if (name === 'floss') emoteDuration = 5.0;
      else if (name === 'dab') emoteDuration = 4.4;
      else if (name === 'breakdance') emoteDuration = 4.6;
      else if (name === 'dizzy') emoteDuration = 5.0;
      else emoteDuration = 2.5;

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

    // 3. Load GLB Model and Build Articulated Multi-Joint Rig
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

        // Setup isolated screen emissive material
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

        // Measure bounding box for accurate viewport scaling
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const TARGET_HEIGHT = 2.26;
        baseModelScale = TARGET_HEIGHT / (size.y || 1);

        const rootGroup = new THREE.Group();
        rootGroup.scale.set(baseModelScale, baseModelScale, baseModelScale);

        model.position.x = -center.x;
        model.position.y = -box.min.y;
        model.position.z = -center.z;
        rootGroup.add(model);

        rootGroup.position.set(0, BASE_Y, 0);
        scene.add(rootGroup);
        rootGroupRef = rootGroup;
        modelRef = model;

        // A. Measure head bounding box before restructuring
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

        // B. Setup Upper Body Spine Pivot (Torso, Shoulders, Arms, Backpack)
        const upperPivot = new THREE.Group();
        // Pivot center at spine/waist
        upperPivot.position.set(0, 0.76, 0);
        model.add(upperPivot);

        const upperPartNames = [
          'body', 'bag', 'bag.001',
          'arms_high', 'arms_high.002', 'arms_high.003',
          'arm_joints', 'arm_joints_2', 'arm_joint_part',
          'neck'
        ];
        upperPartNames.forEach((name) => {
          const part = model.getObjectByName(name);
          if (part) upperPivot.attach(part);
        });
        upperBodyPivotRef = upperPivot;

        // C. Setup Head Pivot attached to Upper Body
        const headPivot = new THREE.Group();
        const headCenter = new THREE.Vector3();
        headBox.getCenter(headCenter);
        // Position pivot at the neck joint
        headPivot.position.set(headCenter.x, headBox.min.y + 0.12, headCenter.z);
        upperPivot.add(headPivot);

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

    // 4. Animation Loop with Full-Body Game Choreographies
    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (!isVisibleRef.current) return;

      const elapsedTime = clock.getElapsedTime();

      // Check if continuous movement stopped
      if (performance.now() - lastMoveTimestamp > 450) {
        continuousMoveDuration = 0;
      }

      // Periodic Idle Game Emote (triggers naturally every 50-80s when user idle > 5s)
      if (!currentEmote && (elapsedTime - lastInteractionTime > 5.0) && elapsedTime >= nextIdleEmoteTime) {
        const gamePool = ['booyah', 'floss', 'dab', 'breakdance'];
        const picked = gamePool[Math.floor(Math.random() * gamePool.length)];
        triggerEmote(picked);
      }

      // Ultra-Fast Head-Only Gaze Tracking (Lerp 0.35)
      curHeadRotX += (targetHeadRotX - curHeadRotX) * 0.35;
      curHeadRotY += (targetHeadRotY - curHeadRotY) * 0.35;

      // Handle Active Game Emotes
      if (currentEmote) {
        const eDt = elapsedTime - emoteStartTime;

        // ==========================================
        // 1. FREE FIRE: "BOOYAH!" LEAP & GROUND SLAM
        // ==========================================
        if (currentEmote === 'booyah') {
          if (eDt < 0.9) {
            // Phase 1: Deep Anticipation Squat & Coil
            const p = eDt / 0.9;
            const ease = Math.sin(p * Math.PI * 0.5);
            if (screenMat && screenMat.emissiveMap !== combatTex) {
              screenMat.emissiveMap = combatTex;
              screenMat.needsUpdate = true;
            }
            if (rootGroupRef) {
              rootGroupRef.position.y = BASE_Y - 0.28 * ease;
              rootGroupRef.scale.set(
                baseModelScale * (1 + 0.16 * ease),
                baseModelScale * (1 - 0.22 * ease),
                baseModelScale * (1 + 0.16 * ease)
              );
            }
            if (upperBodyPivotRef) {
              upperBodyPivotRef.rotation.set(0.32 * ease, 0, 0);
            }
            if (headPivotRef) {
              headPivotRef.rotation.set(-0.15 * ease, 0, 0);
            }
          } else if (eDt < 2.0) {
            // Phase 2: Explosive Skyward Leap & Fist Pump
            const t = (eDt - 0.9) / 1.1;
            const jump = Math.sin(t * Math.PI);
            if (screenMat && screenMat.emissiveMap !== hypeTex) {
              screenMat.emissiveMap = hypeTex;
              screenMat.needsUpdate = true;
            }
            if (rootGroupRef) {
              rootGroupRef.position.y = BASE_Y + 0.88 * jump;
              rootGroupRef.rotation.y = Math.sin(t * Math.PI) * 0.55;
              rootGroupRef.scale.set(
                baseModelScale * (1 - 0.12 * jump),
                baseModelScale * (1 + 0.22 * jump),
                baseModelScale * (1 - 0.12 * jump)
              );
            }
            if (upperBodyPivotRef) {
              upperBodyPivotRef.rotation.set(-0.35 * jump, 0, 0);
            }
            if (headPivotRef) {
              headPivotRef.rotation.set(-0.38 * jump, 0, 0);
            }
          } else if (eDt < 2.8) {
            // Phase 3: Superhero 3-Point Ground Slam
            const t = (eDt - 2.0) / 0.8;
            const slamProgress = Math.min(1.0, t / 0.25);
            const bounce = (1 - slamProgress) * 0.08;
            if (rootGroupRef) {
              rootGroupRef.position.y = BASE_Y - 0.32 * (1 - t * 0.7) + bounce;
              rootGroupRef.rotation.y = 0;
              rootGroupRef.scale.set(
                baseModelScale * (1 + 0.24 * (1 - t)),
                baseModelScale * (1 - 0.28 * (1 - t)),
                baseModelScale * (1 + 0.24 * (1 - t))
              );
            }
            if (upperBodyPivotRef) {
              upperBodyPivotRef.rotation.set(0.52 * (1 - t * 0.8), 0, 0);
            }
            if (headPivotRef) {
              headPivotRef.rotation.set(0.28 * (1 - t * 1.5), 0, 0);
            }
          } else if (eDt < 5.2) {
            // Phase 4: Stand Up & Shoulder Swagger Dust-Off
            const t = (eDt - 2.8) / 2.4;
            const s = 1 - Math.pow(1 - Math.min(1.0, t * 1.5), 3);
            if (rootGroupRef) {
              rootGroupRef.position.y = (BASE_Y - 0.32 * 0.3) + (0.32 * 0.3) * s;
              rootGroupRef.rotation.set(0, 0, 0);
              rootGroupRef.scale.set(baseModelScale, baseModelScale, baseModelScale);
            }
            if (upperBodyPivotRef) {
              const dustOff = Math.sin(t * 16) * 0.14 * Math.exp(-t * 2.2);
              upperBodyPivotRef.rotation.set(0, 0, dustOff);
            }
            if (headPivotRef) {
              const nod = Math.sin(t * 12) * 0.12 * Math.exp(-t * 2.0);
              headPivotRef.rotation.set(nod, 0, 0);
            }
            if (t > 0.6 && screenMat && screenMat.emissiveMap !== openTex) {
              screenMat.emissiveMap = openTex;
              screenMat.needsUpdate = true;
            }
          }

        // ==========================================
        // 2. FORTNITE: "CYBER FLOSS" RHYTHMIC DANCE
        // ==========================================
        } else if (currentEmote === 'floss') {
          if (eDt < 4.2) {
            // Active Floss Motion at 135 BPM (omega = 13.5 rad/s)
            const omega = 13.5;
            const swingY = Math.sin(eDt * omega) * 0.44;
            const swayZ = Math.cos(eDt * omega) * 0.20;
            const hipX = -Math.sin(eDt * omega) * 0.13;
            const footHop = Math.abs(Math.sin(eDt * omega)) * 0.08;

            const useTex = Math.sin(eDt * 3) > 0 ? happyTex : hypeTex;
            if (screenMat && screenMat.emissiveMap !== useTex) {
              screenMat.emissiveMap = useTex;
              screenMat.needsUpdate = true;
            }

            if (rootGroupRef) {
              rootGroupRef.position.x = hipX;
              rootGroupRef.position.y = BASE_Y + footHop;
              rootGroupRef.rotation.z = -swayZ * 0.35;
            }
            if (upperBodyPivotRef) {
              upperBodyPivotRef.rotation.y = swingY;
              upperBodyPivotRef.rotation.z = swayZ;
              upperBodyPivotRef.rotation.x = Math.sin(eDt * omega * 2) * 0.06;
            }
            if (headPivotRef) {
              headPivotRef.rotation.y = -swingY * 0.4;
              headPivotRef.rotation.x = curHeadRotX + 0.08;
              headPivotRef.rotation.z = -swayZ * 0.2;
            }
          } else {
            // Final Freeze-Frame Flex Pose & Cheeky Wink
            if (screenMat && screenMat.emissiveMap !== winkTex) {
              screenMat.emissiveMap = winkTex;
              screenMat.needsUpdate = true;
            }
            if (rootGroupRef) {
              rootGroupRef.position.set(0, BASE_Y, 0);
              rootGroupRef.rotation.set(0, 0, 0);
            }
            if (upperBodyPivotRef) {
              upperBodyPivotRef.rotation.set(-0.15, 0.24, 0);
            }
            if (headPivotRef) {
              headPivotRef.rotation.set(-0.12, 0.12, 0.15);
            }
          }

        // ==========================================
        // 3. BGMI / PUBG: COMBAT STRIKE & CYBER DAB
        // ==========================================
        } else if (currentEmote === 'dab') {
          if (eDt < 0.6) {
            // Phase 1: Martial Arts Boxing Stance
            if (screenMat && screenMat.emissiveMap !== combatTex) {
              screenMat.emissiveMap = combatTex;
              screenMat.needsUpdate = true;
            }
            const shuffle = Math.abs(Math.sin(eDt * 22)) * 0.04;
            if (rootGroupRef) {
              rootGroupRef.position.y = BASE_Y + shuffle;
              rootGroupRef.position.z = 0.05;
            }
            if (upperBodyPivotRef) {
              upperBodyPivotRef.rotation.set(0.18, Math.sin(eDt * 12) * 0.16, 0);
            }
            if (headPivotRef) {
              headPivotRef.rotation.set(0.08, 0, 0);
            }
          } else if (eDt < 1.7) {
            // Phase 2: Triple Punch Combo
            const sub = eDt - 0.6;
            if (sub < 0.35) {
              // Strike 1: Left Hook
              const p = sub / 0.35;
              if (upperBodyPivotRef) upperBodyPivotRef.rotation.set(0.12, 0.52 * Math.sin(p * Math.PI), 0);
              if (rootGroupRef) rootGroupRef.position.z = 0.05 + 0.12 * Math.sin(p * Math.PI);
            } else if (sub < 0.70) {
              // Strike 2: Right Uppercut
              const p = (sub - 0.35) / 0.35;
              if (upperBodyPivotRef) upperBodyPivotRef.rotation.set(-0.25 * Math.sin(p * Math.PI), -0.55 * Math.sin(p * Math.PI), 0);
              if (rootGroupRef) rootGroupRef.position.y = BASE_Y + 0.10 * Math.sin(p * Math.PI);
            } else {
              // Strike 3: Direct Cross Snap
              const p = (sub - 0.70) / 0.40;
              if (upperBodyPivotRef) upperBodyPivotRef.rotation.set(0.24, 0.40 * Math.sin(p * Math.PI), 0);
              if (rootGroupRef) rootGroupRef.position.z = 0.05 + 0.15 * Math.sin(p * Math.PI);
            }
          } else if (eDt < 3.3) {
            // Phase 3: The Cyber Dab!
            if (screenMat && screenMat.emissiveMap !== hypeTex) {
              screenMat.emissiveMap = hypeTex;
              screenMat.needsUpdate = true;
            }
            if (rootGroupRef) {
              rootGroupRef.position.set(0, BASE_Y - 0.10, 0);
              rootGroupRef.rotation.set(0, 0, 0);
            }
            if (upperBodyPivotRef) {
              upperBodyPivotRef.rotation.set(0.26, 0.34, -0.48);
            }
            if (headPivotRef) {
              // Head tucked in into elbow fold
              headPivotRef.rotation.set(0.36, 0, -0.32);
            }
          } else if (eDt < 4.4) {
            // Phase 4: Martial Arts Bow & Recover
            const t = (eDt - 3.3) / 1.1;
            const s = 1 - Math.pow(1 - t, 3);
            if (rootGroupRef) {
              rootGroupRef.position.set(0, BASE_Y, 0);
            }
            if (upperBodyPivotRef) {
              const bow = Math.sin(t * Math.PI) * 0.28;
              upperBodyPivotRef.rotation.set(bow * (1 - s), 0, 0);
            }
            if (headPivotRef) {
              headPivotRef.rotation.set(0, 0, 0);
            }
            if (screenMat && screenMat.emissiveMap !== openTex) {
              screenMat.emissiveMap = openTex;
              screenMat.needsUpdate = true;
            }
          }

        // ==========================================
        // 4. FREE FIRE / FORTNITE: 360 POP-LOCK SPIN
        // ==========================================
        } else if (currentEmote === 'breakdance') {
          if (eDt < 1.2) {
            // Phase 1: Electric Wave Pop & Lock
            if (screenMat && screenMat.emissiveMap !== scanTex) {
              screenMat.emissiveMap = scanTex;
              screenMat.needsUpdate = true;
            }
            const wave = Math.sin(eDt * 16) * 0.24;
            if (upperBodyPivotRef) {
              upperBodyPivotRef.rotation.set(Math.cos(eDt * 16) * 0.10, 0, wave);
            }
            if (headPivotRef) {
              headPivotRef.rotation.set(0, 0, -wave * 0.5);
            }
            if (rootGroupRef) {
              rootGroupRef.position.y = BASE_Y + Math.abs(Math.sin(eDt * 16)) * 0.03;
            }
          } else if (eDt < 2.3) {
            // Phase 2: Airborne 360 Spin
            const t = (eDt - 1.2) / 1.1;
            const leap = Math.sin(t * Math.PI);
            if (screenMat && screenMat.emissiveMap !== hypeTex) {
              screenMat.emissiveMap = hypeTex;
              screenMat.needsUpdate = true;
            }
            if (rootGroupRef) {
              rootGroupRef.position.y = BASE_Y + 0.68 * leap;
              rootGroupRef.rotation.y = t * Math.PI * 2;
            }
            if (upperBodyPivotRef) {
              upperBodyPivotRef.rotation.set(-0.15 * leap, 0, 0);
            }
            if (headPivotRef) {
              headPivotRef.rotation.set(0, 0, 0);
            }
          } else if (eDt < 3.6) {
            // Phase 3: Freeze-Frame Power Flex
            if (screenMat && screenMat.emissiveMap !== combatTex) {
              screenMat.emissiveMap = combatTex;
              screenMat.needsUpdate = true;
            }
            if (rootGroupRef) {
              rootGroupRef.position.set(0, BASE_Y - 0.12, 0);
              rootGroupRef.rotation.set(0, 0, 0);
              rootGroupRef.scale.set(baseModelScale * 1.12, baseModelScale * 0.92, baseModelScale * 1.12);
            }
            if (upperBodyPivotRef) {
              upperBodyPivotRef.rotation.set(-0.22, 0, 0);
            }
            if (headPivotRef) {
              headPivotRef.rotation.set(-0.10, 0, 0);
            }
          } else if (eDt < 4.6) {
            // Phase 4: Relax & Reset
            const t = (eDt - 3.6) / 1.0;
            if (rootGroupRef) {
              rootGroupRef.position.set(0, BASE_Y, 0);
              rootGroupRef.scale.set(baseModelScale, baseModelScale, baseModelScale);
            }
            if (upperBodyPivotRef) {
              upperBodyPivotRef.rotation.set(0, 0, 0);
            }
            if (headPivotRef) {
              headPivotRef.rotation.set(0, 0, 0);
            }
            if (screenMat && screenMat.emissiveMap !== openTex) {
              screenMat.emissiveMap = openTex;
              screenMat.needsUpdate = true;
            }
          }

        // ==========================================
        // 5. EASTER EGG: DIZZY TUMBLE FALL & STAND UP
        // ==========================================
        } else if (currentEmote === 'dizzy') {
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
            if (upperBodyPivotRef) {
              upperBodyPivotRef.rotation.z = Math.sin(eDt * 8) * 0.15 * p;
            }
            if (rootGroupRef) {
              rootGroupRef.rotation.z = Math.sin(eDt * 9) * 0.10 * p;
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
            if (upperBodyPivotRef) {
              upperBodyPivotRef.rotation.set(0, 0, 0);
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

        // Emote Completion
        if (eDt >= emoteDuration) {
          currentEmote = null;
          setActiveEmote(null);
          if (rootGroupRef) {
            rootGroupRef.rotation.set(0, 0, 0);
            rootGroupRef.position.set(0, BASE_Y, 0);
            rootGroupRef.scale.set(baseModelScale, baseModelScale, baseModelScale);
          }
          if (upperBodyPivotRef) {
            upperBodyPivotRef.rotation.set(0, 0, 0);
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
        // Normal State: Lifelike Eye Blink logic + fast head cursor tracking
        if (headPivotRef) {
          headPivotRef.rotation.x = curHeadRotX;
          headPivotRef.rotation.y = curHeadRotY;
          headPivotRef.rotation.z = 0;
        }
        if (upperBodyPivotRef) {
          upperBodyPivotRef.rotation.set(0, 0, 0);
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
      combatTex.dispose();
      hypeTex.dispose();
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

      {/* Quick Interactive Game Emotes Toolbar (Top Right) */}
      <div className="absolute top-6 right-6 z-30 flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/85 backdrop-blur-md border border-cyan-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.5)] pointer-events-auto">
        <div className="flex items-center gap-1 px-2 text-[11px] font-mono font-semibold text-slate-400 border-r border-slate-700/60 mr-0.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="hidden sm:inline">Game Emotes</span>
        </div>
        
        {/* Free Fire: Booyah Leap & Ground Slam */}
        <button
          onClick={() => handleManualEmote('booyah')}
          title="Free Fire - Hero Booyah Leap & Ground Slam"
          className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeEmote === 'booyah'
              ? 'bg-amber-500/30 text-amber-300 border border-amber-400 shadow-[0_0_14px_rgba(245,158,11,0.5)] scale-105'
              : 'bg-slate-800/80 hover:bg-slate-700/80 text-amber-300/90 border border-amber-500/30 hover:border-amber-400/60'
          }`}
        >
          <span>💥</span>
          <span className="hidden md:inline">Booyah</span>
        </button>

        {/* Fortnite: Cyber Floss Dance */}
        <button
          onClick={() => handleManualEmote('floss')}
          title="Fortnite - Cyber Floss Rhythmic Dance"
          className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeEmote === 'floss'
              ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400 shadow-[0_0_14px_rgba(0,240,255,0.5)] scale-105'
              : 'bg-slate-800/80 hover:bg-slate-700/80 text-cyan-300/90 border border-cyan-500/30 hover:border-cyan-400/60'
          }`}
        >
          <span>⚡</span>
          <span className="hidden md:inline">Floss</span>
        </button>

        {/* BGMI: Combat Strike & Cyber Dab */}
        <button
          onClick={() => handleManualEmote('dab')}
          title="BGMI / PUBG - Combat Strike Combo & Cyber Dab"
          className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeEmote === 'dab'
              ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.5)] scale-105'
              : 'bg-slate-800/80 hover:bg-slate-700/80 text-emerald-300/90 border border-emerald-500/30 hover:border-emerald-400/60'
          }`}
        >
          <span>🥋</span>
          <span className="hidden md:inline">Dab Strike</span>
        </button>

        {/* Free Fire / Fortnite: 360 Spin & Pop-Lock */}
        <button
          onClick={() => handleManualEmote('breakdance')}
          title="Fortnite/Free Fire - 360 Airborne Spin & Pop-Lock"
          className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeEmote === 'breakdance'
              ? 'bg-purple-500/30 text-purple-300 border border-purple-400 shadow-[0_0_14px_rgba(168,85,247,0.5)] scale-105'
              : 'bg-slate-800/80 hover:bg-slate-700/80 text-purple-300/90 border border-purple-500/30 hover:border-purple-400/60'
          }`}
        >
          <span>🕺</span>
          <span className="hidden md:inline">360 Spin</span>
        </button>

        {/* Easter Egg: Dizzy Tumble Fall */}
        <button
          onClick={() => handleManualEmote('dizzy')}
          title="Dizzy & Tumble Fall Easter Egg (or continuously spin cursor for 4s!)"
          className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            activeEmote === 'dizzy'
              ? 'bg-rose-500/30 text-rose-300 border border-rose-400 shadow-[0_0_14px_rgba(244,63,94,0.5)] scale-105'
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
