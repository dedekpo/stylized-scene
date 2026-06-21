# State Management Reference

State management patterns for React Three Fiber applications using Zustand.

## Why Zustand for R3F?

- **No React context overhead**: Direct store access in useFrame
- **Subscriptions**: Components only re-render when needed
- **Outside React**: Update state from anywhere (event handlers, workers)
- **Devtools**: Redux DevTools compatible
- **Tiny**: ~1KB minified

## Basic Setup

```javascript
import { create } from 'zustand'

const useStore = create((set, get) => ({
  // State
  count: 0,
  items: [],
  selected: null,

  // Actions
  increment: () => set((state) => ({ count: state.count + 1 })),
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  setSelected: (id) => set({ selected: id }),

  // Computed (using get)
  getSelectedItem: () => {
    const { items, selected } = get()
    return items.find(item => item.id === selected)
  }
}))
```

## Usage in Components

```jsx
function ScoreDisplay() {
  // Subscribe to specific value (re-renders only when count changes)
  const count = useStore((state) => state.count)
  return <Text>{count}</Text>
}

function Controls() {
  // Get action (no re-render on state change)
  const increment = useStore((state) => state.increment)
  return <button onClick={increment}>+1</button>
}

function GameLoop() {
  // Access store in useFrame without causing re-renders
  useFrame(() => {
    const { count, increment } = useStore.getState()
    if (someCondition) increment()
  })
  return null
}
```

## Game State Pattern

```javascript
const useGame = create((set, get) => ({
  // Game phases
  phase: 'menu', // menu, playing, paused, gameover

  // Player state
  health: 100,
  score: 0,
  position: [0, 0, 0],

  // Game objects
  enemies: [],
  projectiles: [],
  pickups: [],

  // Actions
  start: () => set({
    phase: 'playing',
    health: 100,
    score: 0,
    enemies: [],
    projectiles: []
  }),

  pause: () => set({ phase: 'paused' }),
  resume: () => set({ phase: 'playing' }),

  gameOver: () => set({ phase: 'gameover' }),

  // Player actions
  damage: (amount) => set((state) => {
    const newHealth = Math.max(0, state.health - amount)
    if (newHealth === 0) return { health: 0, phase: 'gameover' }
    return { health: newHealth }
  }),

  addScore: (points) => set((state) => ({
    score: state.score + points
  })),

  setPosition: (pos) => set({ position: pos }),

  // Enemy management
  spawnEnemy: (enemy) => set((state) => ({
    enemies: [...state.enemies, { ...enemy, id: Date.now() }]
  })),

  removeEnemy: (id) => set((state) => ({
    enemies: state.enemies.filter(e => e.id !== id)
  })),

  updateEnemies: (updater) => set((state) => ({
    enemies: state.enemies.map(updater)
  })),

  // Projectiles
  fireProjectile: (proj) => set((state) => ({
    projectiles: [...state.projectiles, { ...proj, id: Date.now() }]
  })),

  removeProjectile: (id) => set((state) => ({
    projectiles: state.projectiles.filter(p => p.id !== id)
  }))
}))
```

## Slices Pattern (Large Apps)

Split store into logical slices:

```javascript
// slices/player.js
export const createPlayerSlice = (set, get) => ({
  playerHealth: 100,
  playerPosition: [0, 0, 0],
  playerInventory: [],

  damagePlayer: (amount) => set((state) => ({
    playerHealth: Math.max(0, state.playerHealth - amount)
  })),

  movePlayer: (position) => set({ playerPosition: position }),

  addToInventory: (item) => set((state) => ({
    playerInventory: [...state.playerInventory, item]
  }))
})

// slices/enemies.js
export const createEnemiesSlice = (set, get) => ({
  enemies: [],

  spawnEnemy: (enemy) => set((state) => ({
    enemies: [...state.enemies, enemy]
  })),

  updateEnemies: (fn) => set((state) => ({
    enemies: state.enemies.map(fn).filter(Boolean)
  }))
})

// slices/ui.js
export const createUISlice = (set) => ({
  showInventory: false,
  showMap: false,

  toggleInventory: () => set((state) => ({
    showInventory: !state.showInventory
  })),

  toggleMap: () => set((state) => ({
    showMap: !state.showMap
  }))
})

// store.js
import { create } from 'zustand'
import { createPlayerSlice } from './slices/player'
import { createEnemiesSlice } from './slices/enemies'
import { createUISlice } from './slices/ui'

const useStore = create((...args) => ({
  ...createPlayerSlice(...args),
  ...createEnemiesSlice(...args),
  ...createUISlice(...args)
}))
```

## Persistence

Save and restore state:

