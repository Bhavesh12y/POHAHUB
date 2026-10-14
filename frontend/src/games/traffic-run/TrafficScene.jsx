import { memo, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { GameCanvas, SketchLights, InkBox, useToonRamp, useRoundedBoxGeometry, INK } from '../three/kit.jsx';
import { stepTraffic, PLAYER_TOP } from './trafficLogic.js';

const K = 0.2; // track percent -> world units
const LANE_W = 2.1;
const laneX = (lane) => (lane - 1) * LANE_W;
const PLAYER_Z = 0;
const zOf = (y) => (y - PLAYER_TOP) * K + PLAYER_Z; // front edge of an obstacle
const ROAD_LEN = 60;

function Car({ color, length, isPlayer, ramp }) {
  const body = useRoundedBoxGeometry(1.25, length, 0.5, 0.18);
  const cabin = useRoundedBoxGeometry(1.0, length * 0.42, 0.38, 0.14);
  return (
    <group>
      <mesh geometry={body} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.42, 0]}>
        <meshToonMaterial color={color} gradientMap={ramp} />
        <Edges color={INK} threshold={25} lineWidth={2} />
      </mesh>
      <mesh geometry={cabin} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.82, length * 0.04]}>
        <meshToonMaterial color="#bae6fd" gradientMap={ramp} />
        <Edges color={INK} threshold={25} lineWidth={2} />
      </mesh>
      {[-1, 1].map((side) =>
        [-1, 1].map((end) => (
          <mesh key={`${side}${end}`} position={[side * 0.66, 0.26, end * length * 0.32]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.24, 0.24, 0.16, 14]} />
            <meshToonMaterial color="#1f2937" gradientMap={ramp} />
          </mesh>
        )),
      )}
      {isPlayer && (
        <>
          <InkBox size={[0.12, 0.02, length * 0.9]} color="#ffffff" ramp={ramp} position={[-0.12, 0.68, 0]} edges={false} />
          <InkBox size={[0.12, 0.02, length * 0.9]} color="#ffffff" ramp={ramp} position={[0.12, 0.68, 0]} edges={false} />
          <InkBox size={[1.2, 0.08, 0.16]} color="#111111" ramp={ramp} position={[0, 0.95, length * 0.48]} edges={false} />
        </>
      )}
    </group>
  );
}

function Truck({ color, length, ramp }) {
  return (
    <group>
      <InkBox size={[1.3, 0.9, length * 0.28]} color={color} ramp={ramp} position={[0, 0.65, -length * 0.36]} />
      <InkBox size={[1.35, 1.25, length * 0.66]} color="#e2e8f0" ramp={ramp} position={[0, 0.85, length * 0.14]} />
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.7, 0.28, -length * 0.36]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.26, 0.26, 0.16, 14]} />
          <meshToonMaterial color="#1f2937" gradientMap={ramp} />
        </mesh>
      ))}
    </group>
  );
}

