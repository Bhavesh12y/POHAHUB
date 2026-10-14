import { memo, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import { GameCanvas, SketchLights, InkBox, Blob, Cloud, ToonMaterial, useToonRamp, INK } from '../three/kit.jsx';
import { stepFlappy, FIELD_W, FIELD_H, PIPE_WIDTH, BIRD_SIZE, BIRD_X } from './flappyLogic.js';

const S = 1 / 50;
const wx = (px) => (px - FIELD_W / 2) * S;
const wy = (py) => (FIELD_H / 2 - py) * S;
const TOP = wy(0);
const BOTTOM = wy(FIELD_H);
const PIPE_R = (PIPE_WIDTH / 2) * S;
const PIPE_GREEN = '#4ade80';

function Bird({ gameRef, ramp }) {
  const root = useRef();
  const wing = useRef();
  const tilt = useRef(0);
  useFrame((_, dt) => {
    const game = gameRef.current;
    const g = root.current;
    g.position.set(wx(BIRD_X + BIRD_SIZE / 2), wy(game.birdY + BIRD_SIZE / 2), 0);
    if (!game.hasStarted && !game.isGameOver) g.position.y += Math.sin(game.time * 2.5) * 0.12;
    // Ease the nose up/down instead of snapping with every flap.
    const target = game.hasStarted ? Math.max(-0.35, Math.min(0.9, game.birdV * 0.09)) : 0;
    tilt.current += (target - tilt.current) * Math.min(1, dt * 8);
    g.rotation.z = -tilt.current;
    // Calm wing beat: a little quicker right after a flap.
    const rate = game.birdV < 0 ? 11 : 6;
    wing.current.rotation.x = game.isGameOver ? 0.2 : Math.sin(game.time * rate) * 0.35;
  });
  const r = (BIRD_SIZE / 2) * S;
  return (
    <group ref={root}>
      <Blob args={[r, 24, 18]} color="#fcd34d" ramp={ramp} scale={[1.12, 1, 1]} outline={1.07} brighten={0.4} />
      {/* cream belly */}
      <Blob args={[r * 0.68, 20, 14]} color="#fef3c7" ramp={ramp} position={[r * 0.22, -r * 0.3, r * 0.42]} outline={false} brighten={0.5} />
      {/* tail feather */}
      <Blob shape="cone" args={[r * 0.32, r * 0.6, 14]} color="#f59e0b" ramp={ramp} position={[-r * 1.1, r * 0.15, 0]} rotation={[0, 0, Math.PI / 2 + 0.3]} outline={1.1} />
      {/* big friendly eye */}
      <group position={[r * 0.48, r * 0.32, r * 0.62]}>
        <mesh>
          <sphereGeometry args={[r * 0.34, 16, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
        <mesh position={[r * 0.08, 0, r * 0.2]}>
          <sphereGeometry args={[r * 0.17, 14, 10]} />
          <meshBasicMaterial color={INK} />
        </mesh>
        <mesh position={[r * 0.14, r * 0.07, r * 0.34]}>
          <sphereGeometry args={[r * 0.055, 8, 6]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
      {/* rounded beak + cheek */}
      <Blob args={[r * 0.3, 16, 12]} color="#fb923c" ramp={ramp} position={[r * 1.08, -r * 0.08, 0]} scale={[1.35, 0.7, 0.9]} outline={1.12} brighten={0.35} />
      <mesh position={[r * 0.75, -r * 0.2, r * 0.7]}>
        <sphereGeometry args={[r * 0.13, 10, 8]} />
        <meshBasicMaterial color="#f9a8d4" />
      </mesh>
      {/* soft wing */}
      <group ref={wing} position={[-r * 0.1, -r * 0.05, r * 0.8]}>
        <Blob args={[r * 0.5, 16, 12]} color="#fbbf24" ramp={ramp} position={[0, 0, r * 0.1]} scale={[1.2, 0.45, 0.8]} outline={1.12} brighten={0.4} />
      </group>
    </group>
  );
}

const Pipe = memo(function Pipe({ pipe, ramp }) {
  const group = useRef();
  useFrame(() => {
    if (group.current) group.current.position.x = wx(pipe.x + PIPE_WIDTH / 2);
  });
  const gapTop = wy(pipe.topHeight);
  const gapBottom = wy(pipe.topHeight + pipe.gap);
  const topLen = TOP - gapTop + 1;
  const bottomLen = gapBottom - BOTTOM + 1;
  return (
    <group ref={group} position={[wx(pipe.x + PIPE_WIDTH / 2), 0, 0]}>
      <mesh position={[0, gapTop + topLen / 2, 0]}>
        <cylinderGeometry args={[PIPE_R * 0.9, PIPE_R * 0.9, topLen, 18]} />
        <ToonMaterial color={PIPE_GREEN} ramp={ramp} brighten={0.3} />
        <Edges color={INK} threshold={30} />
      </mesh>
      <mesh position={[0, gapTop + 0.18, 0]}>
        <cylinderGeometry args={[PIPE_R * 1.12, PIPE_R * 1.12, 0.36, 18]} />
        <ToonMaterial color={PIPE_GREEN} ramp={ramp} brighten={0.3} />
        <Edges color={INK} threshold={30} />
      </mesh>
      <mesh position={[0, gapBottom - bottomLen / 2, 0]}>
        <cylinderGeometry args={[PIPE_R * 0.9, PIPE_R * 0.9, bottomLen, 18]} />
        <ToonMaterial color={PIPE_GREEN} ramp={ramp} brighten={0.3} />
        <Edges color={INK} threshold={30} />
      </mesh>
      <mesh position={[0, gapBottom - 0.18, 0]}>
        <cylinderGeometry args={[PIPE_R * 1.12, PIPE_R * 1.12, 0.36, 18]} />
        <ToonMaterial color={PIPE_GREEN} ramp={ramp} brighten={0.3} />
        <Edges color={INK} threshold={30} />
      </mesh>
    </group>
  );
});

function Scenery({ gameRef, ramp }) {
  const clouds = useRef();
  const cloudXs = useMemo(() => [-3, 1.5, 5.5], []);
  useFrame((_, dt) => {
    const moving = gameRef.current.hasStarted && !gameRef.current.isGameOver;
    clouds.current.children.forEach((c) => {
      c.position.x -= (moving ? 0.6 : 0.15) * dt;
      if (c.position.x < -7) c.position.x += 14;
    });
  });
  return (
    <>
      <group ref={clouds}>
        {cloudXs.map((x, i) => (
          <Cloud key={x} ramp={ramp} scale={1.1} position={[x, 3.6 - i * 2.2, -4]} />
        ))}
      </group>
      <InkBox size={[20, 0.6, 3]} color="#86efac" ramp={ramp} position={[0, BOTTOM - 0.3, 0]} />
    </>
  );
}

function World({ gameRef, onEvents }) {
  const ramp = useToonRamp();
  const [, setVersion] = useState(0);
  useFrame(({ camera }, dt) => {
    camera.lookAt(0, 0, 0);
    const events = stepFlappy(gameRef.current, dt);
    if (events.pipesChanged) setVersion((v) => v + 1);
    onEvents.current?.(events, gameRef.current);
  });
  return (
    <>
      <SketchLights />
      <Scenery gameRef={gameRef} ramp={ramp} />
      {gameRef.current.pipes.map((pipe) => (
        <Pipe key={pipe.id} pipe={pipe} ramp={ramp} />
      ))}
      <Bird gameRef={gameRef} ramp={ramp} />
    </>
  );
}

export default function FlappyScene({ gameRef, onEvents }) {
  return (
    <GameCanvas camera={{ fov: 50, position: [1.4, 0.8, 14] }}>
      <World gameRef={gameRef} onEvents={onEvents} />
    </GameCanvas>
  );
}
