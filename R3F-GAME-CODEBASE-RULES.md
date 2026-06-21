# R3F Game Codebase Rules

Reusable architecture rules for games built with React Three Fiber + Koota ECS + Rapier physics. Drop this file into any new project and feed it to the AI before implementing or reviewing features.

**Tech stack assumed:**

- **React Three Fiber** for rendering
- **Koota** for ECS (entities, traits, queries, relations, actions)
- **Rapier** for physics — prefer headless WASM (`@dimforge/rapier3d-compat`) for server-authoritative multiplayer; `@react-three/rapier` is acceptable for single-player projects
- **TypeScript** throughout

**Core principles:** Full ECS via Koota. **Data-driven simulation. Event-driven side effects.** KISS. DRY. Reusable functions. Systems own domains.

---

## Rule 1: Koota Is the Single Source of Truth — Not Zustand, Not Refs

**The problem:** State fragmented across manual `world` objects, Zustand stores, and scattered refs. Systems iterate with `for (const id in world.things)` loops that don't scale.

**The rule:** All game state lives in koota traits on entities. Zustand is only used for pure UI state that has nothing to do with the game world (menu open/closed, settings). Never store game state in Zustand.

```ts
import { trait, createWorld } from "koota";

// Traits define data
const Position = trait({ x: 0, y: 0, z: 0 });
const Velocity = trait({ vx: 0, vy: 0, vz: 0 });
const Health = trait({ current: 100, max: 100 });
const IsPlayer = trait();
const IsEnemy = trait();

// World is the container
const world = createWorld();

// Entities compose traits
const player = world.spawn(
  Position({ x: 100, y: 0, z: 50 }),
  Velocity,
  Health,
  IsPlayer
);
```

**Querying replaces for-loops:**

```ts
// BAD — manual iteration, O(n) lookup, no archetype optimization
for (const id in world.entities) {
  const e = world.entities[id];
  e.position.x += e.velocity.vx * delta;
}

// GOOD — koota query with archetype-based iteration
world.query(Position, Velocity).updateEach(([pos, vel]) => {
  pos.x += vel.vx * delta;
  pos.z += vel.vz * delta;
});
```

---

## Rule 2: Data-Driven Simulation, Event-Driven Side Effects

**The rule:** Continuous gameplay runs on traits + systems. One-shot facts and cross-domain side effects flow through typed events.

**Use systems for continuous simulation:**

- movement, physics integration, transform sync
- animation blending, interpolation
- AI ticking, pathfinding
- resource ticking (hunger, stamina, cooldowns)
- camera follow

**Use events for one-shot facts and cross-domain communication:**

- damage happened, entity died
- item picked up, inventory changed
- sound requested, VFX requested
- UI prompt changed
- network message queued
- save requested
- achievement / progression triggered

**Do not force everything through events.** Replaying damage events every frame to compute current health is harder to trace than a `Health` trait that a `combatSystem` decrements. The rule is:

> **State says "this is true now." Events say "this just happened."**

```ts
// State — Health is the truth at any moment
target.set(Health, (h) => ({ current: h.current - dmg }));

// Event — record the fact that a hit occurred for sound, UI, telemetry
world.spawn(
  DamageDealtEvent({ target: targetEntity, amount: dmg, source: attacker })
);
```

See Rule 12 for typed events, Rule 13 for lifetimes, Rule 14 for the intent-vs-effect boundary.

---

## Rule 3: Never Subscribe to Zustand at the Component Level for Frame-Loop Data

**The rule:** If data is read inside `useFrame`, read it with `store.getState()` inside useFrame, not with the hook at the top of the component. This prevents re-renders at 60fps.

```ts
// BAD - re-renders component 60x/sec
function CameraController() {
  const { rotation } = useCameraStore();
  useFrame(() => rotateCamera(rotation));
}

// GOOD - zero re-renders
function CameraController() {
  useFrame(() => {
    const { rotation } = useCameraStore.getState();
    rotateCamera(rotation);
  });
}
```

