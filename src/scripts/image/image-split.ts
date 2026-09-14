import type { SplitOrientation, SplitResult } from "@/scripts/types";

function cropToCanvas(
  image: ImageBitmap,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create 2D context.");

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);

  return canvas;
}

export function splitImage(
  image: ImageBitmap,
  orientation: SplitOrientation,
  pos: number,
): SplitResult {
  const p = Math.min(
    Math.max(pos, 0),
    orientation === "horizontal" ? image.height : image.width,
  );

  if (orientation === "horizontal") {
    return {
      orientation,
      first: cropToCanvas(image, 0, 0, image.width, p),
      second: cropToCanvas(image, 0, p, image.width, image.height - p),
    };
  }

  return {
    orientation,
    first: cropToCanvas(image, 0, 0, p, image.height),
    second: cropToCanvas(image, p, 0, image.width - p, image.height),
  };
}
