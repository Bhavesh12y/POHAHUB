import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import { BALL_RADIUS, stepHelix } from './helixLogic.js';

// Game pixels -> world units.
const S = 1 / 50;
const R_IN = 50 * S;
const R_OUT = 115 * S;
const THICKNESS = 18 * S;
const BALL_RING = (R_IN + R_OUT) / 2;
const BALL_R = BALL_RADIUS * S;
const SHATTER_SECONDS = 0.7;
const MAX_SPLATS = 14;

const COLORS = {
  safe: '#a9def9',
  danger: '#ef476f',
  pole: '#f3f4f6',
  stripe: '#111111',
  ball: '#ffd166',
  ballHot: '#ef476f',
};

// Three-step toon ramp gives the flat, hand-coloured look of the 2D site.
function useToonRamp() {
  return useMemo(() => {
    const data = new Uint8Array([165, 165, 165, 255, 220, 220, 220, 255, 255, 255, 255, 255]);
    const texture = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
    return texture;
  }, []);
}

function sectorShape(start, end) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, R_OUT, start, end, false);
  shape.absarc(0, 0, R_IN, end, start, true);
  shape.closePath();
  return shape;
}

const EXTRUDE = { depth: THICKNESS, bevelEnabled: false, curveSegments: 28 };

const Segment = memo(function Segment({ segment, ramp }) {
  const shape = useMemo(() => sectorShape(segment.start, segment.end), [segment.start, segment.end]);
  return (
    // Rotate the XY-plane shape so it lies flat; extrusion then points downward.
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <extrudeGeometry args={[shape, EXTRUDE]} />
      <meshToonMaterial color={COLORS[segment.type]} gradientMap={ramp} transparent />
      {/* Ink lines only on sharp edges (rims and cut faces), not on the curved sides. */}
      <Edges threshold={20} color="#111111" lineWidth={2} />
    </mesh>
  );
});

function Platform({ platform, ramp, gameRef }) {
  const group = useRef();
  const pieces = useRef([]);

  // Shatter animation: segments fly outwards, tumble and fade.
  useFrame(() => {
    if (!platform.broken || !group.current) return;
    const t = gameRef.current.time - platform.brokenAt;
    const k = Math.min(t / SHATTER_SECONDS, 1);
    pieces.current.forEach((piece, i) => {
      if (!piece) return;
      const seg = platform.segments[i];
      const mid = (seg.start + seg.end) / 2;
      const push = k * 3.2;
      piece.position.set(Math.cos(mid) * push, -k * k * 3, Math.sin(mid) * push);
      piece.rotation.set(k * 2.2, 0, k * 1.4 * (i % 2 ? 1 : -1));
      piece.traverse((child) => {
        if (child.material) child.material.opacity = 1 - k;
      });
    });
    group.current.visible = k < 1;
  });

  return (
    <group ref={group} position={[0, -platform.y * S, 0]}>
      {platform.segments.map((segment, i) => (
        <group key={`${segment.start}-${i}`} ref={(el) => (pieces.current[i] = el)}>
          <Segment segment={segment} ramp={ramp} />
        </group>
      ))}
    </group>
  );
}

function Splat({ splat }) {
  return (
    <mesh
      position={[Math.cos(splat.angle) * BALL_RING, -splat.y * S + 0.004, Math.sin(splat.angle) * BALL_RING]}
      rotation={[-Math.PI / 2, 0, splat.spin]}
    >
      <circleGeometry args={[splat.size, 9]} />
      <meshBasicMaterial color={splat.color} />
    </mesh>
  );
}

function Pole({ ramp, gameRef }) {
  const group = useRef();
  useFrame(() => {
    if (group.current) group.current.position.y = -gameRef.current.cameraY * S - 4;
  });
  const stripes = useMemo(() => Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2), []);
  return (
    <group ref={group}>
      <mesh>
        <cylinderGeometry args={[R_IN * 0.96, R_IN * 0.96, 30, 32]} />
        <meshToonMaterial color={COLORS.pole} gradientMap={ramp} />
      </mesh>
      {/* Inverted hull: a slightly larger back-face shell reads as a black outline. */}
      <mesh>
        <cylinderGeometry args={[R_IN * 0.96 + 0.035, R_IN * 0.96 + 0.035, 30, 32, 1, true]} />
        <meshBasicMaterial color="#111111" side={THREE.BackSide} />
      </mesh>
      {stripes.map((angle) => (
        <mesh key={angle} position={[Math.cos(angle) * R_IN * 0.965, 0, Math.sin(angle) * R_IN * 0.965]} rotation={[0, -angle, 0]}>
          <boxGeometry args={[0.012, 30, 0.06]} />
          <meshBasicMaterial color={COLORS.stripe} />
        </mesh>
      ))}
    </group>
  );
}