**When you DO want the subscription:** UI components (inventory panel, health display) that need to re-render. Use selectors with `shallow`:

```ts
import { shallow } from "zustand/shallow";
const hp = usePlayerStore((s) => s.hp, shallow);
```

**With koota:** Prefer `useTrait` from `koota/react` for entity data in React components — it handles change detection automatically:

```ts
import { useTrait } from "koota/react";
function HealthBar({ entity }) {
  const health = useTrait(entity, Health); // re-renders only when Health changes
  return <div style={{ width: `${(health.current / health.max) * 100}%` }} />;
}
```

---

## Rule 4: Components Are Thin Wrappers — Systems Own All Logic

**The problem:** Components containing game logic as closures, `useFrame` calls for physics/movement, and collision handlers with inline logic.

**The rule:** Components do exactly two things:

1. Render JSX (mesh, geometry, material)
2. Sync entity refs via `useEffect`

**No game logic. No `useFrame`. No state reads beyond what the view needs.**

```ts
// CORRECT — thin wrapper, koota entity drives everything
function PlayerView({ entity }: { entity: Entity }) {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    // Sync the Three.js ref to the entity as an AoS trait
    entity.add(SceneRef(() => groupRef));
    return () => entity.remove(SceneRef);
  }, [entity]);

  return (
    <group ref={groupRef}>
      <CharacterModel />
    </group>
  );
}

// WRONG — game logic in component
function PlayerView({ entity }: { entity: Entity }) {
  useFrame((_, delta) => {
    // This belongs in a system
    const pos = entity.get(Position);
    groupRef.current.position.set(pos.x, pos.y, pos.z);
  });
}
```

Systems are pure functions that query the world and mutate traits:

```ts
// systems/movement.ts
export function movementSystem(world: World, delta: number) {
  world.query(Position, Velocity).updateEach(([pos, vel]) => {
    pos.x += vel.vx * delta;
    pos.z += vel.vz * delta;
  });
}
```

---

## Rule 5: One useFrame Orchestrator — Never in Components

**The rule:** `useFrame` exists in exactly one place: `GameLoop.tsx`. It calls all systems in a defined, explicit order. The event-drain phases sit alongside the simulation phases — order is part of game behavior.

```ts
// systems/game-loop.tsx — the ONLY file with useFrame
export default function GameLoopSystem() {
  const accum = useRef(0);
  const TICK = 1 / 60;

  useFrame((_, delta) => {
    accum.current += delta;
    while (accum.current >= TICK) {
      accum.current -= TICK;

      // Fixed-rate systems — deterministic, order matters
      inputSystem(world, TICK);
      movementSystem(world, TICK); // writes desired Velocity
      physicsStepSystem(world, TICK); // steps Rapier, runs character controller
      syncPhysicsSystem(world); // Rapier → Position traits
      combatSystem(world, TICK); // may emit damage events
      aiSystem(world, TICK);
      timerSystem(world, TICK);

      // Event drain phases — one-shot events consumed exactly here
      gameplayEventPhase(world); // damage, pickup, death (state mutations)
      networkOutboxPhase(world); // queued outbound messages
    }

    // Variable-rate systems — visual only
    syncTransformSystem(world); // Position → three.js refs
    animationSystem(world, delta);

    // Variable-rate event bridges — adapters do their effects here
    audioBridgePhase(world); // consumes SoundRequested
    vfxBridgePhase(world); // consumes VfxRequested
    uiBridgePhase(world); // consumes UiPromptChanged
  });

  return null;
}
```

**If you are tempted to add `useFrame` to a component, stop.** Extract the logic to a system and call it from GameLoop.

---

## Rule 6: Replace setTimeout with Frame-Based Timers

**The rule:** Use a `Timer` trait ticked by a `timerSystem`, not `setTimeout`. This respects pause, is deterministic (crucial for multiplayer), and never fires on destroyed entities.

