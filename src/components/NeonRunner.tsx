import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Heart, Pause, Play } from 'lucide-react';
import * as THREE from 'three';
import { GAME_CONFIG } from '../constants';
import { Lane } from '../types';
import { AudioManager } from '../services/audioService';

interface GameProps {
  onScoreUpdate: (score: number, processors: number) => void;
  onGameOver: () => void;
  onLifeLost: (lives: number) => void;
  onTogglePause: () => void;
  lives: number;
  maxLives: number;
  isPaused: boolean;
}

export const NeonRunner: React.FC<GameProps> = ({ onScoreUpdate, onGameOver, onLifeLost, onTogglePause, lives, maxLives, isPaused }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(isPaused);
  
  // Local states for distance and processors
  const [distance, setDistance] = useState(0);
  const [processors, setProcessors] = useState(0);

  const grRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    player: THREE.Group;
    lLeg: THREE.Object3D;
    rLeg: THREE.Object3D;
    lArm: THREE.Object3D;
    rArm: THREE.Object3D;
    shieldMesh: THREE.Mesh;
    obstacles: THREE.Mesh[];
    points: THREE.Mesh[];
    powerups: THREE.Mesh[];
    buildings: THREE.Mesh[];
    grid: THREE.GridHelper;
    speed: number;
    distance: number;
    processors: number;
    currentLane: Lane;
    targetX: number;
    invulnerable: number;
    animationId: number;
    lastSpawnZ: number[];
    isJumping: boolean;
    jumpVelocity: number;
    modifierShield: number;
    modifierMultiplier: number;
    modifierSlow: number;
    isGameOver: boolean;
  } | null>(null);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const gameRef = grRef; // Alias for consistency

  const [activeShield, setActiveShield] = useState(false);
  const [activeMultiplier, setActiveMultiplier] = useState(false);
  const [activeSlow, setActiveSlow] = useState(false);

  // Use refs for callbacks to avoid re-triggering the setup effect
  const callbacksRef = useRef({ onScoreUpdate, onGameOver, onLifeLost });
  useEffect(() => {
    callbacksRef.current = { onScoreUpdate, onGameOver, onLifeLost };
  }, [onScoreUpdate, onGameOver, onLifeLost]);

  // Keyboard & Touch controls
  const touchStartRef = useRef<{ x: number, y: number } | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!gameRef.current || isPaused) return;
    const gr = gameRef.current;

    if (e.key === 'ArrowLeft' || e.key === 'a') {
      if (gr.currentLane > -2) gr.currentLane = (gr.currentLane - 1) as Lane;
    } else if (e.key === 'ArrowRight' || e.key === 'd') {
      if (gr.currentLane < 2) gr.currentLane = (gr.currentLane + 1) as Lane;
    } else if ((e.key === 'ArrowUp' || e.key === 'w') && !gr.isJumping) {
      gr.isJumping = true;
      gr.jumpVelocity = GAME_CONFIG.JUMP_FORCE;
    }
  }, [isPaused]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (isPaused) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  }, [isPaused]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!gameRef.current || isPaused || !touchStartRef.current) return;
    const gr = gameRef.current;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const dx = touchEndX - touchStartRef.current.x;
    const dy = touchEndY - touchStartRef.current.y;
    
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    
    const threshold = 30; // Minimum swipe distance

    if (Math.max(absDx, absDy) > threshold) {
      if (absDx > absDy) {
        // Horizontal swipe
        if (dx > 0) {
          if (gr.currentLane < 2) gr.currentLane = (gr.currentLane + 1) as Lane;
        } else {
          if (gr.currentLane > -2) gr.currentLane = (gr.currentLane - 1) as Lane;
        }
      } else {
        // Vertical swipe
        if (dy < 0 && !gr.isJumping) {
          // Swipe up
          gr.isJumping = true;
          gr.jumpVelocity = GAME_CONFIG.JUMP_FORCE;
        }
      }
    }
    
    touchStartRef.current = null;
  }, [isPaused]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Prevent default touch behavior (scrolling)
    const preventDefault = (e: TouchEvent) => {
      if (!isPaused && e.cancelable) e.preventDefault();
    };
    window.addEventListener('touchmove', preventDefault, { passive: false });

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchmove', preventDefault);
    };
  }, [handleKeyDown, handleTouchStart, handleTouchEnd, isPaused]);

  const livesRef = useRef(lives);
  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);

  // Initialization Effect (Only runs once)
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || window.innerWidth;
    const height = containerRef.current.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      powerPreference: 'high-performance',
      alpha: false
    });

    renderer.setClearColor(0x020617, 1);
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    containerRef.current.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617);
    scene.fog = new THREE.Fog(0x020617, 10, 300);

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 10, 22);
    camera.lookAt(0, 0, -15);

    scene.add(new THREE.AmbientLight(0xffffff, 1.5));
    const dLight = new THREE.DirectionalLight(0xffffff, 2.5);
    dLight.position.set(10, 30, 20);
    scene.add(dLight);

    // Detailed Cyberpunk Robot (Plating & Glowing Joints)
    const playerGroup = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: 0x0ea5e9, 
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.8, 
      roughness: 0.1,
      metalness: 0.9
    });
    const subMat = new THREE.MeshStandardMaterial({ 
      color: 0x1e293b, 
      roughness: 0.6,
      metalness: 0.5
    });
    const glowMat = new THREE.MeshStandardMaterial({ 
      color: 0x22d3ee, 
      emissive: 0x22d3ee, 
      emissiveIntensity: 5 
    });

    // Torso with armor plates
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 1.2, 8, 20), bodyMat);
    torso.position.y = 1.8;
    playerGroup.add(torso);
    
    // Core Battery
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), glowMat);
    core.position.set(0, 2.0, 0.5);
    playerGroup.add(core);

    // Shoulder Pads
    const padGeo = new THREE.BoxGeometry(0.5, 0.4, 0.6);
    const lPad = new THREE.Mesh(padGeo, bodyMat);
    lPad.position.set(-0.8, 2.6, 0);
    playerGroup.add(lPad);
    const rPad = new THREE.Mesh(padGeo, bodyMat);
    rPad.position.set(0.8, 2.6, 0);
    playerGroup.add(rPad);

    // head
    const headGroup = new THREE.Group();
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 16), subMat);
    const visorMount = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.2, 20), bodyMat);
    visorMount.rotation.x = Math.PI / 2;
    visorMount.position.z = 0.2;
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 0.1), glowMat);
    eye.position.z = 0.5;
    headGroup.add(skull, visorMount, eye);
    headGroup.position.y = 3.3;
    playerGroup.add(headGroup);

    // Limbs with articulation
    const jointGeo = new THREE.SphereGeometry(0.2, 12, 12);
    const jointMat = glowMat;
    const limbMat = subMat;

    const createHumanoidLimb = (x: number, y: number, isLeg: boolean) => {
      const group = new THREE.Group();
      
      // Upper segment
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.6, 4, 12), limbMat);
      upper.position.y = 0.3;
      group.add(upper);

      // Joint (Knee or Elbow)
      const joint = new THREE.Mesh(jointGeo, jointMat);
      joint.position.y = -0.1;
      group.add(joint);

      // Lower segment
      const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.6, 4, 12), limbMat);
      lower.position.y = -0.5;
      group.add(lower);

      // Armor plating on upper
      const plate = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.4, 4, 12), bodyMat);
      plate.position.y = 0.4;
      group.add(plate);

      if (isLeg) {
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.5), bodyMat);
        foot.position.set(0, -0.9, 0.1);
        group.add(foot);
      } else {
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), bodyMat);
        hand.position.y = -0.9;
        group.add(hand);
      }

      group.position.set(x, y, 0);
      return group;
    };

    const lLeg = createHumanoidLimb(-0.4, 0.7, true);
    const rLeg = createHumanoidLimb(0.4, 0.7, true);
    const lArm = createHumanoidLimb(-0.9, 2.3, false);
    const rArm = createHumanoidLimb(0.9, 2.3, false);
    
    playerGroup.add(lLeg, rLeg, lArm, rArm);

    // Shield visual
    const shieldGeo = new THREE.SphereGeometry(3.5, 32, 32);
    const shieldMat = new THREE.MeshStandardMaterial({
      color: GAME_CONFIG.COLORS.SHIELD,
      transparent: true,
      opacity: 0.3,
      side: THREE.BackSide,
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    shieldMesh.position.y = 2;
    shieldMesh.visible = false;
    playerGroup.add(shieldMesh);

    scene.add(playerGroup);

    // Floor, Grid & Dividers
    const floorGeo = new THREE.PlaneGeometry(1000, 1000);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: 0x020617, 
      roughness: 0.9,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.05;
    scene.add(floor);

    const grid = new THREE.GridHelper(1000, 100, 0x1e293b, 0x1e293b);
    grid.position.y = 0;
    scene.add(grid);

    // Lane Dividers & Outer Edges
    for(let i = -3; i <= 2; i++) {
      const divider = new THREE.Mesh(
        new THREE.PlaneGeometry(0.3, 1000),
        new THREE.MeshStandardMaterial({ 
          color: i === -3 || i === 2 ? 0xec4899 : 0x22d3ee, 
          emissive: i === -3 || i === 2 ? 0xec4899 : 0x22d3ee, 
          emissiveIntensity: 1.5, 
          transparent: true, 
          opacity: 0.6 
        })
      );
      divider.rotation.x = -Math.PI / 2;
      divider.position.set(i * GAME_CONFIG.LANE_WIDTH + GAME_CONFIG.LANE_WIDTH/2, 0.02, -250);
      scene.add(divider);
    }

    // Background Buildings (Diverse & Solid)
    const buildings: THREE.Mesh[] = [];
    const createBuilding = (z: number, left: boolean) => {
      const h = 40 + Math.random() * 100;
      const w = 20 + Math.random() * 30;
      const type = Math.floor(Math.random() * 3); // 0: Box, 1: Cylinder, 2: Pyramid-ish
      
      let geometry: THREE.BufferGeometry;
      if (type === 0) {
        geometry = new THREE.BoxGeometry(w, h, w);
      } else if (type === 1) {
        geometry = new THREE.CylinderGeometry(w/2, w/2, h, 8);
      } else {
        geometry = new THREE.ConeGeometry(w, h, 4);
      }

      const b = new THREE.Mesh(
        geometry,
        new THREE.MeshStandardMaterial({ 
          color: left ? 0x0f172a : 0x1e1b4b, 
          roughness: 0.4,
          metalness: 0.8,
          emissive: type === 0 ? 0x000000 : GAME_CONFIG.COLORS.GRID,
          emissiveIntensity: 0.1
        })
      );
      b.position.set(left ? -60 - w/2 : 60 + w/2, h/2, z);
      scene.add(b);
      return b;
    };
    for(let z=0; z>-600; z-=50) {
      buildings.push(createBuilding(z, true));
      buildings.push(createBuilding(z, false));
    }

    gameRef.current = {
      scene, camera, renderer,
      player: playerGroup, lLeg, rLeg,
      obstacles: [], points: [], powerups: [], buildings, grid,
      lArm, rArm, shieldMesh,
      speed: GAME_CONFIG.INITIAL_SPEED,
      distance: 0,
      processors: 0,
      currentLane: 0 as Lane,
      targetX: 0,
      invulnerable: 0,
      animationId: 0,
      lastSpawnZ: [0, 0, 0, 0, 0], // For 5 lanes
      isJumping: false,
      jumpVelocity: 0,
      modifierShield: 0,
      modifierMultiplier: 0,
      modifierSlow: 0,
      isGameOver: false, // NEW: Prevent updates after loss
    };
    const gr = gameRef.current; // Direct ref for local use

    const createProcessorMesh = (size: number, color: number, value: number) => {
      const group = new THREE.Group();
      
      // Main PCB Base: Color is now light yellow for high visibility
      const baseColor = 0xfef08a; // Light Yellow / Cream
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(size * 1.2, 0.2, size * 1.2),
        new THREE.MeshStandardMaterial({ 
          color: baseColor, 
          metalness: 0.2, 
          roughness: 0.5,
          emissive: baseColor,
          emissiveIntensity: 0.2 // Slight glow for visibility
        })
      );
      group.add(body);

      // Distinctive Border
      const borderMat = new THREE.MeshStandardMaterial({ 
        color: 0x000000, 
        metalness: 1, 
        roughness: 0.1 
      });
      [
        { w: 1.25, h: 0.1, d: 0.05, px: 0, pz: 0.6 },
        { w: 1.25, h: 0.1, d: 0.05, px: 0, pz: -0.6 },
        { w: 0.05, h: 0.1, d: 1.25, px: 0.6, pz: 0 },
        { w: 0.05, h: 0.1, d: 1.25, px: -0.6, pz: 0 }
      ].forEach(b => {
        const box = new THREE.Mesh(new THREE.BoxGeometry(size * b.w, size * b.h, size * b.d), borderMat);
        box.position.set(size * b.px, 0, size * b.pz);
        group.add(box);
      });

      // Tiered Architectural Details
      if (value >= 100) {
        // High-end chips get glowing trace lines
        const traceMat = new THREE.MeshStandardMaterial({ 
          color, 
          emissive: color, 
          emissiveIntensity: 2 
        });
        const trace1 = new THREE.Mesh(new THREE.BoxGeometry(size * 0.8, 0.02, size * 0.05), traceMat);
        trace1.position.y = 0.11;
        group.add(trace1);
        
        // Components (SMDs/Capacitors)
        const compMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 1 });
        const compCount = value >= 250 ? 6 : 3;
        for(let i=0; i < compCount; i++) {
          const comp = new THREE.Mesh(new THREE.BoxGeometry(size * 0.1, 0.1, size * 0.15), compMat);
          const ang = (i / compCount) * Math.PI * 2;
          comp.position.set(Math.cos(ang) * size * 0.45, 0.15, Math.sin(ang) * size * 0.45);
          group.add(comp);
        }
      }

      // CPU Core (Die) - Intensity scales with value
      const intensity = value >= 250 ? 12 : (value >= 100 ? 8 : 4);
      const core = new THREE.Mesh(
        new THREE.BoxGeometry(size * 0.4, 0.3, size * 0.4),
        new THREE.MeshStandardMaterial({ 
          color: 0xffffff, 
          emissive: color, 
          emissiveIntensity: intensity,
          metalness: 1
        })
      );
      core.position.y = 0.2;
      group.add(core);

      // Rare glow aura for i9/250+
      if (value >= 250) {
        const aura = new THREE.Mesh(
          new THREE.PlaneGeometry(size * 1.5, size * 1.5),
          new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.15, side: THREE.DoubleSide })
        );
        aura.rotation.x = -Math.PI / 2;
        aura.position.y = -0.1;
        group.add(aura);
      }

      return group;
    };

    const createHeartMeshPowerup = (color: number) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0.7);
      shape.bezierCurveTo(0, 0.7, -0.7, 0.7, -0.7, 0);
      shape.bezierCurveTo(-0.7, -0.7, 0, -1, 0, -1.4);
      shape.bezierCurveTo(0, -1, 0.7, -0.7, 0.7, 0);
      shape.bezierCurveTo(0.7, 0.7, 0, 0.7, 0, 0.7);
      
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.4,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 2,
        bevelSize: 0.1,
        bevelThickness: 0.1
      });
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2 }));
      mesh.rotation.x = Math.PI; // Flip to face correctly
      mesh.scale.set(0.8, 0.8, 0.8);
      return mesh;
    };

    const createShieldMeshPowerupMesh = (color: number) => {
      const shape = new THREE.Shape();
      shape.moveTo(-0.7, 0.7);
      shape.lineTo(0.7, 0.7);
      shape.lineTo(0.7, 0);
      shape.quadraticCurveTo(0.7, -0.8, 0, -1.4);
      shape.quadraticCurveTo(-0.7, -0.8, -0.7, 0);
      shape.lineTo(-0.7, 0.7);

      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.3,
        bevelEnabled: true,
        bevelSize: 0.1,
        bevelThickness: 0.1
      });
      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2 }));
      mesh.rotation.y = Math.PI; // Face player
      return mesh;
    };

    const createSnailMeshPowerup = (color: number) => {
      const group = new THREE.Group();
      
      // Shell (Torus spiral-ish)
      const shell = new THREE.Mesh(
        new THREE.TorusGeometry(0.6, 0.35, 12, 24),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5 })
      );
      shell.position.y = 0.4;
      group.add(shell);
      
      // Body
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.25, 1.2, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.3 })
      );
      body.rotation.z = Math.PI / 2;
      body.position.y = -0.3;
      group.add(body);
      
      // Antennae
      const eyeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5);
      const antMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
      const lAnt = new THREE.Mesh(eyeGeo, antMat);
      lAnt.position.set(0.7, 0.2, 0.15);
      lAnt.rotation.z = -0.4;
      group.add(lAnt);
      const rAnt = new THREE.Mesh(eyeGeo, antMat);
      rAnt.position.set(0.7, 0.2, -0.15);
      rAnt.rotation.z = -0.4;
      group.add(rAnt);
      
      group.rotation.y = -Math.PI / 2; // Face player

      return group;
    };

    const spawnPattern = (type: 'gate' | 'jump') => {
      if (!gameRef.current) return;
      const gr = gameRef.current;
      const currentZ = gr.distance;
      
      // Pattern needs more space than single entities
      const minDistance = 40; 
      if (gr.lastSpawnZ.some(z => currentZ - z < minDistance)) return;

      if (type === 'gate') {
        const freeLaneIndex = Math.floor(Math.random() * 5);
        for (let i = 0; i < 5; i++) {
          if (i === freeLaneIndex) continue;
          
          const lane = (i - 2) as Lane;
          const geometry = new THREE.BoxGeometry(2.5, 14, 2.5);
          const color = GAME_CONFIG.COLORS.OBSTACLE;
          const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ 
            color, 
            emissive: color, 
            emissiveIntensity: 1,
            roughness: 0.2
          }));
          mesh.userData = { type: 'obstacle', isTall: true };
          mesh.position.set(lane * GAME_CONFIG.LANE_WIDTH, 7, GAME_CONFIG.SPAWN_Z);
          gr.scene.add(mesh);
          gr.obstacles.push(mesh as THREE.Mesh);
          gr.lastSpawnZ[i] = currentZ;
        }
      } else if (type === 'jump') {
        for (let i = 0; i < 5; i++) {
          const lane = (i - 2) as Lane;
          const geometry = new THREE.BoxGeometry(2.5, 1.8, 2.8);
          const color = GAME_CONFIG.COLORS.OBSTACLE;
          const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ 
            color, 
            emissive: color, 
            emissiveIntensity: 1,
            roughness: 0.2
          }));
          mesh.userData = { type: 'obstacle', isLow: true };
          mesh.position.set(lane * GAME_CONFIG.LANE_WIDTH, 0.9, GAME_CONFIG.SPAWN_Z);
          gr.scene.add(mesh);
          gr.obstacles.push(mesh as THREE.Mesh);
          gr.lastSpawnZ[i] = currentZ;
        }
      }
    };

    const spawnEntity = (type: 'obstacle' | 'point' | 'powerup') => {
      if (!gameRef.current) return;
      const laneIndex = Math.floor(Math.random() * 5);
      const lane = (laneIndex - 2) as Lane;
      
      // Check for overlap in this lane locally (simple Z buffer check)
      const currentZ = gameRef.current.distance;
      if (currentZ - gameRef.current.lastSpawnZ[laneIndex] < 15) return;
      gameRef.current.lastSpawnZ[laneIndex] = currentZ;

      let mesh: THREE.Object3D;
      let userData: any = { type };

      if (type === 'obstacle') {
        const rand = Math.random();
        const isTall = rand > 0.7;
        const isLow = !isTall && rand > 0.3;
        
        let geometry: THREE.BufferGeometry;
        if (isTall) {
          geometry = new THREE.BoxGeometry(2.5, 12, 2.5);
          userData.isTall = true;
        } else if (isLow) {
          geometry = new THREE.BoxGeometry(2.5, 1.5, 2.5);
          userData.isLow = true;
        } else {
          geometry = new THREE.BoxGeometry(2.5, 4, 2.5);
        }
        
        const color = GAME_CONFIG.COLORS.OBSTACLE;
        mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ 
          color, 
          emissive: color, 
          emissiveIntensity: 1,
          roughness: 0.2
        }));
        mesh.position.y = isTall ? 6 : (isLow ? 0.75 : 2);
      } else if (type === 'point') {
        const rand = Math.random();
        let size: number;
        let value: number;
        let color: number;

        if (rand > 0.9) { // I9 (Large)
          size = 2.0; value = 250; color = 0x3b82f6; // Blue i9
        } else if (rand > 0.6) { // I7 (Med)
          size = 1.4; value = 100; color = 0xa855f7; // Purple i7
        } else { // I5 (Small)
          size = 1.0; value = 50; color = 0xfacc15; // Yellow i5
        }
        
        mesh = createProcessorMesh(size, color, value);
        // Tilt towards camera for visibility
        mesh.rotation.x = -Math.PI / 2.5; 
        userData.value = value;
        mesh.position.y = 2.2;
      } else { // powerup
        const rand = Math.random();
        let pTypeStr: string;
        
        if (rand < 0.05) { // 5% Heart
          pTypeStr = 'heart';
        } else if (rand < 0.35) { // 30% Shield
          pTypeStr = 'shield';
        } else if (rand < 0.65) { // 30% Multiplier
          pTypeStr = 'multiplier';
        } else { // 35% Slow
          pTypeStr = 'slow';
        }

        let powerupMesh: THREE.Object3D;
        let color: number;
        
        if (pTypeStr === 'shield') {
          color = GAME_CONFIG.COLORS.SHIELD;
          powerupMesh = createShieldMeshPowerupMesh(color);
          userData.powerupType = 'shield';
        } else if (pTypeStr === 'multiplier') {
          color = GAME_CONFIG.COLORS.MULTIPLIER;
          powerupMesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.2, 0), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2 }));
          userData.powerupType = 'multiplier';
        } else if (pTypeStr === 'slow') {
          color = GAME_CONFIG.COLORS.SLOWDOWN;
          powerupMesh = createSnailMeshPowerup(color);
          userData.powerupType = 'slow';
        } else {
          color = GAME_CONFIG.COLORS.HEART;
          powerupMesh = createHeartMeshPowerup(color);
          userData.powerupType = 'heart';
        }
        mesh = powerupMesh;
        mesh.position.y = 2.0;
      }

      mesh.userData = userData;
      mesh.position.x = lane * GAME_CONFIG.LANE_WIDTH;
      mesh.position.z = GAME_CONFIG.SPAWN_Z;
      scene.add(mesh);
      
      if (type === 'obstacle') gameRef.current.obstacles.push(mesh as THREE.Mesh);
      else if (type === 'point') gameRef.current.points.push(mesh as THREE.Mesh);
      else gameRef.current.powerups.push(mesh as THREE.Mesh);
    };

    let lastTime = 0;

    const animate = (time: number) => {
      if (!gameRef.current) return;
      const gr = gameRef.current;

      if (lastTime === 0) {
        lastTime = time;
        gr.animationId = requestAnimationFrame(animate);
        return;
      }

      const delta = Math.min((time - lastTime) / 1000, 0.1); // Cap delta to avoid huge jumps
      lastTime = time;
      
      if (!isPausedRef.current && !gr.isGameOver) {
        // Update physics
        if (gr.modifierSlow > 0) {
          gr.modifierSlow -= delta;
          if (gr.modifierSlow <= 0) setActiveSlow(false);
        } else {
          gr.speed += GAME_CONFIG.SPEED_INCREMENT;
        }

        // Jump physics
        if (gr.isJumping) {
          gr.player.position.y += gr.jumpVelocity;
          gr.jumpVelocity += GAME_CONFIG.GRAVITY;
          if (gr.player.position.y <= 0) {
            gr.player.position.y = 0;
            gr.isJumping = false;
            gr.jumpVelocity = 0;
          }
        } else {
          gr.player.position.y = Math.abs(Math.sin(time * 0.015)) * 0.3; // Bounce when running
        }

        gr.targetX = gr.currentLane * GAME_CONFIG.LANE_WIDTH;
        gr.player.position.x += (gr.targetX - gr.player.position.x) * 0.15;
        
        // Background motion
        const effectiveSpeed = gr.modifierSlow > 0 ? gr.speed * 0.5 : gr.speed;
        gr.grid.position.z += effectiveSpeed;
        if (gr.grid.position.z > 5) gr.grid.position.z %= 5;
        
        gr.buildings.forEach(b => {
          b.position.z += effectiveSpeed;
          if (b.position.z > 50) b.position.z = -550;
        });

        // Player animation (Running)
        const walkCycle = Math.sin(time * 0.012) * 0.7;
        const bounce = Math.abs(Math.sin(time * 0.012)) * 0.25;
        
        // Running motion
        gr.lLeg.rotation.x = walkCycle;
        gr.rLeg.rotation.x = -walkCycle;
        gr.lArm.rotation.x = -walkCycle * 0.9;
        gr.rArm.rotation.x = walkCycle * 0.9;
        
        // Dynamic leaning
        gr.player.rotation.z = THREE.MathUtils.lerp(gr.player.rotation.z, (gr.player.position.x - gr.targetX) * 0.1, 0.1);
        gr.player.rotation.x = 0.15 + bounce * 0.2; // Leaning forward more when bouncing
        
        // Shoulder sway
        gr.player.position.y = (gr.isJumping ? gr.player.position.y : bounce);

        // Distance score
        const distGain = delta * 15;
        gr.distance += distGain; 
        const currentDist = Math.floor(gr.distance);
        if (currentDist !== Math.floor(gr.distance - distGain)) {
           setDistance(currentDist);
           callbacksRef.current.onScoreUpdate(currentDist, gr.processors);
        }

        // Modifiers timers
        if (gr.modifierShield > 0) {
          gr.modifierShield -= delta;
          gr.shieldMesh.visible = true;
          gr.shieldMesh.rotation.y += 0.01;
          if (gr.modifierShield <= 0) {
            setActiveShield(false);
            gr.shieldMesh.visible = false;
          }
        }

        if (gr.modifierMultiplier > 0) {
          gr.modifierMultiplier -= delta;
          if (gr.modifierMultiplier <= 0) setActiveMultiplier(false);
        }

        // Handle invulnerability blink
        if (gr.invulnerable > 0) {
          gr.invulnerable -= delta;
          gr.player.visible = Math.floor(time / 100) % 2 === 0;
        } else {
          gr.player.visible = true;
        }

        // Spawn logic
        const patternChance = Math.random();
        if (patternChance < 0.006) {
          spawnPattern(Math.random() > 0.5 ? 'gate' : 'jump');
        } else {
          if (Math.random() < GAME_CONFIG.OBSTACLE_SPAWN_RATE) spawnEntity('obstacle');
          if (Math.random() < GAME_CONFIG.POINT_SPAWN_RATE) spawnEntity('point');
          if (Math.random() < GAME_CONFIG.POWERUP_SPAWN_RATE) spawnEntity('powerup');
        }

        // Process Obstacles
        for (let i = gr.obstacles.length - 1; i >= 0; i--) {
          const obs = gr.obstacles[i];
          obs.position.z += effectiveSpeed;
          
          // Tightened horizontal check: only check if in roughly the same lane
          const dx = Math.abs(gr.player.position.x - obs.position.x);
          const dz = Math.abs(gr.player.position.z - obs.position.z);
          
          if (gr.invulnerable <= 0 && dx < 2.0 && dz < 2.0) {
            // Collision check
            let hit = true;
            if (obs.userData.isLow && gr.player.position.y > 1.5) {
              hit = false; // Jumped over low obstacle
            } else if (obs.userData.isTall) {
              hit = true; // Cannot jump over tall
            }

            if (hit) {
              if (gr.modifierShield > 0) {
                gr.modifierShield = 0;
                setActiveShield(false);
                gr.shieldMesh.visible = false;
                gr.invulnerable = 2;
              } else {
                callbacksRef.current.onLifeLost(livesRef.current - 1);
                gr.invulnerable = 2; // 2 seconds invulnerability
                if (livesRef.current <= 1) {
                  gr.isGameOver = true;
                  AudioManager.playLifeLost();
                  callbacksRef.current.onGameOver();
                } else {
                  AudioManager.playHurt();
                }
              }
            }
          }

          if (obs.position.z > GAME_CONFIG.DESPAWN_Z) {
            scene.remove(obs);
            gr.obstacles.splice(i, 1);
          }
        }

        // Process Points
        for (let i = gr.points.length - 1; i >= 0; i--) {
          const p = gr.points[i];
          p.position.z += effectiveSpeed;
          // Hovering AND rotating
          p.position.y = 2.2 + Math.sin(time * 0.004 + i) * 0.2;
          p.rotation.y += 0.05;
          
          if (gr.player.position.distanceTo(p.position) < 3.5) {
            const val = (p.userData.value || 50) * (gr.modifierMultiplier > 0 ? 2 : 1);
            gr.processors += val;
            AudioManager.playCollect();
            
            // Sync states immediately
            const currentDist = Math.floor(gr.distance);
            setProcessors(gr.processors);
            callbacksRef.current.onScoreUpdate(currentDist, gr.processors);
            
            scene.remove(p);
            gr.points.splice(i, 1);
          } else if (p.position.z > GAME_CONFIG.DESPAWN_Z) {
            scene.remove(p);
            gr.points.splice(i, 1);
          }
        }

        // Process Powerups
        for (let i = gr.powerups.length - 1; i >= 0; i--) {
          const p = gr.powerups[i];
          p.position.z += effectiveSpeed;
          // Hovering + rotating
          p.position.y = 2.0 + Math.sin(time * 0.005 + i) * 0.3;
          p.rotation.y += 0.04;

          if (gr.player.position.distanceTo(p.position) < 3.0) {
            const pType = p.userData.powerupType;
            if (pType === 'shield') {
              gr.modifierShield = 10;
              setActiveShield(true);
              AudioManager.playPowerup();
            } else if (pType === 'multiplier') {
              gr.modifierMultiplier = 10;
              setActiveMultiplier(true);
              AudioManager.playPowerup();
            } else if (pType === 'slow') {
              gr.modifierSlow = 8;
              setActiveSlow(true);
              AudioManager.playPowerup();
            } else if (pType === 'heart') {
              if (livesRef.current < maxLives) {
                callbacksRef.current.onLifeLost(livesRef.current + 1);
                AudioManager.playCollect();
              }
            }
            scene.remove(p);
            gr.powerups.splice(i, 1);
          } else if (p.position.z > GAME_CONFIG.DESPAWN_Z) {
            scene.remove(p);
            gr.powerups.splice(i, 1);
          }
        }
      }

      gr.renderer.render(scene, camera);
      gr.animationId = requestAnimationFrame(animate);
    };

    if (gameRef.current) {
      gameRef.current.animationId = requestAnimationFrame(animate);
    }

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth || window.innerWidth;
      const h = containerRef.current.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (gameRef.current) cancelAnimationFrame(gameRef.current.animationId);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
      gameRef.current = null;
    };
  }, []); // Run ONLY ONCE

  return (
    <div className="w-full h-full relative bg-slate-950 overflow-hidden font-sans">
      {/* Three.js Canvas Container - Must be empty for React safety */}
      <div ref={containerRef} className="absolute inset-0 z-0" />
      
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)] z-[2]" />
      
      <div className="absolute top-0 left-0 w-full z-10 p-8 flex justify-between items-start pointer-events-none select-none">
        <div className="flex flex-col gap-2">
          <div className="bg-black/40 backdrop-blur-md border-l-4 border-cyan-400 px-6 py-3 rounded-r-xl">
            <p className="text-[10px] uppercase tracking-widest text-cyan-400 font-bold">Distance</p>
            <p className="text-4xl font-black tabular-nums tracking-tighter text-white">
              {distance.toLocaleString()}m
            </p>
          </div>
          <div className="bg-black/40 backdrop-blur-md border-l-4 border-yellow-400 px-6 py-3 rounded-r-xl">
            <p className="text-[10px] uppercase tracking-widest text-yellow-400 font-bold">CPUs Collected</p>
            <p className="text-4xl font-black tabular-nums tracking-tighter text-white">
              {processors.toLocaleString()}
            </p>
          </div>
        </div>

        {isPaused && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
          >
            <h2 className="text-6xl font-black text-white italic uppercase tracking-tighter mb-4">Paused</h2>
            <p className="text-white/40 uppercase tracking-[0.5em] text-xs">Run Interrupted</p>
          </motion.div>
        )}

        <div className="flex flex-col items-end gap-3">
          {/* Pause Button */}
          <button 
            onClick={onTogglePause}
            className="pointer-events-auto bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10 text-white/50 hover:text-white transition-colors hover:bg-white/10 active:scale-95"
          >
            {isPaused ? <Play className="w-6 h-6 fill-white" /> : <Pause className="w-6 h-6 fill-white" />}
          </button>

          {/* Active Modifiers */}
          <div className="flex gap-2">
            {activeShield && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-blue-600/80 backdrop-blur-md px-3 py-1 rounded-lg border border-blue-400 flex items-center gap-2"
              >
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-[10px] text-white font-black uppercase tracking-tighter">Shield Active</span>
              </motion.div>
            )}
            {activeMultiplier && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-purple-600/80 backdrop-blur-md px-3 py-1 rounded-lg border border-purple-400 flex items-center gap-2"
              >
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-[10px] text-white font-black uppercase tracking-tighter">Double XP</span>
              </motion.div>
            )}
            {activeSlow && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-600/80 backdrop-blur-md px-3 py-1 rounded-lg border border-emerald-400 flex items-center gap-2"
              >
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-[10px] text-white font-black uppercase tracking-tighter">Slow Motion</span>
              </motion.div>
            )}
          </div>

          <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-xl border border-white/10 flex items-center gap-6 pointer-events-none">
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-white/50 mb-1">Stability</p>
              <div className="flex gap-2">
                {[...Array(maxLives)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      scale: i < lives ? [1, 1.1, 1] : 1,
                      opacity: i < lives ? 1 : 0.2 
                    }}
                    transition={{ repeat: i < lives ? Infinity : 0, duration: 2 }}
                  >
                    <Heart 
                      className={`w-6 h-6 ${i < lives ? 'text-pink-500 fill-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]' : 'text-slate-700'}`} 
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-orange-500 text-black px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter">
            SPEED: {Math.floor((gameRef.current?.speed || 0) * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
};
