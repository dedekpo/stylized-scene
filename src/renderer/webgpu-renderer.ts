import { WebGPURenderer } from "three/webgpu";

type RendererProps = ConstructorParameters<typeof WebGPURenderer>[0];

export async function createWebGPURenderer(props: unknown) {
  const renderer = new WebGPURenderer(props as RendererProps);
  await renderer.init();
  return renderer;
}