```ts
const Timer = trait({ remaining: 0, action: "" });

// systems/timer.ts
export function timerSystem(world: World, delta: number) {
  world.query(Timer).updateEach(([timer], entity) => {
    timer.remaining -= delta;
    if (timer.remaining <= 0) {
      handleTimerExpired(entity, timer.action);
      entity.remove(Timer);
    }
  });
}

// Usage — add timer trait to entity
entity.add(Timer({ remaining: 2.0, action: "respawn" }));
```

---

## Rule 7: Bridge ECS State to UI via Koota React Hooks

**For per-entity visual state (HP bars, stamina bars):** Use `useTrait` from `koota/react` — it re-renders only when the trait changes.

```ts
import { useTrait } from "koota/react";

function HealthBar({ entity }: { entity: Entity }) {
  const health = useTrait(entity, Health);
  if (!health) return null;
  const ratio = health.current / health.max;
  return <div className="health-bar" style={{ width: `${ratio * 100}%` }} />;
}
```

**For bulk UI that React owns (scoreboard, chat):** Push snapshots to Zustand at a throttled rate (10Hz max), never from the fixed tick loop.

**For one-time events (death, level up, achievement):** Emit a typed event entity (see Rule 12). A UI bridge phase consumes it and dispatches a toast/animation.

---

## Rule 8: Use Actions for All State Mutations — Keep Them Reusable

**The problem:** Logic inlined at the call site — the same damage calculation appears in 3 different systems. No reuse.

**The rule:** Every state mutation is an action. Actions are pure functions that take the world and parameters, and mutate traits. They are reusable from any call site — systems, event handlers, network message processors.

```ts
// actions/combat.ts
export function dealDamage(
  attacker: Entity,
  target: Entity,
  baseDamage: number
) {
  const armor = target.get(Defense)?.armor ?? 0;
  const finalDamage = calculateDamage(baseDamage, armor);

  target.set(Health, (h) => ({
    current: Math.max(0, h.current - finalDamage),
  }));

  if (target.get(Health)!.current <= 0) {
    target.add(IsDead);
  }
}

// actions/spawn.ts
export function spawnEnemy(world: World, x: number, z: number) {
  return world.spawn(
    Position({ x, y: 0, z }),
    Velocity,
    Health({ current: 50, max: 50 }),
    IsEnemy,
    AIController({ state: "patrol" })
  );
}

// actions/equipment.ts
export function equipItem(entity: Entity, item: Entity) {
  const slot = item.get(ItemSlot)?.slot;
  if (!slot) return;
  entity.add(Equipped(item)); // relation
  applyStatModifiers(entity, item);
}
```

**Rule of thumb:** If you're about to write more than 2 lines of mutation logic inline in a system, extract it to an action.

---

## Rule 9: Systems Own Their Domain — No Overlap

Each system has exclusive ownership of specific traits. When two systems could both write the same field, assign it to exactly one and have the other defer.

| System                | Owns                                                                    |
| --------------------- | ----------------------------------------------------------------------- |
| `inputSystem`         | Reads input devices, writes `InputState` trait                          |
| `movementSystem`      | Computes desired `Velocity` from input + camera direction               |
| `physicsStepSystem`   | Steps the Rapier world, runs character controller with desired velocity |
| `syncPhysicsSystem`   | Copies Rapier rigid body positions back to `Position` traits            |
| `combatSystem`        | `AttackState`, hit detection, emits damage events                       |
| `projectileSystem`    | Projectile `Position`, lifetime, collision                              |
| `aiSystem`            | `AIController` state transitions, pathfinding                           |
| `timerSystem`         | Drains `Timer` traits, dispatches scheduled actions                     |
| `syncTransformSystem` | Copies `Position`/`Rotation` traits to Three.js refs                    |
| `animationSystem`     | Three.js `AnimationAction` crossfades                                   |
| `audioBridgeSystem`   | Consumes `SoundRequested` events, calls audio API                       |
| `vfxBridgeSystem`     | Consumes `VfxRequested` events, drives particle pool                    |

