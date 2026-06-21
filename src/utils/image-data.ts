import { useMemo } from "react";
import type { Texture } from "three";

export function extractImageData(texture: Texture): ImageData | null {
  const img = texture.image as HTMLImageElement | undefined;
  if (!img || !img.width) return null;
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, img.width, img.height);
}

export function useTextureImageData(texture: Texture): ImageData | null {
  return useMemo(() => extractImageData(texture), [texture]);
}

type WrapMode = "clamp" | "repeat";

export function sampleImageData(
  data: ImageData,
  u: number,
  v: number,
  wrap: WrapMode = "clamp"
): number {
  let uu = u;
  let vv = v;
  if (wrap === "repeat") {
    uu = ((u % 1) + 1) % 1;
    vv = ((v % 1) + 1) % 1;
  }
  let px = Math.floor(uu * data.width);
  let py = Math.floor(vv * data.height);
  if (wrap === "clamp") {
    px = Math.max(0, Math.min(data.width - 1, px));
    py = Math.max(0, Math.min(data.height - 1, py));
  }
  const idx = (py * data.width + px) * 4;
  return data.data[idx] / 255;
}
