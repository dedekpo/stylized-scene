# stylized-scene

A stylized, Ghibli-inspired grass field rendered with React Three Fiber on a
WebGPU backend. The grass and foliage are shaded and animated entirely on the
GPU with Three.js' node material system (TSL): an instanced grass field, a tree
built from a trunk model and instanced canopy bushes, and a layered, directional
wind that bends everything in a travelling gust.

## Features

- **WebGPU + TSL** node materials throughout (no GLSL strings).
- **Instanced grass** with per-clump color variation, ground-color projection,
  translucency and a Fresnel rim.
- **Directional wind node** shared by the grass and the tree: a circular-arc
  bend driven by a travelling gust wave, breeze, chop and tip flutter. See
  [`src/materials/wind.ts`](src/materials/wind.ts).
- **Layered ground** material blending grass and dirt with a painted path mask.
- A live **controls panel** for tuning colors, wind and debug views.

## Running

```sh
npm install
npm run dev
```

Requires a **WebGPU-capable browser** (recent Chrome, Edge, or Safari).

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check and build for production
- `npm run lint` — run ESLint

## Layout

```
src/
  materials/   # TSL node materials (grass, ground, wind, normals)
  scene/       # R3F components (grass, ground, tree, scene root)
  ui/          # controls panel + state
  utils/       # geometry, texture and uniform helpers
  config/      # scene constants and asset paths
```

## License

[MIT](LICENSE) © Andre Elias
