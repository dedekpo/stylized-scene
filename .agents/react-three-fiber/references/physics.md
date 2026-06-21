# React Three Rapier

Physics integration for React Three Fiber using @react-three/rapier.

## Setup

```jsx
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier'

function App() {
  return (
    <Canvas>
      <Physics gravity={[0, -9.81, 0]} debug>
        <Scene />
      </Physics>
    </Canvas>
  )
}
```

### Physics Props

```jsx
<Physics
  gravity={[0, -9.81, 0]}
  timeStep={1/60}           // Fixed timestep
  timeStep="vary"           // Variable timestep
  paused={false}
  interpolate={true}        // Smooth rendering between physics steps
  colliders="hull"          // Default collider: "hull" | "cuboid" | "ball" | "trimesh" | false
  debug                     // Show debug wireframes
>
```

## RigidBody

```jsx
import { RigidBody } from '@react-three/rapier'

// Dynamic body (default)
<RigidBody>
  <mesh>
    <boxGeometry />
    <meshStandardMaterial />
  </mesh>
</RigidBody>

// Static body (ground, walls)
<RigidBody type="fixed">
  <mesh>
    <planeGeometry args={[100, 100]} />
  </mesh>
</RigidBody>

// Kinematic (moved programmatically)
<RigidBody type="kinematicPosition">
  <mesh ref={platformRef} />
</RigidBody>

// Full props
<RigidBody
  type="dynamic"              // "dynamic" | "fixed" | "kinematicPosition" | "kinematicVelocity"
  position={[0, 5, 0]}
  rotation={[0, 0, 0]}
  scale={1}
  colliders="cuboid"          // Auto collider from mesh
  mass={1}
  friction={0.5}
  restitution={0.3}           // Bounciness
  linearDamping={0}
  angularDamping={0}
  gravityScale={1}
  ccd                         // Continuous collision detection
  sensor                      // Trigger only, no physical response
  lockTranslations            // Freeze position
  lockRotations               // Freeze rotation
  enabledTranslations={[true, true, false]}  // Per-axis
  enabledRotations={[false, true, false]}
  onCollisionEnter={({ other }) => console.log('hit', other)}
  onCollisionExit={({ other }) => console.log('left', other)}
  onContactForce={({ totalForceMagnitude }) => {}}
>
```

## Colliders

```jsx
import {
  CuboidCollider,
  BallCollider,
  CapsuleCollider,
  CylinderCollider,
  ConeCollider,
  ConvexHullCollider,
  TrimeshCollider,
  HeightfieldCollider,
} from '@react-three/rapier'

// Explicit colliders (when auto-colliders aren't suitable)
<RigidBody colliders={false}>
  <mesh>
    <torusGeometry />
    <meshStandardMaterial />
  </mesh>
  {/* Approximate with capsule */}
  <CapsuleCollider args={[0.5, 0.3]} position={[0, 0, 0]} />
</RigidBody>

// Compound colliders
<RigidBody colliders={false}>
  <CuboidCollider args={[1, 0.5, 1]} position={[0, 0.5, 0]} />
  <CuboidCollider args={[0.5, 1, 0.5]} position={[0, 1.5, 0]} />
</RigidBody>

// Collider shapes
<CuboidCollider args={[halfWidth, halfHeight, halfDepth]} />
<BallCollider args={[radius]} />
<CapsuleCollider args={[halfHeight, radius]} />
<CylinderCollider args={[halfHeight, radius]} />
<ConeCollider args={[halfHeight, radius]} />

// Complex mesh collider (expensive)
<TrimeshCollider args={[vertices, indices]} />

// Convex hull (faster for complex shapes)
<ConvexHullCollider args={[points]} />

// Terrain
<HeightfieldCollider args={[width, height, heights, scale]} />
```

## Accessing Physics API

```jsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RigidBody, useRapier, RapierRigidBody } from '@react-three/rapier'

function PhysicsController() {
  const rigidBodyRef = useRef<RapierRigidBody>(null)
  
  useFrame(() => {
    if (rigidBodyRef.current) {
      // Apply forces
      rigidBodyRef.current.applyImpulse({ x: 0, y: 10, z: 0 }, true)
      rigidBodyRef.current.applyTorqueImpulse({ x: 0, y: 1, z: 0 }, true)
      
      // Set velocity directly
      rigidBodyRef.current.setLinvel({ x: 0, y: 5, z: 0 }, true)
      rigidBodyRef.current.setAngvel({ x: 0, y: 2, z: 0 }, true)
      
      // Get state
      const position = rigidBodyRef.current.translation()
      const rotation = rigidBodyRef.current.rotation()
      const linvel = rigidBodyRef.current.linvel()
    }
  })
  
  return (
    <RigidBody ref={rigidBodyRef}>
      <mesh>
        <boxGeometry />
        <meshStandardMaterial />
      </mesh>
    </RigidBody>
  )
}

// Access world
function WorldAccess() {
  const { world, rapier } = useRapier()
  
  // Raycast
  const ray = new rapier.Ray({ x: 0, y: 10, z: 0 }, { x: 0, y: -1, z: 0 })
  const hit = world.castRay(ray, 100, true)
  if (hit) {
    console.log('Hit at distance:', hit.timeOfImpact)
  }
}
```

