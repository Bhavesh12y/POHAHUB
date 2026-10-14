import { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import { GameCanvas, SketchLights, ToonMaterial, useToonRamp, useRoundedBoxGeometry, INK } from '../three/kit.jsx';

export const GRID_SIZE = 8;
const STEP = 1.06;
const CUBE = 0.94;
const CUBE_H = 0.5;
const cellX = (c) => (c - (GRID_SIZE - 1) / 2) * STEP;
const cellZ = (r) => (r - (GRID_SIZE - 1) / 2) * STEP;
// Shading in 3D softens colours, so each pastel from the 2D palette maps to a
// slightly more saturated shade that reads just as bright on screen.
const VIVID = {
  '#ff99c8': '#ff6fae',
  '#a9def9': '#5cc6f5',
  '#fcf6bd': '#ffe14d',
  '#d0f4de': '#5fdc9c',
  '#e4c1f9': '#bb86f7',
  '#ffb5a7': '#ff8a72',
  '#ffd166': '#ffbf2e',
  '#06d6a0': '#06d6a0',
  '#118ab2': '#1a9fd0',
};
const hexFrom = (cls) => {
  const hex = cls?.match(/#([0-9a-fA-F]{6})/)?.[0]?.toLowerCase() || '#ffffff';
  return VIVID[hex] || hex;
};

// Raycasts screen points onto the board plane; used for drag-and-drop snapping.
function Picker({ pickRef }) {
  const { camera, gl } = useThree();
  useEffect(() => {
    const raycaster = new THREE.Raycaster();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -CUBE_H / 2);
    const hit = new THREE.Vector3();
    pickRef.current = (clientX, clientY) => {
      const rect = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(plane, hit)) return null;
      return {
        r: Math.round(hit.z / STEP + (GRID_SIZE - 1) / 2),
        c: Math.round(hit.x / STEP + (GRID_SIZE - 1) / 2),
      };
    };
    return () => {
      pickRef.current = null;
    };
  }, [camera, gl, pickRef]);
  return null;
}

const Cube = memo(function Cube({ r, c, color, geometry, ramp, state }) {
  const ref = useRef();
  const anim = useRef({ age: 0, clearAge: 0, spin: (Math.random() - 0.5) * 6 });
  useFrame(({ clock }, dt) => {
    const g = ref.current;
    if (!g) return;
    const a = (anim.current.age += dt);
    let y = CUBE_H / 2;
    let s = Math.min(1, 0.6 + a * 6); // drop-in pop
    if (state === 'clearing') {
      const k = (anim.current.clearAge += dt) / 0.45;
      y += k * 2.2;
      s = Math.max(0.01, 1 - k);
      g.rotation.set(k * anim.current.spin, k * 3, k * anim.current.spin * 0.5);
    } else if (state === 'predicted') {
      y += 0.12 + Math.sin(clock.elapsedTime * 14) * 0.06;
    } else {
      g.rotation.set(0, 0, 0);
    }
    g.position.set(cellX(c), y, cellZ(r));
    g.scale.setScalar(s);
  });
  return (
    <group ref={ref} position={[cellX(c), CUBE_H / 2, cellZ(r)]}>
      <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
        {/* Emissive lift keeps the pastel blocks as bright as the original 2D board. */}
        <meshToonMaterial
          color={color}
          gradientMap={ramp}
          emissive={state === 'predicted' ? '#ffffff' : color}
          emissiveIntensity={state === 'predicted' ? 0.5 : 0.18}
        />
        <Edges color={INK} threshold={25} lineWidth={2} />
      </mesh>
    </group>
  );
});

function Ghost({ cells, geometry }) {
  return cells.map(({ r, c, valid, color }) => (
    <mesh key={`${r}-${c}`} geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[cellX(c), CUBE_H / 2, cellZ(r)]}>
      <meshBasicMaterial color={valid ? color : '#ef4444'} transparent opacity={valid ? 0.6 : 0.4} depthWrite={false} />
    </mesh>
  ));
}

function BoardBase({ ramp }) {
  const base = useRoundedBoxGeometry(STEP * GRID_SIZE + 0.4, STEP * GRID_SIZE + 0.4, 0.3, 0.2);
  const sockets = useMemo(() => Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => [Math.floor(i / GRID_SIZE), i % GRID_SIZE]), []);
  return (
    <group>
      <mesh geometry={base} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.28, 0]}>
        <ToonMaterial color="#fff3a3" ramp={ramp} brighten={0.25} />
        <Edges color={INK} threshold={25} lineWidth={2.5} />
      </mesh>
      {sockets.map(([r, c]) => (
        <mesh key={`${r}-${c}`} rotation={[-Math.PI / 2, 0, 0]} position={[cellX(c), 0.002, cellZ(r)]}>
          <planeGeometry args={[CUBE, CUBE]} />
          <meshBasicMaterial color="#ffffff" />
          <Edges color="#d6d3a8" threshold={1} />
        </mesh>
      ))}
    </group>
  );
}

function CameraRig({ shaking }) {
  useFrame(({ camera }) => {
    const j = shaking ? 0.12 : 0;
    // Straight overhead: a flat, square board like the original game.
    const jx = (Math.random() - 0.5) * j;
    const jz = (Math.random() - 0.5) * j;
    camera.position.set(jx, 15, 0.001 + jz);
    camera.lookAt(jx, 0, jz);
  });
  return null;
}

function World({ board, ghostCells, predictedRows, predictedCols, clearingCells, shaking, pickRef }) {
  const ramp = useToonRamp();
  const geometry = useRoundedBoxGeometry(CUBE, CUBE, CUBE_H * 0.62, 0.12);
  const clearing = useMemo(() => new Set(clearingCells), [clearingCells]);
  return (
    <>
      <SketchLights />
      <CameraRig shaking={shaking} />
      <Picker pickRef={pickRef} />
      <BoardBase ramp={ramp} />
      {board.flatMap((row, r) =>
        row.map((cls, c) => {
          if (!cls) return null;
          const key = `${r}-${c}`;
          const state = clearing.has(key) ? 'clearing' : predictedRows.includes(r) || predictedCols.includes(c) ? 'predicted' : 'idle';
          return <Cube key={`${key}-${cls}`} r={r} c={c} color={hexFrom(cls)} geometry={geometry} ramp={ramp} state={state} />;
        }),
      )}
      <Ghost cells={ghostCells.map((g) => ({ ...g, color: hexFrom(g.color) }))} geometry={geometry} />
    </>
  );
}

export default function BlockScene(props) {
  return (
    <GameCanvas camera={{ fov: 36, position: [0, 15, 0.001] }}>
      <World {...props} />
    </GameCanvas>
  );
}
