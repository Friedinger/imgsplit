import type { PartIndex, SplitOrientation } from "./types";

export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private dpr = 1;
  private scale = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create 2D context.");
    this.ctx = ctx;
  }

  fit(image: ImageBitmap, maxWidth: number, maxHeight: number): void {
    const aspectRatio = image.width / image.height;
    const boxAspectRatio = maxWidth / maxHeight;
    const [width, height] =
      aspectRatio > boxAspectRatio
        ? [maxWidth, Math.round(maxWidth / aspectRatio)]
        : [Math.round(maxHeight * aspectRatio), maxHeight];

    this.scale = image.width / width;
    this.dpr = window.devicePixelRatio || 1;

    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.drawImage(image);
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.displayWidth(), this.displayHeight());
  }

  drawImage(image: ImageBitmap): void {
    this.clear();
    this.ctx.drawImage(image, 0, 0, this.displayWidth(), this.displayHeight());
  }

  toSplitPx(displayPos: number, sourcePixels: number): number {
    return Math.min(
      Math.max(Math.round(displayPos * this.scale), 1),
      sourcePixels - 1,
    );
  }

  toDisplayPos(splitPx: number): number {
    return splitPx / this.scale;
  }

  displayWidth(): number {
    return this.canvas.width / this.dpr;
  }

  displayHeight(): number {
    return this.canvas.height / this.dpr;
  }

  drawLine(
    displayPos: number,
    orientation: SplitOrientation,
    focused = false,
  ): void {
    const width = this.displayWidth();
    const height = this.displayHeight();
    const horizontal = orientation === "horizontal";

    const stroke = (offset: number): void => {
      this.ctx.beginPath();
      if (horizontal) {
        this.ctx.moveTo(0, displayPos + offset);
        this.ctx.lineTo(width, displayPos + offset);
      } else {
        this.ctx.moveTo(displayPos + offset, 0);
        this.ctx.lineTo(displayPos + offset, height);
      }
      this.ctx.stroke();
    };

    this.ctx.save();
    this.ctx.strokeStyle = this.color("--split-line-shadow");
    stroke(2);
    this.ctx.strokeStyle = focused
      ? this.color("--focus")
      : this.color("--split-line");
    this.ctx.lineWidth = focused ? 3 : 1;
    stroke(0);
    this.ctx.restore();
  }

  fillPart(
    partIndex: PartIndex,
    orientation: SplitOrientation,
    linePos: number,
  ): void {
    const width = this.displayWidth();
    const height = this.displayHeight();
    const first = partIndex === 0;

    this.ctx.save();
    this.ctx.globalAlpha = 0.15;
    this.ctx.fillStyle = "#000000";
    if (orientation === "vertical") {
      this.ctx.fillRect(
        first ? 0 : linePos,
        0,
        first ? linePos : width - linePos,
        height,
      );
    } else {
      this.ctx.fillRect(
        0,
        first ? 0 : linePos,
        width,
        first ? linePos : height - linePos,
      );
    }
    this.ctx.restore();
  }

  private color(cssVariable: string): string {
    return (
      getComputedStyle(this.canvas).getPropertyValue(cssVariable).trim() ||
      "#000000"
    );
  }
}
