import { memo, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { GameCanvas, SketchLights, InkBox, Blob, Cloud, useToonRamp } from '../three/kit.jsx';
import { stepDino, DINO_X } from './dinoLogic.js';

const S = 1 / 40; // game px -> world units
const wx = (px) => (px - DINO_X) * S;
const GREEN = '#22c55e';
const DARK_GREEN = '#15803d';
const CACTUS = '#10b981';

function CameraRig() {
  const { camera, size } = useThree();
  useFrame(() => {
    // Keep the dino ~1.6 units from the left edge whatever the stage aspect.
    const halfW = Math.tan((camera.fov * Math.PI) / 360) * 10.6 * (size.width / size.height);
    const cx = halfW - 1.7;
    camera.position.set(cx, 2.6, 10.4);
    camera.lookAt(cx, 1.5, 0);
  });
  return null;
}

function Dino({ gameRef, ramp }) {
  const root = useRef();
  const body = useRef();
  const legL = useRef();
  const legR = useRef();
  const eye = useRef();
  useFrame(() => {
    const game = gameRef.current;
    const y = game.dinoY * S;
    const running = game.isPlaying && y <= 0.01;
    const t = game.frames / 60;
    root.current.position.set(0.5, y, 0);
    // Gentle lean while airborne, soft bob while running.
    root.current.rotation.z += ((y > 0.01 ? 0.15 : 0) - root.current.rotation.z) * 0.2;
    body.current.position.y = running ? Math.abs(Math.sin(t * 9)) * 0.05 : 0;
    const swing = running ? Math.sin(t * 18) * 0.6 : 0;
    legL.current.rotation.z = swing;
    legR.current.rotation.z = -swing;
    eye.current.scale.y = game.isGameOver ? 0.25 : 1;
  });
  return (
    <group ref={root}>
      <group ref={body}>
        {/* tail */}
        <Blob shape="cone" args={[0.22, 0.7, 16]} color={GREEN} ramp={ramp} position={[-0.55, 0.55, 0]} rotation={[0, 0, Math.PI / 2 + 0.35]} />
        {/* chubby body + belly */}
        <Blob args={[0.4, 24, 18]} color={GREEN} ramp={ramp} position={[-0.05, 0.6, 0]} scale={[1.1, 1, 0.95]} />
        <Blob args={[0.28, 20, 14]} color="#bbf7d0" ramp={ramp} position={[0.12, 0.52, 0.12]} outline={false} />
        {/* soft back spikes */}
        {[[-0.35, 0.88, 0.5], [-0.12, 1.0, 0.25], [0.1, 1.04, 0]].map(([x, yy, r]) => (
          <Blob key={x} shape="cone" args={[0.09, 0.2, 12]} color={DARK_GREEN} ramp={ramp} position={[x, yy, 0]} rotation={[0, 0, r]} outline={1.12} />
        ))}
        {/* big round head + snout */}
        <Blob args={[0.33, 24, 18]} color={GREEN} ramp={ramp} position={[0.36, 1.12, 0]} />
        <Blob args={[0.2, 20, 14]} color={GREEN} ramp={ramp} position={[0.62, 1.02, 0]} scale={[1.2, 0.85, 1]} />
        {/* eye with sparkle */}
        <group ref={eye} position={[0.44, 1.2, 0.25]}>
          <mesh>
            <sphereGeometry args={[0.1, 16, 12]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0.025, 0, 0.06]}>
            <sphereGeometry args={[0.058, 14, 10]} />
            <meshBasicMaterial color="#111111" />
          </mesh>
          <mesh position={[0.045, 0.025, 0.105]}>
            <sphereGeometry args={[0.018, 8, 6]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        </group>
        {/* rosy cheek + nostril */}
        <mesh position={[0.56, 0.98, 0.17]}>
          <sphereGeometry args={[0.055, 12, 8]} />
          <meshBasicMaterial color="#f9a8d4" />
        </mesh>
        <mesh position={[0.78, 1.06, 0.08]}>
          <sphereGeometry args={[0.02, 8, 6]} />
          <meshBasicMaterial color="#111111" />
        </mesh>
        {/* little arm */}
        <Blob shape="capsule" args={[0.05, 0.12, 6, 12]} color={DARK_GREEN} ramp={ramp} position={[0.32, 0.62, 0.3]} rotation={[0, 0, 1.2]} outline={1.15} />
      </group>
      {/* legs swing from the hip */}
      <group ref={legL} position={[-0.15, 0.32, 0.16]}>
        <Blob shape="capsule" args={[0.1, 0.16, 6, 12]} color={DARK_GREEN} ramp={ramp} position={[0, -0.16, 0]} outline={1.12} />
      </group>
      <group ref={legR} position={[0.12, 0.32, -0.12]}>
        <Blob shape="capsule" args={[0.1, 0.16, 6, 12]} color={DARK_GREEN} ramp={ramp} position={[0, -0.16, 0]} outline={1.12} />
      </group>
    </group>
  );
}

const Cactus = memo(function Cactus({ obstacle, ramp }) {
  const group = useRef();
  useFrame(() => {
    if (group.current) group.current.position.x = wx(obstacle.x);
  });
  const w = obstacle.width * S;
  const h = obstacle.height * S;
  // Rounded capsule cactus that fills the same hitbox as before.
  const trunk = (x, width, height) => {
    const r = width / 2;
    return (
      <Blob shape="capsule" args={[r, Math.max(height - 2 * r, 0.01), 8, 16]} color={CACTUS} ramp={ramp} position={[x, height / 2, 0]} outline={1.08} />
    );
  };
  const arm = (x, y, dir) => (
    <group position={[x, y, 0]}>
      <Blob shape="capsule" args={[0.08, 0.14, 6, 12]} color={CACTUS} ramp={ramp} position={[dir * 0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]} outline={1.12} />
      <Blob shape="capsule" args={[0.08, 0.18, 6, 12]} color={CACTUS} ramp={ramp} position={[dir * 0.2, 0.12, 0]} outline={1.12} />
    </group>
  );
  return (
    <group ref={group} position={[wx(obstacle.x), 0, 0]}>
      {obstacle.type === 'double' ? (
        <>
          {trunk(0.21, 0.42, 0.88)}
          {trunk(w - 0.26, 0.5, h)}
          {arm(w - 0.05, h * 0.55, 1)}
        </>
      ) : (
        <>
          {trunk(w / 2, w, h)}
          {arm(0.02, h * 0.55, -1)}
          {obstacle.type === 'large' && arm(w - 0.02, h * 0.4, 1)}
        </>
      )}
    </group>
  );
});

function Ground({ gameRef, ramp }) {
  const marks = useRef();
  const dunes = useRef();
  const clouds = useRef();
  const markXs = useMemo(() => Array.from({ length: 18 }, (_, i) => i * 1.4 - 4), []);
  useFrame((_, dt) => {
    const game = gameRef.current;
    const moving = game.isPlaying ? game.speed * S * 60 * Math.min(dt, 0.1) : 0;
    marks.current.children.forEach((m) => {
      m.position.x -= moving;
      if (m.position.x < -4) m.position.x += 18 * 1.4;
    });
    dunes.current.children.forEach((d) => {
      d.position.x -= moving * 0.25;
      if (d.position.x < -10) d.position.x += 36;
    });
    clouds.current.children.forEach((c) => {
      c.position.x -= moving * 0.1 + dt * 0.15;
      if (c.position.x < -10) c.position.x += 34;
    });
  });
  return (
    <>
      <InkBox size={[80, 0.35, 16]} color="#fde68a" ramp={ramp} position={[20, -0.175, 5.5]} />
      <group ref={marks}>
        {markXs.map((x, i) => (
          <InkBox key={i} size={[0.5, 0.04, 0.12]} color="#a16207" ramp={ramp} position={[x, 0.02, 0.7 + (i % 3) * 0.3]} edges={false} />
        ))}
      </group>
      <group ref={dunes}>
        {[0, 7, 13, 20, 27].map((x, i) => (
          <mesh key={x} position={[x, 0, -7]} scale={[2.8 + (i % 2), 1.6 + (i % 3) * 0.5, 1]}>
            <sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshToonMaterial color={i % 2 ? '#fb7185' : '#f43f5e'} gradientMap={ramp} transparent opacity={0.45} />
          </mesh>
        ))}
      </group>
      <group ref={clouds}>
        {[2, 11, 19].map((x, i) => (
          <Cloud key={x} ramp={ramp} scale={1 + (i % 2) * 0.25} position={[x, 4.6 + (i % 2) * 0.6, -5]} />
        ))}
      </group>
      <mesh position={[9, 5.2, -10]}>
        <circleGeometry args={[1.1, 32]} />
        <meshBasicMaterial color="#fbbf24" />
      </mesh>
    </>
  );
}

function World({ gameRef, onEvents }) {
  const ramp = useToonRamp();
  const [, setVersion] = useState(0);
  useFrame((_, dt) => {
    const events = stepDino(gameRef.current, dt);
    if (events.spawned) setVersion((v) => v + 1);
    onEvents.current?.(events, gameRef.current);
  });
  return (
    <>
      <SketchLights />
      <CameraRig />
      <Ground gameRef={gameRef} ramp={ramp} />
      <Dino gameRef={gameRef} ramp={ramp} />
      {gameRef.current.obstacles.map((obs) => (
        <Cactus key={obs.id} obstacle={obs} ramp={ramp} />
      ))}
    </>
  );
}

export default function DinoScene({ gameRef, onEvents }) {
  return (
    <GameCanvas camera={{ fov: 40, position: [5, 3, 10.4] }}>
      <World gameRef={gameRef} onEvents={onEvents} />
    </GameCanvas>
  );
}