## Character Controller

```jsx
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, useRapier } from '@react-three/rapier'
import { useKeyboardControls } from '@react-three/drei'

function Player() {
  const rigidBody = useRef()
  const [, getKeys] = useKeyboardControls()
  const { world, rapier } = useRapier()  // Hooks must be at component level

  useFrame((state, delta) => {
    const { forward, backward, left, right, jump } = getKeys()

    const impulse = { x: 0, y: 0, z: 0 }
    const speed = 5

    if (forward) impulse.z -= speed * delta
    if (backward) impulse.z += speed * delta
    if (left) impulse.x -= speed * delta
    if (right) impulse.x += speed * delta

    rigidBody.current?.applyImpulse(impulse, true)

    // Ground check for jumping
    const origin = rigidBody.current?.translation()
    if (origin) {
      origin.y -= 0.5
      const ray = new rapier.Ray(origin, { x: 0, y: -1, z: 0 })
      const hit = world.castRay(ray, 0.5, true)

      if (hit && jump) {
        rigidBody.current.applyImpulse({ x: 0, y: 5, z: 0 }, true)
      }
    }
  })
  
  return (
    <RigidBody 
      ref={rigidBody} 
      colliders={false}
      lockRotations
      linearDamping={0.5}
    >
      <CapsuleCollider args={[0.5, 0.3]} />
      <mesh>
        <capsuleGeometry args={[0.3, 1]} />
        <meshStandardMaterial />
      </mesh>
    </RigidBody>
  )
}
```

## Joints

```jsx
import {
  useSphericalJoint,
  useRevoluteJoint,
  useFixedJoint,
  usePrismaticJoint,
  useRopeJoint,
  useSpringJoint,
} from '@react-three/rapier'

function SwingingLight() {
  const anchor = useRef()
  const light = useRef()
  
  useSphericalJoint(anchor, light, [
    [0, 0, 0],   // Anchor point on body A
    [0, 2, 0],   // Anchor point on body B
  ])
  
  return (
    <>
      <RigidBody ref={anchor} type="fixed" position={[0, 5, 0]}>
        <mesh>
          <sphereGeometry args={[0.1]} />
        </mesh>
      </RigidBody>
      <RigidBody ref={light} position={[0, 3, 0]}>
        <mesh>
          <sphereGeometry args={[0.3]} />
        </mesh>
      </RigidBody>
    </>
  )
}

// Rope/chain
function Rope({ length = 10 }) {
  const refs = useRef([])
  
  // Create joints between segments
  for (let i = 1; i < length; i++) {
    useRopeJoint(refs.current[i - 1], refs.current[i], [
      [0, -0.5, 0],
      [0, 0.5, 0],
      0.1,  // Max distance
    ])
  }
  
  return (
    <>
      {Array.from({ length }).map((_, i) => (
        <RigidBody 
          key={i}
          ref={(el) => (refs.current[i] = el)}
          type={i === 0 ? 'fixed' : 'dynamic'}
          position={[0, 5 - i * 0.5, 0]}
        >
          <mesh>
            <sphereGeometry args={[0.2]} />
            <meshStandardMaterial />
          </mesh>
        </RigidBody>
      ))}
    </>
  )
}
```

## Collision Groups

```jsx
import { interactionGroups } from '@react-three/rapier'

// Group 0: Player, Group 1: Enemies, Group 2: Projectiles

// Player collides with enemies and ground
<RigidBody collisionGroups={interactionGroups(0, [1, 3])}>
  <PlayerMesh />
</RigidBody>

// Projectiles only hit enemies
<RigidBody collisionGroups={interactionGroups(2, [1])}>
  <BulletMesh />
</RigidBody>

// interactionGroups(memberOf, collidesWith)
// memberOf: which group this body belongs to (0-15)
// collidesWith: array of groups this body can collide with
```

## Sensors & Triggers

```jsx
import { useState } from 'react'
import { RigidBody, CuboidCollider } from '@react-three/rapier'
import * as THREE from 'three'

// Sensor doesn't cause physical response, only detects overlap
<RigidBody sensor onIntersectionEnter={onEnterZone} onIntersectionExit={onExitZone}>
  <CuboidCollider args={[5, 5, 5]} />
</RigidBody>

function Checkpoint() {
  const [triggered, setTriggered] = useState(false)
  
  return (
    <RigidBody 
      sensor
      onIntersectionEnter={() => setTriggered(true)}
    >
      <mesh>
        <ringGeometry args={[1, 1.2, 32]} />
        <meshBasicMaterial 
          color={triggered ? 'green' : 'yellow'} 
          side={THREE.DoubleSide} 
        />
      </mesh>
      <CuboidCollider args={[1, 2, 0.1]} />
    </RigidBody>
  )
}
```
