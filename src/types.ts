export type AppState =
  | { phase: "idle" }
  | { phase: "loaded"; image: ImageBitmap }
  | {
      phase: "split";
      image: ImageBitmap;
      top: HTMLCanvasElement;
      bottom: HTMLCanvasElement;
    };

export interface SplitResult {
  top: HTMLCanvasElement;
  bottom: HTMLCanvasElement;
}