```javascript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useStore = create(
  persist(
    (set, get) => ({
      settings: {
        volume: 1,
        quality: 'high',
        sensitivity: 0.5
      },

      setVolume: (v) => set((state) => ({
        settings: { ...state.settings, volume: v }
      })),

      setQuality: (q) => set((state) => ({
        settings: { ...state.settings, quality: q }
      }))
    }),
    {
      name: 'game-settings', // localStorage key
      partialize: (state) => ({ settings: state.settings }) // Only persist settings
    }
  )
)
```

## Subscriptions

React to state changes outside components:

```javascript
// Subscribe to specific state
const unsubscribe = useStore.subscribe(
  (state) => state.health,
  (health, previousHealth) => {
    if (health < previousHealth) {
      playSound('damage')
    }
    if (health === 0) {
      playSound('gameover')
    }
  }
)

// Subscribe to any change
const unsubscribe = useStore.subscribe((state) => {
  console.log('State changed:', state)
})

// Cleanup
unsubscribe()
```

## Performance Patterns

### Selective Subscriptions

```jsx
// Bad: Re-renders on ANY state change
function BadComponent() {
  const state = useStore() // Subscribes to everything
  return <mesh position={state.position} />
}

// Good: Re-renders only when position changes
function GoodComponent() {
  const position = useStore((state) => state.position)
  return <mesh position={position} />
}

// Good: Multiple selectors
function MultiSelect() {
  const position = useStore((s) => s.position)
  const rotation = useStore((s) => s.rotation)
  return <mesh position={position} rotation={rotation} />
}
```

### Shallow Equality for Objects

```jsx
import { shallow } from 'zustand/shallow'

// Without shallow: Re-renders even if values are same
function BadArraySelect() {
  const enemies = useStore((s) => s.enemies) // New array reference each time
}

// With shallow: Only re-renders if array contents change
function GoodArraySelect() {
  const enemies = useStore((s) => s.enemies, shallow)
}

// Multiple values with shallow
function MultiShallow() {
  const { x, y, z } = useStore(
    (s) => ({ x: s.position[0], y: s.position[1], z: s.position[2] }),
    shallow
  )
}
```

### useFrame Access

```jsx
function GameLogic() {
  // Don't use hooks in useFrame - access store directly
  useFrame((state, delta) => {
    // Direct access - no re-renders
    const { enemies, updateEnemies, playerPosition } = useStore.getState()

    // Update enemies
    updateEnemies((enemy) => ({
      ...enemy,
      position: moveToward(enemy.position, playerPosition, delta)
    }))
  })

  return null
}
```

## Integration with R3F

### Camera State

```javascript
const useCameraStore = create((set) => ({
  target: [0, 0, 0],
  distance: 10,

  setTarget: (target) => set({ target }),
  setDistance: (distance) => set({ distance }),
  zoom: (delta) => set((s) => ({
    distance: Math.max(5, Math.min(50, s.distance + delta))
  }))
}))

function Camera() {
  const target = useCameraStore((s) => s.target)
  const distance = useCameraStore((s) => s.distance)

  useFrame((state) => {
    state.camera.position.lerp(
      new THREE.Vector3(target[0], target[1] + 5, target[2] + distance),
      0.1
    )
    state.camera.lookAt(...target)
  })

  return null
}
```

### Selection State

```javascript
const useSelection = create((set) => ({
  selected: null,
  hovered: null,

  select: (id) => set({ selected: id }),
  hover: (id) => set({ hovered: id }),
  clear: () => set({ selected: null, hovered: null })
}))

function SelectableObject({ id, children }) {
  const selected = useSelection((s) => s.selected === id)
  const hovered = useSelection((s) => s.hovered === id)
  const { select, hover } = useSelection()

  return (
    <group
      onClick={() => select(id)}
      onPointerOver={() => hover(id)}
      onPointerOut={() => hover(null)}
    >
      {children}
      {selected && <SelectionIndicator />}
      {hovered && <HoverIndicator />}
    </group>
  )
}
```

## DevTools

```javascript
import { devtools } from 'zustand/middleware'

const useStore = create(
  devtools(
    (set) => ({
      count: 0,
      increment: () => set(
        (state) => ({ count: state.count + 1 }),
        false,
        'increment' // Action name for devtools
      )
    }),
    { name: 'GameStore' }
  )
)
```

## Best Practices

1. **Keep state minimal**: Only store what you need
2. **Normalize data**: Use IDs and lookups for collections
3. **Colocate related state**: Group related values together
4. **Actions in store**: Keep logic in store, not components
5. **Use selectors**: Subscribe to specific values only
6. **Direct access in useFrame**: Use getState() in animation loops