Add genre-specific systems as needed (`climbingSystem`, `stealthSystem`, `constructionSystem`, `chunkLoadingSystem`, …). The rule is unchanged: one trait, one owner. `combatSystem` never writes `Position`; `movementSystem` never writes `Health`.

---

## Rule 10: Entity Lifecycle via Koota — Not Zustand ID Lists

**The old way:** Zustand held `enemyIds[]`, React rendered from the list, world object held state separately.

**The new way:** Koota manages the full lifecycle. Queries replace ID lists. React components observe the world.

```ts
// Spawning
const enemy = world.spawn(
  Position({ x: 10, y: 0, z: 20 }),
  Health,
  IsEnemy,
  AIController
);

// Despawning
enemy.destroy(); // koota handles cleanup, queries update automatically

// React rendering — use useQuery from koota/react
function EnemyRenderer() {
  const enemies = useQuery(IsEnemy, Position);
  return enemies.map((entity) => <EnemyView key={entity} entity={entity} />);
}
```

No manual ID list synchronization. No `delete world.enemies[id]` + `set(state => ...)` two-step.

---

## Rule 11: Collision Handlers Dispatch Events, Not Logic

**The rule:** Collision callbacks only record what happened as a typed event entity. Systems process events in the gameplay event drain phase next tick.

```ts
// Event trait
const CollisionEvent = trait({ kind: 'hit' as 'hit' | 'pickup' | 'trigger', other: 0 as Entity, data: 0 })

// In a component — just spawn the event, no game logic
onCollisionEnter={(other) => {
  world.spawn(CollisionEvent({ kind: 'hit', other: other.entity, data: 10 }))
}}

// In a system — process and destroy event entities
export function collisionProcessingSystem(world: World) {
  world.query(CollisionEvent).updateEach(([ev], entity) => {
    if (ev.kind === 'hit') dealDamage(ev.other, /* attacker */ entity, ev.data)
    if (ev.kind === 'pickup') pickupItem(ev.other, entity)
    entity.destroy()
  })
}
```

This is the canonical event pattern — see Rule 12 (typed shapes) and Rule 13 (drain lifetime) for the broader principles.

---

## Rule 12: Events Are Typed Facts — Not String Bags

**The rule:** Every event has a named, typed shape. No `{ type: string; data: any }`. Use one trait per event kind, or a discriminated-union trait keyed by a literal field.

```ts
// GOOD — one trait per event kind, fields are typed
const DamageDealtEvent = trait({
  target: 0 as Entity,
  source: 0 as Entity,
  amount: 0,
  kind: "melee" as "melee" | "ranged" | "fall",
});
const EntityDiedEvent = trait({
  entity: 0 as Entity,
  cause: "combat" as "combat" | "fall" | "starvation",
});
const SoundRequested = trait({
  soundId: "" as SoundId,
  x: 0,
  y: 0,
  z: 0,
  volume: 1,
});
const VfxRequested = trait({ vfxId: "" as VfxId, x: 0, y: 0, z: 0 });
const UiPromptChanged = trait({ promptId: "" as PromptId, visible: false });

// BAD — untyped payload, payload shape drifts over time
const GameEvent = trait({
  type: "" as string,
  data: {} as Record<string, unknown>,
});
```

**Spawning an event is the emit:**

```ts
world.spawn(
  SoundRequested({
    soundId: "sword_hit",
    x: pos.x,
    y: pos.y,
    z: pos.z,
    volume: 0.8,
  })
);
```

Reserve strings for discriminants (`kind`, `cause`), never for the payload itself.

---

## Rule 13: Events Must Have a Clear Lifetime

**The rule:** For every event trait, you must be able to answer:

1. **Who emits it?** (which system / action / collision handler)
2. **Who consumes it?** (which drain phase or bridge system)
3. **When is it drained?** (exactly one game-loop phase, called by `GameLoop.tsx`)
4. **One-shot or retained?** (almost always one-shot — destroy after processing)
5. **What happens if there is no consumer?** (event leaks → memory grows → bug)