function Ball({ gameRef, fxRef, ramp }) {
  const mesh = useRef();
  const material = useRef();
  useFrame((_, dt) => {
    const game = gameRef.current;
    const fx = fxRef.current;
    fx.squash = Math.max(0, fx.squash - dt * 5);
    const s = fx.squash;
    mesh.current.position.set(0, -game.ballY * S, BALL_RING);
    mesh.current.scale.set(1 + 0.25 * s, 1 - 0.38 * s, 1 + 0.25 * s);
    material.current.color.set(game.comboCount >= 3 ? COLORS.ballHot : COLORS.ball);
  });
  return (
    <group ref={mesh}>
      <mesh>
        <sphereGeometry args={[BALL_R, 24, 16]} />
        <meshToonMaterial ref={material} color={COLORS.ball} gradientMap={ramp} />
      </mesh>
      <mesh scale={1.14}>
        <sphereGeometry args={[BALL_R, 24, 16]} />
        <meshBasicMaterial color="#111111" side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

function CameraRig({ gameRef, fxRef }) {
  const { camera } = useThree();
  useFrame((_, dt) => {
    const fx = fxRef.current;
    fx.shake = Math.max(0, fx.shake - dt * 3);
    const camY = -gameRef.current.cameraY * S;
    const jitter = fx.shake * 0.12;
    camera.position.set((Math.random() - 0.5) * jitter, camY - 0.8 + (Math.random() - 0.5) * jitter, 10.2);
    camera.lookAt(0, camY - 3.8, 0);
  });
  return null;
}

function World({ gameRef, dragRef, callbacks }) {
  const ramp = useToonRamp();
  const tower = useRef();
  const fxRef = useRef({ squash: 0, shake: 0 });
  const [, setVersion] = useState(0);
  const splatsRef = useRef([]);

  useFrame((_, dt) => {
    const game = gameRef.current;
    const events = stepHelix(game, dt, dragRef.current.isDragging);
    tower.current.rotation.y = -game.towerAngle;

    if (events.bounce) {
      fxRef.current.squash = 1;
      if (events.landedPlatform) {
        const platform = game.platforms.find((p) => p.id === events.landedPlatform);
        splatsRef.current.push({
          id: `${platform.id}-${game.time}`,
          platformId: platform.id,
          y: platform.y,
          angle: events.landedAngle,
          spin: Math.random() * Math.PI,
          size: 0.16 + Math.random() * 0.08,
          color: game.comboCount >= 3 ? COLORS.ballHot : '#f4b400',
        });
        if (splatsRef.current.length > MAX_SPLATS) splatsRef.current.shift();
        setVersion((v) => v + 1);
      }
    }
    if (events.smash) fxRef.current.shake = 1;
    if (events.platformsChanged) {
      const alive = new Set(game.platforms.map((p) => p.id));
      splatsRef.current = splatsRef.current.filter((s) => alive.has(s.platformId));
      setVersion((v) => v + 1);
    }
    callbacks.current.onEvents?.(events, game);
  });

  return (
    <>
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 8, 6]} intensity={1.2} />
      <CameraRig gameRef={gameRef} fxRef={fxRef} />
      <group ref={tower}>
        <Pole ramp={ramp} gameRef={gameRef} />
        {gameRef.current.platforms.map((platform) => (
          <Platform key={platform.id} platform={platform} ramp={ramp} gameRef={gameRef} />
        ))}
        {splatsRef.current.map((splat) => (
          <Splat key={splat.id} splat={splat} />
        ))}
      </group>
      <Ball gameRef={gameRef} fxRef={fxRef} ramp={ramp} />
    </>
  );
}

/**
 * 3D Helix Jump renderer. Game state lives in `gameRef` (mutated every frame);
 * gameplay events are reported through `onEvents`.
 */
// Canvas uses offsetSize so it measures layout size rather than the zoomed rect.
export default function HelixScene({ gameRef, dragRef, onEvents, resetKey }) {
  const callbacks = useRef({ onEvents });
  useEffect(() => {
    callbacks.current.onEvents = onEvents;
  }, [onEvents]);

  return (
    <Canvas
      key={resetKey}
      flat
      dpr={[1, 1.75]}
      resize={{ offsetSize: true }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      camera={{ fov: 45, near: 0.1, far: 60, position: [0, 0, 8.4] }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      <World gameRef={gameRef} dragRef={dragRef} callbacks={callbacks} />
    </Canvas>
  );
}
