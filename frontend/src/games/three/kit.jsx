// Shared three.js building blocks for the 3D arcade games: a zoom-safe canvas,
// flat toon shading and black "ink" edges that match the notebook look.
import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';

export const INK = '#111111';

/**
 * Canvas that measures its real layout size (offsetWidth), so it stays aligned
 * under the desktop CSS zoom, and caps pixel ratio for steady frame rates.
 * `flat` turns off filmic tone mapping, which otherwise washes out the pastels.
 */
export function GameCanvas({ children, camera, orthographic = false, className = '' }) {
  return (
    <Canvas
      className={className}
      orthographic={orthographic}
      camera={camera}
      flat
      dpr={[1, 1.75]}
      resize={{ offsetSize: true, debounce: { scroll: 50, resize: 0 } }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      {children}
    </Canvas>
  );
}

// Three-tone ramp: lit / mid / shadow, with no gradients, like marker colouring.
export function useToonRamp() {
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

export function SketchLights() {
  return (
    <>
      <ambientLight intensity={1.45} />
      <directionalLight position={[4, 9, 6]} intensity={1.1} />
    </>
  );
}

/**
 * Toon material that keeps colours close to their true value: the emissive lift
 * stops the shaded sides from going muddy, so pastels stay bright like the 2D site.
 */
export function ToonMaterial({ color, ramp, brighten = 0.3, ...props }) {
  return <meshToonMaterial color={color} gradientMap={ramp} emissive={color} emissiveIntensity={brighten} {...props} />;
}

/** Box with toon shading and inked edges. */
export function InkBox({ size = [1, 1, 1], color, ramp, edges = true, opacity = 1, brighten = 0.2, ...props }) {
  return (
    <mesh {...props}>
      <boxGeometry args={size} />
      <ToonMaterial color={color} ramp={ramp} brighten={brighten} transparent={opacity < 1} opacity={opacity} />
      {edges && <Edges color={INK} lineWidth={2} threshold={15} />}
    </mesh>
  );
}

const GEOMETRY = { sphere: 'sphereGeometry', capsule: 'capsuleGeometry', cone: 'coneGeometry', cylinder: 'cylinderGeometry' };

/**
 * Smooth rounded shape with a soft cartoon outline (an inverted hull: a slightly
 * larger back-face copy in ink). Used for characters, clouds and cacti.
 */
export function Blob({ shape = 'sphere', args, color, ramp, outline = 1.08, brighten = 0.3, children, ...props }) {
  const Geometry = GEOMETRY[shape];
  return (
    <group {...props}>
      <mesh>
        <Geometry args={args} />
        <ToonMaterial color={color} ramp={ramp} brighten={brighten} />
      </mesh>
      {outline && (
        <mesh scale={outline}>
          <Geometry args={args} />
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
      )}
      {children}
    </group>
  );
}

/** Puffy cartoon cloud made of overlapping spheres. */
export function Cloud({ ramp, scale = 1, ...props }) {
  return (
    <group scale={[scale, scale * 0.78, scale]} {...props}>
      <Blob args={[0.42, 18, 14]} color="#ffffff" ramp={ramp} position={[-0.45, 0, 0]} outline={1.07} brighten={0.5} />
      <Blob args={[0.58, 18, 14]} color="#ffffff" ramp={ramp} position={[0.1, 0.18, 0]} outline={1.06} brighten={0.5} />
      <Blob args={[0.44, 18, 14]} color="#ffffff" ramp={ramp} position={[0.68, 0, 0]} outline={1.07} brighten={0.5} />
      <Blob args={[0.36, 18, 14]} color="#ffffff" ramp={ramp} position={[0.15, -0.12, 0.2]} outline={false} brighten={0.5} />
    </group>
  );
}

/** Rounded, chunky box for tiles and cars (bevelled corners, inked outline). */
export function useRoundedBoxGeometry(width, height, depth, radius = 0.12, segments = 3) {
  return useMemo(() => {
    const shape = new THREE.Shape();
    const w = width / 2 - radius;
    const h = height / 2 - radius;
    shape.moveTo(-w, -height / 2);
    shape.lineTo(w, -height / 2);
    shape.quadraticCurveTo(width / 2, -height / 2, width / 2, -h);
    shape.lineTo(width / 2, h);
    shape.quadraticCurveTo(width / 2, height / 2, w, height / 2);
    shape.lineTo(-w, height / 2);
    shape.quadraticCurveTo(-width / 2, height / 2, -width / 2, h);
    shape.lineTo(-width / 2, -h);
    shape.quadraticCurveTo(-width / 2, -height / 2, -w, -height / 2);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: radius * 0.6,
      bevelSize: radius * 0.5,
      bevelSegments: segments,
      curveSegments: segments * 2,
    });
    geometry.center();
    return geometry;
  }, [width, height, depth, radius, segments]);
}

/** Text drawn into a canvas texture with the site's handwritten font. */
export function makeLabelTexture(text, { color = INK, background = null, size = 256, font = 'Architects Daughter' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
  }
  const label = String(text);
  const fontSize = label.length <= 2 ? size * 0.6 : label.length === 3 ? size * 0.45 : size * 0.34;
  ctx.font = `900 ${fontSize}px "${font}", cursive`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(label, size / 2, size / 2 + size * 0.04);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