```ts
// systems/gameplay-event-phase.ts
// Drains gameplay-mutating events. Runs once per fixed tick, AFTER systems that emit them.
// Emitters: combatSystem, collisionProcessingSystem, pickupActions
// Consumers: this phase + the koota traits it mutates
export function gameplayEventPhase(world: World) {
  world.query(DamageDealtEvent).updateEach(([ev], entity) => {
    const hp = ev.target.get(Health);
    if (!hp) return entity.destroy();
    ev.target.set(Health, { current: Math.max(0, hp.current - ev.amount) });
    if (ev.target.get(Health)!.current <= 0)
      world.spawn(EntityDiedEvent({ entity: ev.target, cause: "combat" }));
    entity.destroy();
  });

  world.query(EntityDiedEvent).updateEach(([ev], entity) => {
    ev.entity.add(IsDead);
    world.spawn(
      SoundRequested({ soundId: "death", x: 0, y: 0, z: 0, volume: 1 })
    );
    entity.destroy();
  });
}
```

**Drain phases live in `GameLoop.tsx` and run in a known order.** Do not consume events from arbitrary systems — order is part of the game's behavior.

---

## Rule 14: Core Emits Intent — Adapters Perform Effects

**The rule:** Core systems may emit intent events. They may **not** directly call audio, particle, network, storage, or DOM APIs. Bridge systems (`features/audio`, `features/vfx`, `features/networking`) consume events and perform the effect.

**Core may emit:**

- `SoundRequested`, `MusicChangeRequested`
- `VfxRequested`, `CameraShakeRequested`
- `NetworkMessageQueued`
- `UiPromptChanged`, `ToastRequested`
- `SaveRequested`, `AnalyticsEventRecorded`

**Core may not call:**

- audio playback (`new Audio()`, Howler, Web Audio)
- particle / sprite spawning directly on the scene graph
- React state setters
- `fetch`, websocket sends, network clients
- `localStorage`, IndexedDB
- `window`, `document`, browser-only globals

```ts
// systems/combat.ts — core, headless
export function combatSystem(world: World, delta: number) {
  world.query(AttackState, Position).updateEach(([attack, pos]) => {
    if (!attack.didHit) return;
    world.spawn(
      SoundRequested({
        soundId: "sword_hit",
        x: pos.x,
        y: pos.y,
        z: pos.z,
        volume: 1,
      })
    );
    world.spawn(
      VfxRequested({ vfxId: "hit_spark", x: pos.x, y: pos.y, z: pos.z })
    );
    attack.didHit = false;
  });
}

// features/audio/audio-bridge.ts — view-layer adapter, owns the Howler instance
export function audioBridgePhase(world: World) {
  world.query(SoundRequested).updateEach(([req], entity) => {
    howlerEngine.play(req.soundId, {
      x: req.x,
      y: req.y,
      z: req.z,
      volume: req.volume,
    });
    entity.destroy();
  });
}
```

This is what keeps core headless (Rule 22). Bridges are the only place the outside world is touched.

---

## Rule 15: Model Entity Phases as Tag Traits — Not Flat Flags

**The problem:** Flat boolean flags (`isDead`, `isStunned`, `isPushed`) with growing skip-checks in every system.

**The rule:** Use mutually exclusive tag traits for entity phases. Systems filter by the presence/absence of these tags.

```ts
// Phase tags — mutually exclusive
const PhaseIdle = trait();
const PhaseMoving = trait();
const PhaseCombat = trait();
const PhaseStunned = trait();
const PhaseDead = trait();

// Data for phase-specific state
const StunData = trait({ remaining: 0 });

// Systems filter naturally
export function movementSystem(world: World, delta: number) {
  // Only moves entities that are in the moving phase
  world.query(PhaseMoving, Position, Velocity).updateEach(([pos, vel]) => {
    pos.x += vel.vx * delta;
    pos.z += vel.vz * delta;
  });
}

// Phase transitions via actions
export function stunEntity(entity: Entity, duration: number) {
  clearPhase(entity);
  entity.add(PhaseStunned, StunData({ remaining: duration }));
}
```

