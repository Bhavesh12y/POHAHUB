import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { GameCanvas, SketchLights, ToonMaterial, useToonRamp, useRoundedBoxGeometry, makeLabelTexture, INK } from '../three/kit.jsx';
import { SIZE, tileColor, tileTextColor } from './logic2048.js';

const STEP = 1.08; // distance between cell centres
const TILE = 0.9;
const TILE_H = 0.34;
const cellX = (c) => (c - (SIZE - 1) / 2) * STEP;
const cellZ = (r) => (r - (SIZE - 1) / 2) * STEP;

const labelCache = new Map();
function labelFor(value) {
  if (!labelCache.has(value)) labelCache.set(value, makeLabelTexture(value, { color: tileTextColor(value) }));
  return labelCache.get(value);
}

const Tile = memo(function Tile({ tile, ghost, ramp, geometry }) {
  const group = useRef();
  const anim = useRef({ age: 0 });

  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    anim.current.age += dt;
    const k = 1 - Math.exp(-dt * 22);
    g.position.x += (cellX(tile.c) - g.position.x) * k;
    g.position.z += (cellZ(tile.r) - g.position.z) * k;

    const a = anim.current.age;
    let s = 1;
    if (tile.born) s = a < 0.09 ? 0.01 : Math.min(1, (a - 0.09) / 0.12);
    else if (tile.merged) s = a < 0.08 ? 0.01 : a < 0.2 ? 1 + 0.22 * Math.sin(((a - 0.08) / 0.12) * Math.PI) : 1;
    if (ghost) {
      if (anim.current.ghostAt === undefined) anim.current.ghostAt = a;
      s = a - anim.current.ghostAt > 0.11 ? 0.001 : 1;
    }
    g.scale.setScalar(Math.max(s, 0.001));
  });

  return (
    <group ref={group} position={[cellX(tile.c), TILE_H / 2, cellZ(tile.r)]}>
      <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
        <ToonMaterial color={tileColor(tile.value)} ramp={ramp} brighten={0.15} />
        <Edges color={INK} threshold={25} lineWidth={2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, TILE_H / 2 + 0.071, 0]}>
        <planeGeometry args={[TILE * 0.92, TILE * 0.92]} />
        <meshBasicMaterial map={labelFor(tile.value)} transparent depthWrite={false} />
      </mesh>
    </group>
  );
});

function Board({ ramp }) {
  const geometry = useRoundedBoxGeometry(STEP * SIZE + 0.25, STEP * SIZE + 0.25, 0.3, 0.2);
  const sockets = useMemo(() => {
    const list = [];
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) list.push([r, c]);
    return list;
  }, []);
  return (
    <group>
      <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.28, 0]}>
        <ToonMaterial color="#ffffff" ramp={ramp} brighten={0.3} />
        <Edges color={INK} threshold={25} lineWidth={2.5} />
      </mesh>
      {sockets.map(([r, c]) => (
        <mesh key={`${r}-${c}`} rotation={[-Math.PI / 2, 0, 0]} position={[cellX(c), 0.002, cellZ(r)]}>
          <planeGeometry args={[TILE, TILE]} />
          <meshBasicMaterial color="#e5e7eb" />
          <Edges color="#9ca3af" threshold={1} />
        </mesh>
      ))}
    </group>
  );
}

function World({ tiles, ghosts }) {
  const ramp = useToonRamp();
  const geometry = useRoundedBoxGeometry(TILE, TILE, TILE_H * 0.6, 0.12);
  return (
    <>
      <SketchLights />
      <Board ramp={ramp} />
      {/* Ghosts keep their original key so they slide into the merge, then vanish. */}
      {[...ghosts.map((t) => ({ ...t, ghost: true })), ...tiles].map((t) => (
        <Tile key={t.id} tile={t} ghost={Boolean(t.ghost)} ramp={ramp} geometry={geometry} />
      ))}
    </>
  );
}

export default function Scene2048({ tiles, ghosts }) {
  // Number labels use the site font; wait for it so textures are not drawn in a fallback face.
  const [fontReady, setFontReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const done = () => alive && setFontReady(true);
    if (document.fonts?.load) document.fonts.load('900 64px "Architects Daughter"').then(done, done);
    else done();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <GameCanvas camera={{ fov: 30, position: [0, 10.2, 0.001] }}>
      <CameraAim />
      {fontReady && <World tiles={tiles} ghosts={ghosts} />}
    </GameCanvas>
  );
}

function CameraAim() {
  useFrame(({ camera }) => camera.lookAt(0, 0, 0));
  return null;
}
