export interface CanvasViewOptions {
  onSplit: (splitY: number) => void;
}

export class CanvasView {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private image: ImageBitmap | null = null;
  private scale = 1;
  private readonly onSplit: (splitY: number) => void;

  private readonly handlePointerMove = (event: PointerEvent) => this.drawLine(event);
  private readonly handleClick = (event: MouseEvent) => this.handleCanvasClick(event);

  constructor(canvas: HTMLCanvasElement, options: CanvasViewOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create 2D context.");
    this.ctx = ctx;
    this.onSplit = options.onSplit;
  }

  show(image: ImageBitmap, maxWidth: number, maxHeight: number): void {
    this.image = image;

    const aspectRatio = image.width / image.height;
    const boxAspectRatio = maxWidth / maxHeight;

    const [width, height] =
      aspectRatio > boxAspectRatio
        ? [maxWidth, Math.round(maxWidth / aspectRatio)]
        : [Math.round(maxHeight * aspectRatio), maxHeight];

    this.scale = image.width / width;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.ctx.drawImage(image, 0, 0, width, height);
    this.enableInteraction();
  }

  private enableInteraction(): void {
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("click", this.handleClick);
    this.canvas.classList.add("canvas--interactive");
  }

  disableInteraction(): void {
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("click", this.handleClick);
    this.canvas.classList.remove("canvas--interactive");
  }

  private drawLine(event: PointerEvent): void {
    if (!this.image) return;
    const rect = this.canvas.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const displayWidth = rect.width;

    this.redrawImage();
    this.ctx.save();
    this.ctx.strokeStyle = this.resolveColor("--split-line-shadow");
    this.ctx.beginPath();
    this.ctx.moveTo(0, y + 1);
    this.ctx.lineTo(displayWidth, y + 1);
    this.ctx.stroke();

    this.ctx.strokeStyle = this.resolveColor("--split-line");
    this.ctx.beginPath();
    this.ctx.moveTo(0, y);
    this.ctx.lineTo(displayWidth, y);
    this.ctx.stroke();
    this.ctx.restore();
  }

  private resolveColor(cssVariable: string): string {
    return getComputedStyle(this.canvas).getPropertyValue(cssVariable).trim();
  }

  private redrawImage(): void {
    if (!this.image) return;
    const dpr = window.devicePixelRatio || 1;
    const width = this.canvas.width / dpr;
    const height = this.canvas.height / dpr;
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.drawImage(this.image, 0, 0, width, height);
  }

  private handleCanvasClick(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const y = event.clientY - rect.top;
    const splitY = Math.round(y * this.scale);
    this.onSplit(splitY);
  }

  reset(): void {
    this.disableInteraction();
    this.image = null;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}