---

## Rule 16: All Game Constants Live in game-config.ts

**The rule:** Every tunable constant belongs in `src/data/game-config.ts` under a single `GAME_CONFIG` object, grouped by domain, with `CAPS_SNAKE_CASE` keys. No magic numbers in systems, components, or trait initializers.

```ts
export const GAME_CONFIG = {
  WORLD: {
    SEED: 42,
    CHUNK_SIZE: 64,
    RENDER_DISTANCE: 3,
  },
  CHARACTER: {
    MOVE_SPEED: 5.0,
    TURN_RATE_RAD_PER_SEC: 8,
    JUMP_IMPULSE: 6.5,
  },
  COMBAT: {
    BASE_DAMAGE: 25,
    ATTACK_COOLDOWN: 0.6,
    CRIT_MULTIPLIER: 1.5,
  },
  CAMERA: {
    DEFAULT_HEIGHT: 15,
    MIN_ZOOM: 8,
    MAX_ZOOM: 25,
    ROTATION_SPEED: 2.0,
  },
};
```

```ts
// BAD — magic number
if (dist < 3.0) detectPlayer();

// GOOD — single source of truth
if (dist < GAME_CONFIG.CHARACTER.STEALTH_DETECTION_RADIUS) detectPlayer();
```

---

## Rule 17: Visual Effects Use Object Pooling — Never Zustand

**The rule:** Visual effects (floating damage numbers, arrow trails, impact sparks) that fire multiple times per second use a fixed-size pool as a koota trait array. Components pre-mount all pool slots. A render system drives visibility and transforms directly on refs.

```ts
// Trait for pooled effects
const FloatingText = trait({
  active: false,
  text: "",
  x: 0,
  y: 0,
  z: 0,
  progress: 0,
});

// Pre-spawn pool at startup
for (let i = 0; i < 20; i++) {
  world.spawn(FloatingText);
}

// Action to activate a slot
export function spawnFloatingText(
  world: World,
  text: string,
  x: number,
  y: number,
  z: number
) {
  const slot = world.queryFirst(FloatingText, Not(IsActive));
  if (!slot) return; // pool full
  slot.set(FloatingText, { active: true, text, x, y, z, progress: 0 });
  slot.add(IsActive);
}

// System drives animation
export function floatingTextSystem(world: World, delta: number) {
  world.query(IsActive, FloatingText).updateEach(([ft], entity) => {
    ft.progress += delta / 1.0;
    ft.y += delta * 2;
    if (ft.progress >= 1) {
      ft.active = false;
      entity.remove(IsActive);
    }
  });
}
```

**When NOT to pool (Zustand/React state is fine):** Round start/end UI, score updates, menu interactions — anything event-driven and infrequent.

---

## Rule 18: Procedural Generation Must Be Deterministic and Seed-Based

**The rule:** Every procedural generation function takes the world seed (or a derived sub-seed) as input and produces identical output for identical input. No `Math.random()` in gameplay — use a seeded PRNG.

```ts
// BAD — non-deterministic, breaks multiplayer
const treeX = Math.random() * chunkSize;

// GOOD — deterministic, every client generates the same world
const rng = createSeededRNG(GAME_CONFIG.WORLD.SEED, chunkX, chunkZ);
const treeX = rng.next() * chunkSize;
```

`Math.random()` is acceptable only for cosmetic effects that never affect gameplay, networking, saves, or replays — and even then prefer a named helper like `randomCosmetic()`.

This rule is non-negotiable for multiplayer. If two clients generate different terrain, the game is broken.

---

## Rule 19: Write Reusable Functions — No Inline Duplication

**The problem:** AI-generated code inlines the same logic repeatedly instead of extracting functions. Distance calculations, position lookups, and damage formulas get copy-pasted across systems.

**The rule:** If a piece of logic appears (or could appear) in more than one place, extract it to a named function immediately. Don't wait for the third occurrence.

