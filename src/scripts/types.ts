export type SplitOrientation = "horizontal" | "vertical";

export type PartIndex = 0 | 1;

export type AppState =
  | { phase: "idle" }
  | { phase: "loaded"; image: ImageBitmap }
  | {
      phase: "split";
      image: ImageBitmap;
      orientation: SplitOrientation;
      first: HTMLCanvasElement;
      second: HTMLCanvasElement;
    };

export interface SplitResult {
  orientation: SplitOrientation;
  first: HTMLCanvasElement;
  second: HTMLCanvasElement;
}
