import type { SplitOrientation } from "./types";

const DIRECTION_THRESHOLD = 30;

export class SwipeDirection {
  private previous: { x: number; y: number } | null = null;
  private movedX = 0;
  private movedY = 0;

  orientation: SplitOrientation | null = null;

  update(x: number, y: number): void {
    if (this.previous) {
      this.movedX += Math.abs(x - this.previous.x);
      this.movedY += Math.abs(y - this.previous.y);
    }
    this.previous = { x, y };

    if (this.movedX >= this.movedY + DIRECTION_THRESHOLD) {
      this.orientation = "vertical";
      this.resetAccumulators();
    } else if (this.movedY >= this.movedX + DIRECTION_THRESHOLD) {
      this.orientation = "horizontal";
      this.resetAccumulators();
    }
  }

  reset(): void {
    this.orientation = null;
    this.previous = null;
    this.resetAccumulators();
  }

  private resetAccumulators(): void {
    this.movedX = 0;
    this.movedY = 0;
  }
}