```ts
// BAD — same calculation inlined in 4 systems
const dx = pos1.x - pos2.x;
const dz = pos1.z - pos2.z;
const dist = Math.sqrt(dx * dx + dz * dz);

// GOOD — one function, used everywhere
export function distance2D(
  a: { x: number; z: number },
  b: { x: number; z: number }
): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

// GOOD — reusable predicate
export function isInRange(a: Entity, b: Entity, range: number): boolean {
  const posA = a.get(Position);
  const posB = b.get(Position);
  if (!posA || !posB) return false;
  return distance2D(posA, posB) <= range;
}
```

This applies to:

- Math utilities (distance, lerp, clamp, normalize, approachAngle)
- Entity queries (findNearestEnemy, getEquippedWeapon)
- State transitions (clearPhase, enterCombat)
- Validation (canAttack, canBuild, canClimb)

---

## Rule 20: Relations for Entity Graphs

**The rule:** Use koota relations to model ownership, hierarchy, targeting, and containment — not string IDs stored in traits.

```ts
import { relation } from "koota";

const ChildOf = relation({ autoDestroy: "orphan" }); // child → parent
const Equipped = relation(); // item → wearer
const Targeting = relation({ exclusive: true }); // entity → its current target
const Contains = relation({ store: { amount: 0 } }); // container → item with quantity

// Build hierarchy
const parent = world.spawn(IsContainer, Position);
const child = world.spawn(IsItem, Position, ChildOf(parent));

// Query: all items equipped by player
const items = player.targetsFor(Equipped);

// Query: who is targeting this entity?
const attackers = world.query(Targeting(enemy));
```

---

## Rule 21: Name Every Data Shape — No Inline Object Types

**The rule:** Every reusable object shape must be a named interface or use koota's `TraitRecord` type, not inline type annotations.

```ts
// BAD — inline shapes
function update(x: { a: number; b: number; c: number }) {}

// GOOD — named via TraitRecord
const Position = trait({ x: 0, y: 0, z: 0 })
type PositionData = TraitRecord<typeof Position>

export function distance2D(a: PositionData, b: PositionData): number { ... }
```

Inline shapes are fine only for tiny, local code that has no domain meaning.

---

## Rule 22: Separate Core from View

**The rule:** Core logic (traits, systems, actions, world, physics) is pure TypeScript with zero React/R3F imports. The view layer reads from the world and mutates via actions.

```
src/
  core/                 # Pure TypeScript — NO React imports
    traits/             # All trait definitions
    systems/            # All systems (pure functions)
    actions/            # All state mutation actions
    events/             # Event trait definitions and drain phases
    physics/            # Rapier world, collider factories, character controller wrapper
    world.ts            # Koota world creation + seed config
  data/
    game-config.ts      # All tunable constants
  features/             # View layer — React + R3F
    player/
    enemies/
    audio/              # audio bridge (consumes SoundRequested)
    vfx/                # vfx bridge (consumes VfxRequested)
    ui/
  app/
    game-loop.tsx       # The ONE useFrame orchestrator
    providers.tsx       # KeyboardControls, Canvas, Physics, etc.
```

This separation means:

- Systems can run headless (server, worker, tests)
- Views can be swapped (2D debug view, 3D game view)
- Core logic is testable without React

---

## Rule 23: Rapier Handles Physics World — ECS Systems Drive Game Logic

**The rule:** Use Rapier for collision detection, ray-casting, shape-casting, and the kinematic character controller. Custom ECS systems compute desired movement; Rapier resolves collisions and provides the final position.

**Headless vs react-three/rapier:** For server-authoritative multiplayer, prefer `@dimforge/rapier3d-compat` (headless WASM) so the same physics code runs on the server. For single-player projects, `@react-three/rapier` is fine and reduces boilerplate.

**How it works:**

