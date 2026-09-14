import type { SplitResult } from "./types";

function cropToCanvas(
  image: ImageBitmap,
  sy: number,
  sHeight: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = sHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create 2D context.");

  ctx.drawImage(
    image,
    0, sy, image.width, sHeight,
    0, 0, image.width, sHeight,
  );

  return canvas;
}

export function splitImage(image: ImageBitmap, splitY: number): SplitResult {
  const y = Math.min(Math.max(splitY, 0), image.height);

  return {
    top: cropToCanvas(image, 0, y),
    bottom: cropToCanvas(image, y, image.height - y),
  };
}
