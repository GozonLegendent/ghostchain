import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Html, Stars, Grid, QuadraticBezierLine } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

const CENTER = [0, 0.4, 0];

const ATMOSPHERE_VERT = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const ATMOSPHERE_FRAG = `
  varying vec3 vNormal;
  uniform vec3 uColor;
  uniform float uPower;
  uniform float uOpacity;
  void main() {
    float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), uPower);
    gl_FragColor = vec4(uColor, clamp(intensity, 0.0, 1.0) * uOpacity);
  }
`;

function Atmosphere({ radius, color, opacity = 0.9 }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uPower: { value: 2.2 },
          uOpacity: { value: opacity },
        },
        vertexShader: ATMOSPHERE_VERT,
        fragmentShader: ATMOSPHERE_FRAG,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    [color, opacity]
  );
  return (
    <mesh scale={1.28}>
      <sphereGeometry args={[radius, 32, 32]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

function WireShell({ radius, color, spinX = 0.06, spinY = 0.12 }) {
  const ref = useRef();
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * spinY;
      ref.current.rotation.x += delta * spinX;
    }
  });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[radius, 1]} />
      <meshBasicMaterial color={color} wireframe transparent opacity={0.85} toneMapped={false} />
    </mesh>
  );
}

function HudRings({ radius, color }) {
  const r1 = useRef();
  const r2 = useRef();
  useFrame((_, delta) => {
    if (r1.current) r1.current.rotation.z += delta * 0.35;
    if (r2.current) r2.current.rotation.z -= delta * 0.22;
  });
  return (
    <>
      <group ref={r1} rotation={[Math.PI / 2.3, 0.3, 0]}>
        <mesh>
          <torusGeometry args={[radius * 1.55, 0.012, 8, 96]} />
          <meshBasicMaterial color={color} transparent opacity={0.55} toneMapped={false} />
        </mesh>
      </group>
      <group ref={r2} rotation={[Math.PI / 1.8, -0.4, 0.3]}>
        <mesh>
          <torusGeometry args={[radius * 1.85, 0.008, 8, 96]} />
          <meshBasicMaterial color={color} transparent opacity={0.35} toneMapped={false} />
        </mesh>
      </group>
    </>
  );
}

function OrbitParticles({ radius, color, count = 26 }) {
  const ref = useRef();
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const jitter = (Math.random() - 0.5) * 0.15;
      arr[i * 3] = Math.cos(a) * (radius * 1.7 + jitter);
      arr[i * 3 + 1] = (Math.random() - 0.5) * 0.25;
      arr[i * 3 + 2] = Math.sin(a) * (radius * 1.7 + jitter);
    }
    return arr;
  }, [radius, count]);

  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.25;
  });

  return (
    <group ref={ref} rotation={[Math.PI / 2.5, 0, 0]}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color={color} size={0.05} transparent opacity={0.85} toneMapped={false} sizeAttenuation />
      </points>
    </group>
  );
}

function CoreGlow({ radius, color }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = clock.getElapsedTime();
      const s = 1 + Math.sin(t * 1.6) * 0.06;
      ref.current.scale.setScalar(s);
    }
  });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[radius * 0.52, 2]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function CoreSphere({ position, radius, color, label, sub, floatSpeed = 1.1, floatRange = 0.22 }) {
  return (
    <Float speed={floatSpeed} rotationIntensity={0.15} floatIntensity={floatRange} position={position}>
      <group>
        <CoreGlow radius={radius} color={color} />
        <WireShell radius={radius} color={color} />
        <Atmosphere radius={radius} color={color} opacity={0.5} />
        <HudRings radius={radius} color={color} />
        <OrbitParticles radius={radius} color={color} />
        <pointLight color={color} intensity={2.2} distance={radius * 6} />
        <Html position={[0, -radius * 1.95 - 0.35, 0]} center distanceFactor={9}>
          <div className="text-center select-none pointer-events-none whitespace-nowrap">
            <div className="font-display text-sm font-bold tracking-wide text-white drop-shadow-[0_0_6px_rgba(56,224,248,0.65)]">
              {label}
            </div>
            {sub ? (
              <div className="font-mono text-[9px] tracking-widest mt-0.5" style={{ color }}>
                {sub}
              </div>
            ) : null}
          </div>
        </Html>
      </group>
    </Float>
  );
}