- **One Rapier `World` instance** — created at init, stepped each fixed tick by `physicsStepSystem`
- **Colliders are domain-scoped** — chunk loads create terrain heightfield + rock trimesh + tree capsule colliders; chunk unloads destroy them
- **Player uses `KinematicCharacterController`** — `movementSystem` computes desired velocity, `physicsStepSystem` calls `controller.computeColliderMovement()`, `syncPhysicsSystem` writes the corrected position back to the `Position` trait
- **Custom state machines on top** — climbing, paragliding, swimming bypass the default character controller and use Rapier ray-casts/shape-casts directly
- **Rapier is never imported in the view layer** — all Rapier access lives in `src/core/physics/`

```ts
// core/physics/physics-world.ts — singleton, headless
import RAPIER from "@dimforge/rapier3d-compat";

let rapierWorld: RAPIER.World;
let characterController: RAPIER.KinematicCharacterController;

export async function initPhysics() {
  await RAPIER.init();
  rapierWorld = new RAPIER.World({ x: 0, y: -9.81 * 4, z: 0 });
  characterController = rapierWorld.createCharacterController(0.01);
  characterController.enableSnapToGround(0.5);
  characterController.setMaxSlopeClimbAngle(Math.PI * 0.35);
  characterController.enableAutostep(0.7, 0.3, false);
}

// core/systems/physics-step-system.ts
export function physicsStepSystem(world: World, delta: number) {
  world.query(IsPlayer, Velocity, RapierBodyRef).readEach(([vel, bodyRef]) => {
    const desired = { x: vel.vx * delta, y: vel.vy * delta, z: vel.vz * delta };
    characterController.computeColliderMovement(bodyRef.collider, desired);
    const corrected = characterController.computedMovement();
    const pos = bodyRef.body.translation();
    bodyRef.body.setNextKinematicTranslation({
      x: pos.x + corrected.x,
      y: pos.y + corrected.y,
      z: pos.z + corrected.z,
    });
  });
  rapierWorld.step();
}
```

**Common collider choices:**

| Object                          | Collider                                           | Notes                                               |
| ------------------------------- | -------------------------------------------------- | --------------------------------------------------- |
| Terrain                         | `HeightfieldCollider` per chunk                    | Built from chunk `heights` Float32Array             |
| Static mesh props               | `TrimeshCollider` per instance                     | Use the actual mesh geometry for accurate collision |
| Vertical props (trees, pillars) | `CapsuleCollider`                                  | Simple and cheap                                    |
| Player                          | `CapsuleCollider` + `KinematicCharacterController` | Kinematic body, not dynamic                         |
| Dynamic props                   | `CuboidCollider` / `BallCollider` on dynamic body  | Let Rapier integrate them                           |

---

## Extra Rules

1. Files use kebab-case: `player-view.tsx`, `movement-system.ts`
2. Avoid `if {} else {}` — use early returns and guard clauses
3. Use `updateEach` / `readEach` over `for...of` + `entity.get()` for data-bearing queries
4. Never use `Math.random()` in game logic — always seeded PRNG
5. Every system receives `world` as first argument — no module-level world imports inside systems
6. Booleans read like questions: `isGrounded`, `hasLineOfSight`, `canPlace`, `shouldRespawn`
7. Names are domain-specific: `startAttack`, `enterClimbing`, `consumeFood` — not `handleThing`, `doAction`, `manager`
8. Split files when they cross ~300–500 lines, or when multiple domains share the file
9. `any` is a boundary tool only — contain it in a tiny adapter and convert to a named type before it enters core
10. Validate external data (network, save files, URL params, local storage) at the boundary

---

## Extending This Document

When adding a new rule:

1. Use the next available rule number — never renumber existing rules (other docs and code comments may reference them)
2. Lead with **The problem** (one paragraph) → **The rule** (one or two sentences) → at least one code example showing BAD vs GOOD
3. Prefer code examples over prose. The shape of the code is the rule
4. Cross-reference related rules by number (`see Rule 12`) instead of duplicating content
5. If a rule turns out to be wrong or superseded, mark it as deprecated in place rather than deleting it
6. The Extra Rules section is for one-liners that don't need a full code example