function Cone({ ramp }) {
  return (
    <group>
      <InkBox size={[0.9, 0.12, 0.9]} color="#1f2937" ramp={ramp} position={[0, 0.06, 0]} />
      <mesh position={[0, 0.55, 0]}>
        <coneGeometry args={[0.36, 0.95, 16]} />
        <meshToonMaterial color="#f97316" gradientMap={ramp} />
        <Edges color={INK} threshold={30} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.24, 0.27, 0.14, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

function Barrier({ ramp }) {
  return (
    <group>
      <InkBox size={[1.8, 0.6, 0.3]} color="#facc15" ramp={ramp} position={[0, 0.6, 0]} />
      {[-0.55, 0, 0.55].map((x) => (
        <InkBox key={x} size={[0.22, 0.62, 0.32]} color="#111111" ramp={ramp} position={[x, 0.6, 0.001]} rotation={[0, 0, 0.6]} edges={false} />
      ))}
      <InkBox size={[0.15, 0.4, 0.15]} color="#111111" ramp={ramp} position={[-0.7, 0.15, 0]} edges={false} />
      <InkBox size={[0.15, 0.4, 0.15]} color="#111111" ramp={ramp} position={[0.7, 0.15, 0]} edges={false} />
    </group>
  );
}

const Obstacle = memo(function Obstacle({ ob, ramp }) {
  const group = useRef();
  const length = ob.height * K;
  useFrame(() => {
    // Obstacle spans y..y+height; centre it on that span.
    if (group.current) group.current.position.z = zOf(ob.y) + length / 2;
  });
  return (
    <group ref={group} position={[laneX(ob.lane), 0, zOf(ob.y) + length / 2]} rotation={[0, Math.PI, 0]}>
      {ob.type === 'truck' && <Truck color={ob.color} length={length} ramp={ramp} />}
      {ob.type === 'car' && <Car color={ob.color} length={length * 0.85} ramp={ramp} />}
      {ob.type === 'cone' && <Cone ramp={ramp} />}
      {ob.type === 'barrier' && <Barrier ramp={ramp} />}
    </group>
  );
});

function Player({ gameRef, ramp }) {
  const group = useRef();
  useFrame((_, dt) => {
    const game = gameRef.current;
    const g = group.current;
    const target = laneX(game.lane);
    const k = 1 - Math.exp(-dt * 16);
    const before = g.position.x;
    g.position.x += (target - g.position.x) * k;
    g.rotation.y = -(g.position.x - before) / Math.max(dt, 0.001) * 0.03;
    g.rotation.z = game.isGameOver ? 0.25 : 0;
  });
  return (
    <group ref={group} position={[0, 0, PLAYER_Z + (11 * K) / 2]}>
      <Car color="#ef4444" length={11 * K * 1.15} isPlayer ramp={ramp} />
    </group>
  );
}

function Road({ gameRef, ramp }) {
  const dashes = useRef();
  const trees = useRef();
  const dashZs = useMemo(() => Array.from({ length: 16 }, (_, i) => 6 - i * 4), []);
  const treeZs = useMemo(() => Array.from({ length: 12 }, (_, i) => 6 - i * 5.5), []);
  useFrame((_, dt) => {
    const game = gameRef.current;
    const move = game.isPlaying ? game.speed * K * 60 * Math.min(dt, 0.05) : 0;
    const wrap = (obj, span) => {
      obj.position.z += move;
      if (obj.position.z > 8) obj.position.z -= span;
    };
    dashes.current.children.forEach((d) => wrap(d, 16 * 4));
    trees.current.children.forEach((t) => wrap(t, 12 * 5.5));
  });
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -ROAD_LEN / 2 + 8]}>
        <planeGeometry args={[LANE_W * 3 + 0.4, ROAD_LEN]} />
        <meshToonMaterial color="#475569" gradientMap={ramp} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, -ROAD_LEN / 2 + 8]}>
        <planeGeometry args={[40, ROAD_LEN]} />
        <meshToonMaterial color="#86efac" gradientMap={ramp} />
      </mesh>
      {[-1, 1].map((side) => (
        <InkBox key={side} size={[0.25, 0.18, ROAD_LEN]} color="#f8fafc" ramp={ramp} position={[side * (LANE_W * 1.5 + 0.2), 0.09, -ROAD_LEN / 2 + 8]} />
      ))}
      <group ref={dashes}>
        {dashZs.map((z) =>
          [-0.5, 0.5].map((l) => (
            <mesh key={`${z}${l}`} rotation={[-Math.PI / 2, 0, 0]} position={[l * LANE_W, 0.01, z]}>
              <planeGeometry args={[0.14, 1.6]} />
              <meshBasicMaterial color="#f8fafc" />
            </mesh>
          )),
        )}
      </group>
      <group ref={trees}>
        {treeZs.map((z, i) => (
          <group key={z} position={[(i % 2 ? 1 : -1) * (5.4 + (i % 3) * 0.8), 0, z]}>
            <InkBox size={[0.3, 0.8, 0.3]} color="#92400e" ramp={ramp} position={[0, 0.4, 0]} />
            <mesh position={[0, 1.45, 0]}>
              <coneGeometry args={[0.75, 1.6, 7]} />
              <meshToonMaterial color="#16a34a" gradientMap={ramp} />
              <Edges color={INK} threshold={20} />
            </mesh>
          </group>
        ))}
      </group>
    </>
  );
}

function World({ gameRef, onEvents }) {
  const ramp = useToonRamp();
  const [, setVersion] = useState(0);
  useFrame(({ camera }, dt) => {
    camera.lookAt(0, 0.4, -7);
    const events = stepTraffic(gameRef.current, dt);
    if (events.changed) setVersion((v) => v + 1);
    onEvents.current?.(events, gameRef.current);
  });
  return (
    <>
      <fog attach="fog" args={['#e0f2fe', 14, 30]} />
      <SketchLights />
      <Road gameRef={gameRef} ramp={ramp} />
      <Player gameRef={gameRef} ramp={ramp} />
      {gameRef.current.obstacles.map((ob) => (
        <Obstacle key={ob.id} ob={ob} ramp={ramp} />
      ))}
    </>
  );
}

export default function TrafficScene({ gameRef, onEvents }) {
  return (
    <GameCanvas camera={{ fov: 55, position: [0, 5.2, 7.4] }}>
      <World gameRef={gameRef} onEvents={onEvents} />
    </GameCanvas>
  );
}