function Packet({ curve, duration = 3, delay = 0, color = "#38e0f8" }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    const t = ((clock.getElapsedTime() + delay) % duration) / duration;
    const p = curve.getPointAt(t);
    if (ref.current) ref.current.position.copy(p);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.055, 12, 12]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

function Connection({ from, to, color = "#38e0f8" }) {
  const mid = useMemo(() => {
    const m = new THREE.Vector3(
      (from[0] + to[0]) / 2,
      Math.max(from[1], to[1]) + 1.1,
      (from[2] + to[2]) / 2
    );
    return [m.x, m.y, m.z];
  }, [from, to]);

  const curve = useMemo(
    () =>
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(...from),
        new THREE.Vector3(...mid),
        new THREE.Vector3(...to)
      ),
    [from, mid, to]
  );

  return (
    <group>
      <QuadraticBezierLine
        start={from}
        end={to}
        mid={mid}
        color={color}
        lineWidth={1}
        transparent
        opacity={0.4}
        dashed
        dashScale={4}
        dashSize={0.35}
        gapSize={0.55}
      />
      <Packet curve={curve} duration={3.2} color={color} />
    </group>
  );
}

function Scene({ nodes }) {
  const orgPositions = useMemo(() => {
    const radius = 4.4;
    return nodes.map((n, i) => {
      const angle = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 0.15;
      return { ...n, position: [x, y, z] };
    });
  }, [nodes]);

  return (
    <>
      <ambientLight intensity={0.25} />
      <pointLight position={[6, 6, 6]} intensity={0.5} color="#7dd3fc" />

      <Stars radius={40} depth={20} count={700} factor={1.5} saturation={0} fade speed={0.5} />

      <Grid
        position={[0, -2.1, 0]}
        args={[30, 30]}
        cellColor="#0e2a3d"
        sectionColor="#155e75"
        fadeDistance={16}
        fadeStrength={1.5}
        infiniteGrid
      />

      {orgPositions.map((n) => (
        <Connection key={`c-${n.id}`} from={CENTER} to={n.position} color={n.hot ? "#fb7185" : "#22d3ee"} />
      ))}

      <CoreSphere
        position={CENTER}
        radius={1.05}
        color="#38e0f8"
        label="MASTER AI"
        sub="SYS.CORE.01"
        floatSpeed={0.7}
        floatRange={0.14}
      />

      {orgPositions.map((n, i) => (
        <CoreSphere
          key={n.id}
          position={n.position}
          radius={0.62}
          color={n.hot ? "#fb7185" : "#34d399"}
          label={n.name}
          sub={n.hot ? `[ ${n.count} INCIDENT${n.count > 1 ? "S" : ""} LOGGED ]` : "[ SECURE ]"}
          floatSpeed={1.1 + i * 0.2}
          floatRange={0.26}
        />
      ))}

      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={6}
        maxDistance={14}
        autoRotate
        autoRotateSpeed={0.5}
        maxPolarAngle={Math.PI / 1.7}
        minPolarAngle={Math.PI / 4}
        enableDamping
        dampingFactor={0.08}
        target={CENTER}
      />
    </>
  );
}

export default function NetworkScene3D({ nodes }) {
  return (
    <div className="relative h-[520px] w-full overflow-hidden rounded">
      <Canvas dpr={[1, 1.6]} camera={{ position: [0, 2.6, 9.5], fov: 42 }} gl={{ antialias: true, alpha: true }}>
        <Suspense fallback={null}>
          <Scene nodes={nodes} />
          <EffectComposer>
            <Bloom luminanceThreshold={0.1} luminanceSmoothing={0.9} intensity={0.85} radius={0.65} mipmapBlur />
          </EffectComposer>
        </Suspense>
      </Canvas>
      <div className="pointer-events-none absolute left-3 top-3 font-mono text-[9px] tracking-widest text-cyan-400/80">
        SCAN.MODE // ACTIVE
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 font-mono text-[9px] tracking-widest text-slate-500">
        DRAG TO ORBIT · SCROLL TO ZOOM
      </div>
    </div>
  );
}