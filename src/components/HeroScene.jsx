import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { usePhotos } from '../hooks/usePhotos'
import { subscribeTheme } from '../lib/theme'

const DARK_FOG = '#08080b'
const LIGHT_FOG = '#f4ead8'

function FloatingPhoto({ url, position, rotation, size = 2.2 }) {
  const texture = useLoader(THREE.TextureLoader, url)
  const mesh = useRef(null)
  const mat = useRef(null)
  const t0 = useRef(performance.now())

  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
  }, [texture])

  const aspect = texture.image ? texture.image.width / texture.image.height : 1.5

  const scale = useMemo(() => {
    return aspect >= 1 ? [size, size / aspect, 1] : [size * aspect, size, 1]
  }, [aspect, size])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (mesh.current) {
      mesh.current.position.y = position[1] + Math.sin(t * 0.5 + position[0] * 2.3) * 0.4
      mesh.current.position.x = position[0] + Math.sin(t * 0.4 + position[2] * 1.7) * 0.35
      mesh.current.position.z = position[2] + Math.sin(t * 0.3 + position[1]) * 0.3
      mesh.current.rotation.y = rotation[1] + Math.sin(t * 0.45 + position[0] * 2.1) * 0.45
      mesh.current.rotation.z = rotation[2] + Math.sin(t * 0.33 + position[2] * 1.9) * 0.14
      mesh.current.rotation.x = Math.sin(t * 0.4 + position[1] * 2.5) * 0.22
    }
    if (mat.current) {
      const el = Math.min(1, (performance.now() - t0.current) / 1600)
      mat.current.opacity = 1 - Math.pow(1 - el, 3)
    }
  })

  return (
    <mesh ref={mesh} position={position} rotation={rotation} scale={scale}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial ref={mat} map={texture} toneMapped={false} transparent opacity={0} />
    </mesh>
  )
}

function Rig({ children }) {
  const { camera, pointer } = useThree()
  const look = useRef(new THREE.Vector3(0, 0, -5))

  useFrame(() => {
    camera.position.x += (pointer.x * 0.55 - camera.position.x) * 0.025
    camera.position.y += (-pointer.y * 0.4 + 0.15 - camera.position.y) * 0.025
    look.current.x += (-pointer.x * 0.35 - look.current.x) * 0.03
    look.current.y += (pointer.y * 0.2 - look.current.y) * 0.03
    camera.lookAt(look.current)
  })

  return <>{children}</>
}

function Particles({ count = 240, color = '#c9a96a' }) {
  const ref = useRef(null)
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 26
      arr[i * 3 + 1] = (Math.random() - 0.5) * 15
      arr[i * 3 + 2] = (Math.random() - 0.5) * 14 - 3
    }
    return arr
  }, [count])

  useFrame((state, delta) => {
    ref.current.rotation.y += delta * 0.012
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.05) * 0.05
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.045}
        color={color}
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

export default function HeroScene() {
  const { photos } = usePhotos()
  const featured = photos.filter((p) => p.featured).slice(0, 6)
  const base = import.meta.env.BASE_URL
  const [fog, setFog] = useState(DARK_FOG)

  useEffect(() => {
    const unsub = subscribeTheme((t) => {
      setFog(t === 'light' ? LIGHT_FOG : DARK_FOG)
    })
    return unsub
  }, [])

  const slots = [
    { pos: [-6.12, -0.12, -6.21], rot: [0, 0.18, -0.06], size: 1.9 },
    { pos: [-0.04, -2.67, -5.79], rot: [0, -0.08, 0.03], size: 1.7 },
    { pos: [5.37, -1.96, -5.5], rot: [0, -0.15, 0.04], size: 2.0 },
    { pos: [-1.93, 1.96, -5.83], rot: [0, 0.12, 0.05], size: 1.8 },
    { pos: [3.17, 3.59, -6.07], rot: [0, -0.1, -0.04], size: 1.9 },
    { pos: [6.27, 1.9, -4.84], rot: [0, 0.14, 0.03], size: 1.8 },
    { pos: [-3.25, -2.33, -5.53], rot: [0, 0.1, -0.03], size: 1.7 },
    { pos: [-6, 3.66, -5.13], rot: [0, -0.12, 0.04], size: 2.0 },
    { pos: [2.34, -0.42, -5.87], rot: [0, 0.06, -0.02], size: 1.9 },
  ]

  const layout = useMemo(() => {
    const extras = ['p34', 'p44', 'p08']
      .map((id) => photos.find((p) => p.id === id))
      .filter(Boolean)
    const list = [...featured, ...extras].slice(0, slots.length)
    return list.map((p, i) => ({
      url: base + p.url,
      position: slots[i].pos,
      rotation: slots[i].rot,
      size: slots[i].size,
      drift: slots[i].drift,
    }))
  }, [featured, photos, base])

  return (
    <div className="hero-canvas">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.15, 4.2], fov: 55, near: 0.1, far: 40 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        style={{ background: fog }}
      >
        <color attach="background" args={[fog]} />
        <fog attach="fog" args={[fog, 5, 15]} />
        <Suspense fallback={null}>
          <Rig>
            {layout.map((l) => (
              <FloatingPhoto key={l.url} {...l} />
            ))}
          </Rig>
        </Suspense>
        <Particles color={fog === LIGHT_FOG ? '#a8853d' : '#c9a96a'} />
      </Canvas>
    </div>
  )
}
