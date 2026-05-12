import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Heart, Pause, Play, ArrowLeft } from 'lucide-react';
import * as THREE from 'three';
import { GAME_CONFIG } from '../constants';
import { Lane } from '../types';
import { AudioManager } from '../services/audioService';

interface GameProps {
  onScoreUpdate: (score: number, processors: number) => void;
  onGameOver: () => void;
  onLifeLost: (lives: number) => void;
  onQuit: () => void;
  onTogglePause: () => void;
  onAchievementUnlock: (id: string, title: string) => void;
  lives: number;
  maxLives: number;
  initialBuffs?: string[];
  activeSkin?: string;
  isPaused: boolean;
}

export const NeonRunner: React.FC<GameProps> = ({ onScoreUpdate, onGameOver, onLifeLost, onQuit, onTogglePause, lives, maxLives, initialBuffs = [], activeSkin = 'cyan', isPaused, onAchievementUnlock }) => {
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
    obstacles: THREE.Object3D[];
    points: THREE.Object3D[];
    powerups: THREE.Object3D[];
    buildings: THREE.Object3D[];
    grid: THREE.GridHelper;
    speed: number;
    distance: number;
    lastBuildingZ: number;
    processors: number;
    obstaclesAvoided: number;
    currentLane: Lane;
    targetX: number;
    invulnerable: number;
    animationId: number;
    lastSpawnZ: number[];
    isJumping: boolean;
    isSliding: boolean;
    jumpVelocity: number;
    slideTimer: number;
    modifierShield: number;
    modifierMultiplier: number;
    modifierSlow: number;
    modifierDestruction: number;
    modifierDistMult: number;
    isGameOver: boolean;
    pedestrians: THREE.Object3D[];
  } | null>(null);

  useEffect(() => {
    isPausedRef.current = isPaused;
    if (isPaused || gameRef.current?.isGameOver) {
      AudioManager.stopMusic();
    } else {
      AudioManager.startMusic();
    }
  }, [isPaused]);

  useEffect(() => {
    return () => {
      AudioManager.stopMusic();
    };
  }, []);

  const gameRef = grRef; // Alias for consistency

  const [activeShield, setActiveShield] = useState(false);
  const [activeMultiplier, setActiveMultiplier] = useState(false);
  const [activeSlow, setActiveSlow] = useState(false);
  const [activeDestruction, setActiveDestruction] = useState(false);
  const [activeDistMult, setActiveDistMult] = useState(false);

  useEffect(() => {
    // Apply purchased buffs immediately if the component just mounted
    if (initialBuffs.includes('shield')) setActiveShield(true);
    if (initialBuffs.includes('multiplier')) setActiveMultiplier(true);
    if (initialBuffs.includes('slow')) setActiveSlow(true);
    if (initialBuffs.includes('dist')) setActiveDistMult(true);
    if (initialBuffs.includes('bomb')) setActiveDestruction(true);
  }, [initialBuffs]);

  // Use refs for callbacks to avoid re-triggering the setup effect
  const callbacksRef = useRef({ onScoreUpdate, onGameOver, onLifeLost, onQuit, onAchievementUnlock });
  useEffect(() => {
    callbacksRef.current = { onScoreUpdate, onGameOver, onLifeLost, onQuit, onAchievementUnlock };
  }, [onScoreUpdate, onGameOver, onLifeLost, onQuit, onAchievementUnlock]);
  
  const achievementTriggeredRef = useRef<Record<string, boolean>>({});

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
      gr.isSliding = false;
      gr.slideTimer = 0;
      gr.jumpVelocity = GAME_CONFIG.JUMP_FORCE;
    } else if (e.key === 'ArrowDown' || e.key === 's') {
      gr.isSliding = true;
      gr.slideTimer = 45;
      if (gr.isJumping) {
        gr.jumpVelocity = -0.4; // Dive down
      }
      AudioManager.playSlide();
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
          gr.isSliding = false;
          gr.slideTimer = 0;
          gr.jumpVelocity = GAME_CONFIG.JUMP_FORCE;
        } else if (dy > 0) {
          // Swipe down
          gr.isSliding = true;
          gr.slideTimer = 45;
          if (gr.isJumping) {
            gr.jumpVelocity = -0.4;
          }
          AudioManager.playSlide();
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
    
    // Skin colors
    const skinColors: Record<string, { main: number, glow: number }> = {
      cyan: { main: 0x0ea5e9, glow: 0x22d3ee },
      pink: { main: 0xec4899, glow: 0xf472b6 },
      emerald: { main: 0x10b981, glow: 0x34d399 },
      amber: { main: 0xf59e0b, glow: 0xfbbf24 },
      purple: { main: 0x8b5cf6, glow: 0xa78bfa }
    };
    
    const colors = skinColors[activeSkin] || skinColors.cyan;

    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: colors.main, 
      emissive: colors.main,
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
      color: colors.glow, 
      emissive: colors.glow, 
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
      const h = 15 + Math.random() * 35;
      const w = 12 + Math.random() * 15;
      const d = 12 + Math.random() * 15;
      
      const colors = [0x0f172a, 0x1e1b4b, 0x0a0a0a];
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      const geometry = new THREE.BoxGeometry(w, h, d);
      const material = new THREE.MeshStandardMaterial({ 
        color, 
        roughness: 0.3, 
        metalness: 0.7 
      });
      const building = new THREE.Mesh(geometry, material);
      const x = left ? -45 - w/2 : 45 + w/2;
      building.position.set(x, h/2, z);
      
      // Add windows (minimalist)
      const winCount = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < winCount; i++) {
        const winH = 0.5 + Math.random() * 1.5;
        const winW = 0.5 + Math.random() * 2;
        const winColor = [0x00ffff, 0xff00ff, 0xffff00][Math.floor(Math.random() * 3)];
        
        const winGeo = new THREE.PlaneGeometry(winW, winH);
        const winMat = new THREE.MeshStandardMaterial({ 
          color: winColor, 
          emissive: winColor, 
          emissiveIntensity: 3.0,
          transparent: true,
          opacity: 0.9
        });
        const window = new THREE.Mesh(winGeo, winMat);
        
        const sideOffset = left ? w/2 + 0.1 : -w/2 - 0.1;
        window.position.set(sideOffset, (Math.random() - 0.5) * (h - 15), (Math.random() - 0.5) * (d - 10));
        window.rotation.y = left ? Math.PI / 2 : -Math.PI / 2;
        building.add(window);
      }

      // Large neon sign (very rare)
      if (Math.random() > 0.5) {
        const signH = 3 + Math.random() * 3;
        const signW = 5 + Math.random() * 5;
        const signColor = [0x00ffff, 0xff00ff][Math.floor(Math.random() * 2)];
        
        const signGeo = new THREE.PlaneGeometry(signW, signH);
        const signMat = new THREE.MeshStandardMaterial({
          color: signColor,
          emissive: signColor,
          emissiveIntensity: 2,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide
        });
        const sign = new THREE.Mesh(signGeo, signMat);
        
        const signX = left ? w/2 + 1.5 : -w/2 - 1.5;
        sign.position.set(signX, h/2 + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
        sign.rotation.y = left ? Math.PI / 2 : -Math.PI / 2;
        building.add(sign);
      }
      
      scene.add(building);
      return building;
    };

    const spawnPedestrian = (z: number) => {
      const side = Math.random() > 0.5 ? 'left' : 'right';
      const x = side === 'left' ? -18 : 18;
      
      const ped = new THREE.Group();
      const scale = 3; 
      
      // Torso
      const torso = new THREE.Mesh(
        new THREE.BoxGeometry(0.5 * scale, 1.0 * scale, 0.3 * scale),
        new THREE.MeshStandardMaterial({ color: 0x334155 })
      );
      torso.position.y = 0.5 * scale;
      ped.add(torso);
      
      // Head
      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.4 * scale, 0.4 * scale, 0.4 * scale),
        new THREE.MeshStandardMaterial({ color: 0x475569 })
      );
      head.position.y = 1.2 * scale;
      ped.add(head);

      // Arms
      const armGeo = new THREE.BoxGeometry(0.15 * scale, 0.8 * scale, 0.15 * scale);
      const lArm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: 0x334155 }));
      lArm.position.set(-0.35 * scale, 0.5 * scale, 0);
      ped.add(lArm);
      
      const rArm = new THREE.Mesh(armGeo, new THREE.MeshStandardMaterial({ color: 0x334155 }));
      rArm.position.set(0.35 * scale, 0.5 * scale, 0);
      ped.add(rArm);

      // Legs
      const legGeo = new THREE.BoxGeometry(0.2 * scale, 1.0 * scale, 0.2 * scale);
      const lLeg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: 0x1e293b }));
      lLeg.position.set(-0.15 * scale, -1.0 * scale, 0);
      ped.add(lLeg);
      
      const rLeg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({ color: 0x1e293b }));
      rLeg.position.set(0.15 * scale, -1.0 * scale, 0);
      ped.add(rLeg);
      
      // Eye visor
      const eye = new THREE.Mesh(
        new THREE.BoxGeometry(0.35 * scale, 0.05 * scale, 0.05 * scale),
        new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 2 })
      );
      eye.position.set(0, 1.2 * scale, side === 'left' ? 0.2 * scale : -0.2 * scale);
      ped.add(eye);
      
      // Position base at ground
      ped.position.set(x + (Math.random() - 0.5) * 3, 3, z);
      ped.userData = { walkSpeed: (Math.random() * 0.05 + 0.02) * (Math.random() > 0.5 ? 1 : -1) };
      
      scene.add(ped);
      gameRef.current?.pedestrians.push(ped);
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
      lastBuildingZ: 0,
      processors: 0,
      obstaclesAvoided: 0,
      currentLane: 0 as Lane,
      targetX: 0,
      invulnerable: 0,
      animationId: 0,
      lastSpawnZ: [0, 0, 0, 0, 0], // For 5 lanes
      isJumping: false,
      isSliding: false,
      jumpVelocity: 0,
      slideTimer: 0,
      modifierShield: 0,
      modifierMultiplier: 0,
      modifierSlow: 0,
      modifierDestruction: 0,
      modifierDistMult: 0,
      isGameOver: false,
      pedestrians: [],
    };

    // Apply pre-game buffs to internal state
    if (initialBuffs.includes('shield')) gameRef.current.modifierShield = GAME_CONFIG.MODIFIER_DURATION;
    if (initialBuffs.includes('multiplier')) gameRef.current.modifierMultiplier = GAME_CONFIG.MODIFIER_DURATION;
    if (initialBuffs.includes('slow')) gameRef.current.modifierSlow = GAME_CONFIG.MODIFIER_DURATION;
    if (initialBuffs.includes('dist')) gameRef.current.modifierDistMult = GAME_CONFIG.MODIFIER_DURATION;
    if (initialBuffs.includes('bomb')) gameRef.current.modifierDestruction = GAME_CONFIG.MODIFIER_DURATION;

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

    const createBombMeshPowerup = (color: number) => {
      const group = new THREE.Group();
      // Spherical core - now using the powerup color (orange)
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 16, 16),
        new THREE.MeshStandardMaterial({ 
          color, 
          emissive: color, 
          emissiveIntensity: 1.5,
          metalness: 0.8 
        })
      );
      group.add(core);
      
      // Burning wick
      const wick = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 0.4),
        new THREE.MeshStandardMaterial({ color: 0xedbb7d })
      );
      wick.position.y = 0.8;
      group.add(wick);

      const fire = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff4400, emissiveIntensity: 5 })
      );
      fire.position.y = 1.0;
      group.add(fire);

      return group;
    };

    const createDistMeshPowerup = (color: number) => {
      const group = new THREE.Group();
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.7, 0.15, 16, 100),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 2 })
      );
      group.add(ring);
      const center = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.6, 0.2),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1 })
      );
      group.add(center);
      return group;
    };

    const triggerDestructionEffect = (pos: THREE.Vector3, color: number) => {
      const particleCount = 12;
      const particles: THREE.Mesh[] = [];
      const particleGroup = new THREE.Group();
      particleGroup.position.copy(pos);
      scene.add(particleGroup);

      const partGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const partMat = new THREE.MeshStandardMaterial({ 
        color, 
        emissive: color, 
        emissiveIntensity: 2,
        transparent: true 
      });

      for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(partGeo, partMat.clone());
        particle.userData = {
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            (Math.random()) * 0.5,
            (Math.random() - 0.5) * 0.5
          ),
          rotation: new THREE.Vector3(
            Math.random() * 0.2,
            Math.random() * 0.2,
            Math.random() * 0.2
          )
        };
        particleGroup.add(particle);
        particles.push(particle);
      }

      let frames = 0;
      const animateParticles = () => {
        if (frames > 60) {
          scene.remove(particleGroup);
          return;
        }
        frames++;
        particles.forEach(p => {
          p.position.add(p.userData.velocity);
          p.rotation.x += p.userData.rotation.x;
          p.rotation.y += p.userData.rotation.y;
          p.userData.velocity.y -= 0.01; // Gravity
          (p.material as THREE.MeshStandardMaterial).opacity = 1 - (frames / 60);
        });
        requestAnimationFrame(animateParticles);
      };
      animateParticles();
    };

    const disposeObject = (obj: THREE.Object3D) => {
      obj.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          if (node.geometry) node.geometry.dispose();
          if (node.material) {
            if (Array.isArray(node.material)) {
              node.material.forEach((mat) => mat.dispose());
            } else {
              node.material.dispose();
            }
          }
        }
      });
      scene.remove(obj);
    };

    const spawnPattern = (type: 'gate' | 'jump') => {
      if (!gameRef.current) return;
      const gr = gameRef.current;
      const currentZ = gr.distance;
      
      // Pattern needs significantly more space than single entities to ensure passability
      // and prevent visual overlap.
      const minDistance = 65; 
      if (gr.lastSpawnZ.some(z => currentZ - z < minDistance)) return;

      if (type === 'gate') {
        const freeLaneIndex = Math.floor(Math.random() * 5);
        for (let i = 0; i < 5; i++) {
          const lane = (i - 2) as Lane;
          gr.lastSpawnZ[i] = currentZ;

          if (i === freeLaneIndex) {
            // Spawn a processor in the free lane
            const val = 150;
            const cpu = createProcessorMesh(2, 0xfacc15, val);
            cpu.rotation.x = -Math.PI / 2.5;
            cpu.position.set(lane * GAME_CONFIG.LANE_WIDTH, 2.5, GAME_CONFIG.SPAWN_Z);
            cpu.userData = { type: 'point', value: val };
            gr.scene.add(cpu);
            gr.points.push(cpu);
            continue;
          }
          
          const geometry = new THREE.BoxGeometry(2.8, 16, 2.5); // Taller and slightly wider for "gate"
          const color = GAME_CONFIG.COLORS.OBSTACLE;
          const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ 
            color, 
            emissive: color, 
            emissiveIntensity: 1.2,
            roughness: 0.1,
            metalness: 0.5
          }));
          mesh.userData = { type: 'obstacle', isTall: true };
          mesh.position.set(lane * GAME_CONFIG.LANE_WIDTH, 8, GAME_CONFIG.SPAWN_Z);
          gr.scene.add(mesh);
          gr.obstacles.push(mesh);
        }
      } else if (type === 'jump') {
        for (let i = 0; i < 5; i++) {
          const lane = (i - 2) as Lane;
          gr.lastSpawnZ[i] = currentZ;
          
          const geometry = new THREE.BoxGeometry(3.2, 1.8, 2.0); // Wider for full row jump
          const color = GAME_CONFIG.COLORS.OBSTACLE;
          const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ 
            color, 
            emissive: color, 
            emissiveIntensity: 1.5,
            roughness: 0.2
          }));
          mesh.userData = { type: 'obstacle', isLow: true };
          mesh.position.set(lane * GAME_CONFIG.LANE_WIDTH, 0.9, GAME_CONFIG.SPAWN_Z);
          
          // Row of collection chips above the jump
          if (i % 2 === 0) {
            const val = 100;
            const cpu = createProcessorMesh(1.5, 0xfacc15, val);
            cpu.rotation.x = -Math.PI / 2.5;
            cpu.position.set(lane * GAME_CONFIG.LANE_WIDTH, 2.8, GAME_CONFIG.SPAWN_Z);
            cpu.userData = { type: 'point', value: val };
            gr.scene.add(cpu);
            gr.points.push(cpu);
          }

          gr.scene.add(mesh);
          gr.obstacles.push(mesh);
        }
      }
    };

    const createUnderpassMesh = () => {
      const group = new THREE.Group();
      
      // Top bar (the one that hits if not sliding)
      // Lowered from 8 to 5.5 to make it look impassable without sliding
      const topGeo = new THREE.BoxGeometry(GAME_CONFIG.LANE_WIDTH * 0.95, 4, 1.5);
      const topMat = new THREE.MeshStandardMaterial({ 
        color: 0xff0000, 
        emissive: 0xff0000, 
        emissiveIntensity: 2.0 
      });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.y = 5.5; 
      group.add(top);

      // Side pillars - moved closer to stay within the lane
      const pillarGeo = new THREE.BoxGeometry(0.6, 8, 0.6);
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
      
      const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
      leftPillar.position.set(-GAME_CONFIG.LANE_WIDTH * 0.45, 4, 0);
      group.add(leftPillar);
      
      const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
      rightPillar.position.set(GAME_CONFIG.LANE_WIDTH * 0.45, 4, 0);
      group.add(rightPillar);

      // Glow effect under the bar
      const glowGeo = new THREE.PlaneGeometry(GAME_CONFIG.LANE_WIDTH * 0.9, 0.2);
      const glowMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.y = 3.6;
      glow.rotation.x = Math.PI / 2;
      group.add(glow);

      group.userData = { type: 'obstacle', isUnderpass: true };
      return group;
    };

    const spawnEntity = (type: 'obstacle' | 'point' | 'powerup') => {
      if (!gameRef.current) return;
      const gr = gameRef.current;
      const laneIndex = Math.floor(Math.random() * 5);
      const lane = (laneIndex - 2) as Lane;
      
      // Check for overlap in this lane locally (simple Z buffer check)
      const currentZ = gr.distance;
      if (currentZ - gr.lastSpawnZ[laneIndex] < 25) return;
      gr.lastSpawnZ[laneIndex] = currentZ;

      let mesh: THREE.Object3D;
      let userData: any = { type };

      if (type === 'obstacle') {
        const rand = Math.random();
        if (rand < 0.25) {
          mesh = createUnderpassMesh();
          userData = { ...userData, ...mesh.userData };
        } else {
          const isTall = rand > 0.85;
        const isLow = !isTall && rand > 0.4;
        const isMed = !isTall && !isLow && rand > 0.2;
        const isWide = !isTall && !isLow && !isMed && rand > 0.1; // New: blocks 2 lanes
        const isMoving = !isTall && !isLow && !isMed && !isWide; // New: moves sideways

        let geometry: THREE.BufferGeometry;
        let h = 4;
        
        if (isTall) {
          geometry = new THREE.BoxGeometry(2.5, 12, 2.5);
          userData.isTall = true;
          h = 12;
        } else if (isLow) {
          geometry = new THREE.BoxGeometry(2.5, 1.5, 2.5);
          userData.isLow = true;
          h = 1.5;
        } else if (isWide) {
          // Block exactly 3 lanes (center lane + 1 left + 1 right)
          geometry = new THREE.BoxGeometry(GAME_CONFIG.LANE_WIDTH * 2.8, 6, 3.5);
          userData.isWide = true;
          h = 6;
          // Mark adjacent lanes as spawned too
          if (laneIndex > 0) gr.lastSpawnZ[laneIndex - 1] = currentZ;
          if (laneIndex < 4) gr.lastSpawnZ[laneIndex + 1] = currentZ;
        } else if (isMoving) {
          geometry = new THREE.BoxGeometry(2.5, 4, 2.5);
          userData.isMoving = true;
          userData.moveDir = laneIndex > 2 ? -1 : 1;
          userData.startX = lane * GAME_CONFIG.LANE_WIDTH;
          h = 4;
        } else {
          geometry = new THREE.BoxGeometry(2.5, 4, 3.5);
          userData.isMed = true;
          h = 4;
        }
        
        const color = isMoving ? 0xff3333 : (isWide ? 0xffcc33 : GAME_CONFIG.COLORS.OBSTACLE);
        mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ 
          color, 
          emissive: color, 
          emissiveIntensity: isMoving ? 2 : 1,
          roughness: 0.2
        }));
        mesh.position.y = h / 2;

        // Visual for moving obstacle
        if (isMoving) {
          const scanner = new THREE.Mesh(
            new THREE.BoxGeometry(2.6, 0.2, 2.6),
            new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 5 })
          );
          scanner.position.y = 0.5;
          mesh.add(scanner);
        }

        // Spawn CPU above jumpable obstacles
        if (isLow || isMed || isMoving) {
          const spawnChance = isMed ? 0.8 : 0.4;
          if (Math.random() < spawnChance) {
            const val = 100;
            const size = isMed ? 1.8 : 1.2;
            const cpu = createProcessorMesh(size, 0xfacc15, val);
            cpu.rotation.x = -Math.PI / 2.5;
            // Higher for medium
            const cpuY = isMed ? h + 2.0 : h + 1.5;
            cpu.position.set(lane * GAME_CONFIG.LANE_WIDTH, cpuY, GAME_CONFIG.SPAWN_Z);
            cpu.userData = { type: 'point', value: val };
            gr.scene.add(cpu);
            gr.points.push(cpu);
          }
        }
      }
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
        const types = ['shield', 'multiplier', 'slow', 'heart', 'dist', 'bomb'];
        const existingTypes = gr.powerups.map(p => p.userData.powerupType);
        
        // Rarity check for bomb (destruction bonus)
        let availableTypes = types.filter(t => !existingTypes.includes(t));
        
        // If bomb is chosen, it has a 1/5 chance of actually spawning if selected randomly
        // Better: weighted selection
        const weights: Record<string, number> = {
          'shield': 10,
          'multiplier': 10,
          'slow': 10,
          'heart': 10,
          'dist': 10,
          'bomb': 10 // 5 times rarer than others
        };

        const totalWeight = availableTypes.reduce((acc, t) => acc + weights[t], 0);
        let randWeight = Math.random() * totalWeight;
        let pTypeStr = availableTypes[0];

        for (const type of availableTypes) {
          if (randWeight < weights[type]) {
            pTypeStr = type;
            break;
          }
          randWeight -= weights[type];
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
        } else if (pTypeStr === 'dist') {
          color = GAME_CONFIG.COLORS.DISTANCE_X2;
          powerupMesh = createDistMeshPowerup(color);
          userData.powerupType = 'dist';
        } else if (pTypeStr === 'bomb') {
          color = GAME_CONFIG.COLORS.DESTRUCTION;
          powerupMesh = createBombMeshPowerup(color);
          userData.powerupType = 'bomb';
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
      
      if (type === 'obstacle') gr.obstacles.push(mesh);
      else if (type === 'point') gr.points.push(mesh);
      else gr.powerups.push(mesh);
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
          gr.speed = Math.min(gr.speed + GAME_CONFIG.SPEED_INCREMENT * delta * 60, GAME_CONFIG.MAX_SPEED);
        }

        // Jump physics
        if (gr.isJumping) {
          const jumpTimeScale = gr.modifierSlow > 0 ? 0.5 : 1.0;
          const jumpStep = delta * 60 * jumpTimeScale;
          
          gr.player.position.y += gr.jumpVelocity * jumpStep;
          gr.jumpVelocity += GAME_CONFIG.GRAVITY * jumpStep;
          
          if (gr.player.position.y <= 0) {
            gr.player.position.y = 0;
            gr.isJumping = false;
            gr.jumpVelocity = 0;
          }
        }

        // Slide physics
        if (gr.isSliding) {
           gr.slideTimer -= delta * 60;
           if (gr.slideTimer <= 0) gr.isSliding = false;
        }

        gr.targetX = gr.currentLane * GAME_CONFIG.LANE_WIDTH;
        const lerpFactor = 1 - Math.pow(1 - 0.15, delta * 60);
        gr.player.position.x += (gr.targetX - gr.player.position.x) * lerpFactor;
        
        // Background motion
        const effectiveSpeed = (gr.modifierSlow > 0 ? gr.speed * 0.5 : gr.speed) * delta * 60;
        gr.grid.position.z += effectiveSpeed;
        if (gr.grid.position.z > 5) gr.grid.position.z %= 5;
        
        gr.buildings.forEach(b => {
          b.position.z += effectiveSpeed;
        });

        // Pedestrians update
        for (let i = gr.pedestrians.length - 1; i >= 0; i--) {
          const p = gr.pedestrians[i];
          p.position.z += effectiveSpeed + (p.userData.walkSpeed || 0);
          
          // Walking animation (bobbing)
          p.position.y = Math.abs(Math.sin(time * 0.005 + i)) * 0.2;

          if (p.position.z > 50) {
            disposeObject(p);
            gr.pedestrians.splice(i, 1);
          }
        }

        // Cleanup far buildings
        for (let i = gr.buildings.length - 1; i >= 0; i--) {
          if (gr.buildings[i].position.z > 50) {
            disposeObject(gr.buildings[i]);
            gr.buildings.splice(i, 1);
          }
        }

        if (gr.distance - gr.lastBuildingZ > 60 && gr.buildings.length < 12) {
          const b1 = createBuilding(GAME_CONFIG.SPAWN_Z, true);
          const b2 = createBuilding(GAME_CONFIG.SPAWN_Z, false);
          gr.buildings.push(b1, b2);
          
          // Spawn pedestrians occasionally (strict limit)
          if (Math.random() > 0.7 && gr.pedestrians.length < 6) {
            spawnPedestrian(GAME_CONFIG.SPAWN_Z);
          }
          
          gr.lastBuildingZ = gr.distance;
        }

        // Player animation (Running/Sliding)
        const animTime = time * 0.012;
        let walkCycle = Math.sin(animTime) * 0.7;
        let bounce = Math.abs(Math.sin(animTime)) * 0.25;
        
        if (gr.isSliding) {
          // Sliding pose
          gr.lLeg.rotation.x = -Math.PI / 2;
          gr.rLeg.rotation.x = -Math.PI / 2;
          gr.lArm.rotation.x = Math.PI / 2;
          gr.rArm.rotation.x = Math.PI / 2;
          gr.player.rotation.x = 0.6; // Deep lean
          gr.player.scale.y = 0.5; // Squash the whole model slightly for clearance
          gr.player.position.y = (gr.isJumping ? gr.player.position.y : 0.2);
        } else {
          gr.player.scale.y = 1.0;
          // Running motion
          gr.lLeg.rotation.x = walkCycle;
          gr.rLeg.rotation.x = -walkCycle;
          gr.lArm.rotation.x = -walkCycle * 0.9;
          gr.rArm.rotation.x = walkCycle * 0.9;
          
          gr.player.rotation.x = 0.15 + bounce * 0.2; 
          gr.player.position.y = (gr.isJumping ? gr.player.position.y : bounce);
        }
        
        // Dynamic leaning
        const leanLerp = 1 - Math.pow(1 - 0.1, delta * 60);
        gr.player.rotation.z = THREE.MathUtils.lerp(gr.player.rotation.z, (gr.player.position.x - gr.targetX) * 0.1, leanLerp);

        // Distance score
        let distGain = effectiveSpeed;
        if (gr.modifierDistMult > 0) distGain *= 2;
        gr.distance += distGain; 
        const currentDist = Math.floor(gr.distance);
        
        // Real-time achievement check
        const achievements = [
          { id: 'steps', title: 'First Steps', value: gr.distance, target: 100 },
          { id: 'sprint', title: 'Sprint', value: gr.distance, target: 1000 },
          { id: 'marathon', title: 'Marathon', value: gr.distance, target: 5000 },
          { id: 'godspeed', title: 'Godspeed', value: gr.distance, target: 10000 },
          { id: 'collector_1', title: 'Silicon Collector', value: gr.processors, target: 1000 },
          { id: 'collector_2', title: 'System Admin', value: gr.processors, target: 5000 },
          { id: 'collector_3', title: 'Mainframe Master', value: gr.processors, target: 20000 },
          { id: 'collector_4', title: 'The Architect', value: gr.processors, target: 100000 },
          { id: 'jumper_1', title: 'Bypasser', value: gr.obstaclesAvoided, target: 25 },
          { id: 'jumper_2', title: 'Glitch Runner', value: gr.obstaclesAvoided, target: 100 },
          { id: 'jumper_3', title: 'Firewall Breach', value: gr.obstaclesAvoided, target: 500 },
          { id: 'jumper_4', title: 'Ghost in Shell', value: gr.obstaclesAvoided, target: 1000 },
        ];

        achievements.forEach(ach => {
          if (ach.value >= ach.target && !achievementTriggeredRef.current[ach.id]) {
            achievementTriggeredRef.current[ach.id] = true;
            callbacksRef.current.onAchievementUnlock(ach.id, ach.title);
          }
        });

        // Cap distance set so we don't spam state with tiny floats
        // Throttle UI update to every 10 meters OR if a significant chunk has passed
        if (currentDist !== Math.floor(gr.distance - distGain) && currentDist % 10 === 0) {
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

        if (gr.modifierDistMult > 0) {
          gr.modifierDistMult -= delta;
          if (gr.modifierDistMult <= 0) setActiveDistMult(false);
        }

        if (gr.modifierDestruction > 0) {
          gr.modifierDestruction -= delta;
          if (gr.modifierDestruction <= 0) setActiveDestruction(false);
        }

        // Handle invulnerability blink
        if (gr.invulnerable > 0) {
          gr.invulnerable -= delta;
          gr.player.visible = Math.floor(time / 100) % 2 === 0;
        } else {
          gr.player.visible = true;
        }

        // Spawn logic
        const timeScale = delta * 60;
        const patternChance = Math.random();
        // Even higher frequency for patterns (0.02 base)
        if (patternChance < 0.02 * timeScale) {
          spawnPattern(Math.random() > 0.5 ? 'gate' : 'jump');
        } else {
          if (Math.random() < GAME_CONFIG.OBSTACLE_SPAWN_RATE * timeScale) spawnEntity('obstacle');
          if (Math.random() < GAME_CONFIG.POINT_SPAWN_RATE * timeScale) spawnEntity('point');
          if (Math.random() < GAME_CONFIG.POWERUP_SPAWN_RATE * timeScale) spawnEntity('powerup');
        }

        // Process Obstacles
        for (let i = gr.obstacles.length - 1; i >= 0; i--) {
          const obs = gr.obstacles[i];
          obs.position.z += effectiveSpeed;
          
          // Lateral movement for patrolling obstacles
          if (obs.userData.isMoving) {
            const patrolRange = GAME_CONFIG.LANE_WIDTH;
            const patrolSpeed = effectiveSpeed * 0.4;
            obs.position.x += obs.userData.moveDir * patrolSpeed;
            
            // Boundary bounce
            const offset = obs.position.x - obs.userData.startX;
            if (Math.abs(offset) > patrolRange) {
              obs.userData.moveDir *= -1;
               obs.position.x = obs.userData.startX + patrolRange * Math.sign(offset);
            }
          }

          // Tightened horizontal check: only check if in roughly the same lane
          const dx = Math.abs(gr.player.position.x - obs.position.x);
          const dz = Math.abs(gr.player.position.z - obs.position.z);
          
          // Wide obstacles block center + 1 lane on each side (~10-12 units wide)
          const hitWidth = obs.userData.isWide ? (GAME_CONFIG.LANE_WIDTH * 1.4) : 2.0;

          if (gr.invulnerable <= 0 && dx < hitWidth && dz < 2.0) {
            // Collision check
            let hit = true;
            if (obs.userData.isUnderpass) {
              // Underpass requires sliding
              hit = !gr.isSliding;
            } else if (obs.userData.isLow && gr.player.position.y > 1.8) {
              hit = false; // Jumped over low obstacle
            } else if (obs.userData.isMed && gr.player.position.y > 3.8) {
              hit = false; // Jumped over medium obstacle
            } else if (obs.userData.isMoving && gr.player.position.y > 3.8) {
              hit = false; // Can jump over moving bot if high enough
            } else if (obs.userData.isTall) {
              hit = true; // Cannot jump over tall
            } else if (obs.userData.isWide) {
              hit = true; // Cannot jump over wide barrier (too wide for safety)
            }

            if (hit) {
              if (gr.modifierDestruction > 0) {
                // Destroy obstacle
                triggerDestructionEffect(obs.position, GAME_CONFIG.COLORS.DESTRUCTION);
                disposeObject(obs);
                gr.obstacles.splice(i, 1);
                gr.obstaclesAvoided++;
                AudioManager.playCollect(); // Replace with explosion sound if available, but collect is fine for now
                continue;
              }

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
                  AudioManager.stopMusic();
                  // Ensure final score is accurate before game over
                  const finalDist = Math.floor(gr.distance);
                  setDistance(finalDist);
                  callbacksRef.current.onScoreUpdate(finalDist, gr.processors);
                  callbacksRef.current.onGameOver();
                } else {
                  AudioManager.playHurt();
                }
              }
            }
          }

          if (obs.position.z > GAME_CONFIG.DESPAWN_Z) {
            gr.obstaclesAvoided++;
            disposeObject(obs);
            gr.obstacles.splice(i, 1);
          }
        }

        // Process Points
        for (let i = gr.points.length - 1; i >= 0; i--) {
          const p = gr.points[i];
          p.position.z += effectiveSpeed;
          // Hovering AND rotating
          p.position.y = 2.2 + Math.sin(time * 0.004 + i) * 0.2;
          p.rotation.y += 0.05 * delta * 60;
          
          if (gr.player.position.distanceTo(p.position) < 3.5) {
            const val = (p.userData.value || 50) * (gr.modifierMultiplier > 0 ? 2 : 1);
            gr.processors += val;
            AudioManager.playCollect();
            
            // Sync states immediately
            const currentDist = Math.floor(gr.distance);
            setProcessors(gr.processors);
            callbacksRef.current.onScoreUpdate(currentDist, gr.processors);
            
            disposeObject(p);
            gr.points.splice(i, 1);
          } else if (p.position.z > GAME_CONFIG.DESPAWN_Z) {
            disposeObject(p);
            gr.points.splice(i, 1);
          }
        }

        // Process Powerups
        for (let i = gr.powerups.length - 1; i >= 0; i--) {
          const p = gr.powerups[i];
          p.position.z += effectiveSpeed;
          // Hovering + rotating
          p.position.y = 2.0 + Math.sin(time * 0.005 + i) * 0.3;
          p.rotation.y += 0.04 * delta * 60;

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
            } else if (pType === 'dist') {
              gr.modifierDistMult = 10;
              setActiveDistMult(true);
              AudioManager.playPowerup();
            } else if (pType === 'bomb') {
              gr.modifierDestruction = 10;
              setActiveDestruction(true);
              AudioManager.playPowerup();
            } else if (pType === 'heart') {
              if (livesRef.current < maxLives) {
                callbacksRef.current.onLifeLost(livesRef.current + 1);
                AudioManager.playCollect();
              }
            }
            disposeObject(p);
            gr.powerups.splice(i, 1);
          } else if (p.position.z > GAME_CONFIG.DESPAWN_Z) {
            disposeObject(p);
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
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 z-0" />
      
      <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.8)] z-[2]" />
      
      {/* GAME UI OVERLAY */}
      <div className="absolute inset-0 z-10 pointer-events-none select-none">
        
        {/* TOP LEFT: STATS */}
        <div className="absolute top-4 left-4 md:top-8 md:left-8 flex flex-col gap-2">
          <div className="bg-black/60 backdrop-blur-md border-l-4 border-cyan-400 px-3 md:px-6 py-1.5 md:py-3 rounded-r-xl">
            <p className="text-[7px] md:text-[10px] uppercase tracking-widest text-cyan-400 font-black">Distance</p>
            <p className="text-xl md:text-3xl font-black tabular-nums tracking-tighter text-white">
              {distance.toLocaleString()}m
            </p>
          </div>
          <div className="bg-black/60 backdrop-blur-md border-l-4 border-yellow-400 px-3 md:px-6 py-1.5 md:py-3 rounded-r-xl">
            <p className="text-[7px] md:text-[10px] uppercase tracking-widest text-yellow-400 font-black">Memory Chips</p>
            <p className="text-xl md:text-3xl font-black tabular-nums tracking-tighter text-white">
              {processors.toLocaleString()}
            </p>
          </div>
        </div>

        {/* TOP RIGHT: HEALTH & CONTROLS */}
        <div className="absolute top-4 right-4 md:top-8 md:right-8 flex flex-col items-end gap-3 pointer-events-auto">
          {/* Game Controls */}
          <div className="flex gap-2">
            <button 
              onClick={onTogglePause}
              className="bg-black/60 backdrop-blur-md p-2 md:p-3 rounded-xl border border-white/10 text-white/50 hover:text-white transition-all active:scale-95 pointer-events-auto"
            >
              {isPaused ? <Play className="w-4 h-4 md:w-6 md:h-6 fill-white" /> : <Pause className="w-4 h-4 md:w-6 md:h-6 fill-white" />}
            </button>
            <button 
              onClick={onQuit}
              className="bg-red-500/20 backdrop-blur-md p-2 md:p-3 rounded-xl border border-red-500/30 text-red-500/50 hover:text-red-500 hover:bg-red-500/30 transition-all active:scale-95 pointer-events-auto"
              title="Exit Game"
            >
              <ArrowLeft className="w-4 h-4 md:w-6 md:h-6" />
            </button>
          </div>

          {/* Stability (Lives) */}
          <div className="bg-black/60 backdrop-blur-md px-3 md:px-5 py-1.5 md:py-2.5 rounded-xl border border-white/10 flex flex-col items-end">
            <p className="text-[7px] md:text-[10px] uppercase tracking-widest text-white/50 mb-1 font-bold">Stability</p>
            <div className="flex gap-1 md:gap-1.5">
              {[...Array(maxLives)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    scale: i < lives ? 1 : 0.8,
                    opacity: i < lives ? 1 : 0.2 
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <Heart 
                    className={`w-3.5 h-3.5 md:w-5 md:h-5 ${i < lives ? 'text-pink-500 fill-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]' : 'text-slate-700'}`} 
                  />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Active Modifiers */}
          <div className="flex flex-col gap-1.5 md:gap-2 items-end">
            {activeShield && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-blue-600/60 backdrop-blur-md px-2 py-0.5 md:py-1 rounded border border-blue-400/30 flex items-center gap-1.5"
              >
                <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-[7px] md:text-[9px] text-white font-black uppercase tracking-tighter">Shield</span>
              </motion.div>
            )}
            {activeMultiplier && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-purple-600/60 backdrop-blur-md px-2 py-0.5 md:py-1 rounded border border-purple-400/30 flex items-center gap-1.5"
              >
                <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-[7px] md:text-[9px] text-white font-black uppercase tracking-tighter">2x CPUs</span>
              </motion.div>
            )}
            {activeSlow && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-emerald-600/60 backdrop-blur-md px-2 py-0.5 md:py-1 rounded border border-emerald-400/30 flex items-center gap-1.5"
              >
                <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-[7px] md:text-[9px] text-white font-black uppercase tracking-tighter">Snail</span>
              </motion.div>
            )}
            {activeDistMult && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-cyan-600/60 backdrop-blur-md px-2 py-0.5 md:py-1 rounded border border-cyan-400/30 flex items-center gap-1.5"
              >
                <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-[7px] md:text-[9px] text-white font-black uppercase tracking-tighter">x2 Dist</span>
              </motion.div>
            )}
            {activeDestruction && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-orange-600/60 backdrop-blur-md px-2 py-0.5 md:py-1 rounded border border-orange-400/30 flex items-center gap-1.5"
              >
                <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-white animate-pulse" />
                <span className="text-[7px] md:text-[9px] text-white font-black uppercase tracking-tighter">Destroyer</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* PAUSE OVERLAY */}
      {isPaused && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900/90 border border-white/10 p-6 md:p-10 rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-xs w-full text-center pointer-events-auto"
          >
            <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-cyan-400/30">
              <Pause className="text-cyan-400 w-8 h-8 fill-cyan-400" />
            </div>
            
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-8">
              System <span className="text-cyan-400">Paused</span>
            </h2>

            <div className="flex flex-col gap-3">
              <button 
                onClick={onTogglePause}
                className="group relative w-full py-4 bg-cyan-400 text-black font-black rounded-xl overflow-hidden hover:scale-105 active:scale-95 transition-all shadow-lg shadow-cyan-400/20 flex items-center justify-center gap-3"
              >
                <Play className="w-5 h-5 fill-black" />
                <span className="tracking-widest uppercase text-sm">Resume Run</span>
              </button>

              <button 
                onClick={onQuit}
                className="w-full py-4 border border-white/10 text-white/50 hover:bg-white/5 hover:text-white rounded-xl transition-all font-black uppercase text-[10px] tracking-widest"
              >
                Exit to Menu
              </button>
            </div>

            <p className="mt-8 text-[8px] text-white/20 font-mono leading-tight tracking-[0.2em] uppercase">
              Memory chips saved successfully.<br/>
              Session data integrity verified.
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
};
