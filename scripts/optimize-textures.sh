#!/usr/bin/env bash
#
# optimize-textures.sh
#
# Converts the project's PNG textures to web-optimized WebP, downscaling the
# 4K PBR maps to 1K. Color/albedo maps use lossy WebP (visually lossless at
# high quality, big savings); data maps (normal/roughness/AO/height/metallic)
# and the noise/mask maps use near-lossless/lossless WebP so lighting math
# doesn't pick up compression artifacts.
#
# Originals are deleted only after their .webp is confirmed written.
#
# Requires: ImageMagick (`magick`). Resizing uses Lanczos for sharp downscales.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PUB="$ROOT/public"

# Lanczos for crisp downscaling; method=6 = slowest/best WebP compression.
LOSSY_Q=85          # albedo/sky: visually lossless, strong savings
NEAR_LOSSLESS=60    # data maps: ~visually lossless, no banding in lighting

human() { du -h "$1" 2>/dev/null | cut -f1; }

# convert <src.png> <dst.webp> <color|data|raw> <resize|"">
convert_one() {
  local src="$1" dst="$2" kind="$3" resize="${4:-}"
  [[ -f "$src" ]] || { echo "  SKIP (missing): $src"; return; }

  local args=(magick "$src")
  [[ -n "$resize" ]] && args+=(-filter Lanczos -resize "$resize")
  args+=(-define webp:method=6)

  case "$kind" in
    color) args+=(-quality "$LOSSY_Q") ;;
    data)  args+=(-define "webp:near-lossless=$NEAR_LOSSLESS" -quality 100) ;;
    raw)   args+=(-define webp:lossless=true) ;;
  esac
  args+=("$dst")

  "${args[@]}"

  if [[ -s "$dst" ]]; then
    printf "  %-52s %6s -> %-6s %s\n" "$(basename "$dst")" "$(human "$src")" "$(human "$dst")" "[$kind]"
    rm -f "$src"
  else
    echo "  FAILED: $dst not written, keeping $src"
    return 1
  fi
}

echo "== Grass textures (4K -> 1K) =="
G="$PUB/grass_texture"
convert_one "$G/grass_05_basecolor_4k.png"  "$G/grass_05_basecolor_1k.webp"  color "1024x1024"
convert_one "$G/grass_05_normal_gl_4k.png"  "$G/grass_05_normal_gl_1k.webp"  data  "1024x1024"
convert_one "$G/grass_05_roughness_4k.png"  "$G/grass_05_roughness_1k.webp"  data  "1024x1024"

echo "== Ground textures (4K -> 1K) =="
D="$PUB/ground_texture/ground_07_4k"
convert_one "$D/ground_07__basecolor_4k.png"        "$D/ground_07__basecolor_1k.webp"        color "1024x1024"
convert_one "$D/ground_07__normal_gl_4k.png"        "$D/ground_07__normal_gl_1k.webp"        data  "1024x1024"
convert_one "$D/ground_07__roughness_4k.png"        "$D/ground_07__roughness_1k.webp"        data  "1024x1024"
convert_one "$D/ground_07__ambientocclusion_4k.png" "$D/ground_07__ambientocclusion_1k.webp" data  "1024x1024"
convert_one "$D/ground_07__height_4k.png"           "$D/ground_07__height_1k.webp"           data  "1024x1024"
convert_one "$D/ground_07__metallic_4k.png"         "$D/ground_07__metallic_1k.webp"         data  "1024x1024"

echo "== Sky (2K -> 1K, equirectangular) =="
convert_one "$PUB/skybox/sky_88_2k.png" "$PUB/skybox/sky_88_1k.webp" color "1024x512"

echo "== Noise / mask (kept at native resolution) =="
convert_one "$PUB/perlin.png" "$PUB/perlin.webp" raw ""
convert_one "$PUB/path.png"   "$PUB/path.webp"   raw ""

echo "== Removing unused assets =="
rm -f "$G/grass_05_normal_dx_4k.png"      && echo "  removed grass_05_normal_dx_4k.png"
rm -f "$D/ground_07__normal_dx_4k.png"    && echo "  removed ground_07__normal_dx_4k.png"
rm -rf "$PUB/skybox/sky_88_cubemap_2k-delete" && echo "  removed skybox/sky_88_cubemap_2k-delete/"

echo "Done."
