export interface CanvasViewOptions {
  onSplit: (splitY: number) => void;
  onLineMove: (splitY: number) => void;
  onPartClick: (isTop: boolean) => void;
}

const GRAB_ZONE = 8;

export class CanvasView {
  private readonly canvas: HTMLCanvasElement;
  private readonly badge: HTMLElement;
  private readonly chip: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly hintChip: HTMLElement;
  private readonly ctx: CanvasRenderingContext2D;
  private image: ImageBitmap | null = null;
  private dpr = 1;
  private scale = 1;
  private splitY: number | null = null;
  private dragging = false;
  private pressedOnLine = false;
  private feedbackPart: boolean | null = null;
  private readonly onSplit: (splitY: number) => void;
  private readonly onLineMove: (splitY: number) => void;
  private readonly onPartClick: (isTop: boolean) => void;

  private readonly handlePointerMove = (event: PointerEvent) => this.drawHover(event);
  private readonly handlePointerDown = (event: PointerEvent) => this.startLineDrag(event);
  private readonly handlePointerUp = (event: PointerEvent) => this.finishLineDrag(event);
  private readonly handleClick = (event: MouseEvent) => this.handleCanvasClick(event);

  constructor(canvas: HTMLCanvasElement, badge: HTMLElement, hint: HTMLElement, options: CanvasViewOptions) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create 2D context.");
    this.ctx = ctx;
    this.badge = badge;
    this.chip = badge.querySelector(".copy-badge__chip") as HTMLElement;
    this.hint = hint;
    this.hintChip = hint.querySelector(".copy-hint__chip") as HTMLElement;
    this.onSplit = options.onSplit;
    this.onLineMove = options.onLineMove;
    this.onPartClick = options.onPartClick;
  }

  show(image: ImageBitmap, maxWidth: number, maxHeight: number): void {
    this.image = image;
    this.splitY = null;
    this.dragging = false;
    this.pressedOnLine = false;

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

    this.ctx.drawImage(image, 0, 0, width, height);
    this.canvas.style.cursor = "";
    this.enableInteraction();
  }

  setSplit(splitY: number): void {
    this.splitY = splitY;
    this.dragging = false;
    this.pressedOnLine = false;
    this.clearCanvas();
    this.drawImageAndLine(splitY, false);
    this.canvas.style.cursor = "pointer";
  }

  showPartFeedback(isTop: boolean, text: string): void {
    if (!this.image || this.splitY === null) return;
    this.hidePartHint();
    const lineY = this.splitY / this.scale;
    this.positionOver(this.badge, isTop, lineY);
    this.chip.textContent = text;
    this.badge.hidden = false;
    this.feedbackPart = isTop;
  }

  hideFeedback(): void {
    this.badge.hidden = true;
    this.feedbackPart = null;
  }

  private showPartHint(isTop: boolean): void {
    if (!this.image || this.splitY === null || this.feedbackPart === isTop) return;
    const lineY = this.splitY / this.scale;
    this.positionOver(this.hint, isTop, lineY);
    this.hintChip.textContent = "Click to copy";
    this.hint.hidden = false;
  }

  private hidePartHint(): void {
    this.hint.hidden = true;
  }

  private positionOver(element: HTMLElement, isTop: boolean, lineY: number): void {
    if (isTop) {
      element.style.top = "0";
      element.style.height = `${lineY}px`;
    } else {
      element.style.top = `${lineY}px`;
      element.style.height = `${this.displayHeight() - lineY}px`;
    }
  }

  private enableInteraction(): void {
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("click", this.handleClick);
    this.canvas.classList.add("canvas--interactive");
  }

  disableInteraction(): void {
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("click", this.handleClick);
    this.canvas.classList.remove("canvas--interactive");
  }

  reset(): void {
    this.disableInteraction();
    this.image = null;
    this.splitY = null;
    this.dragging = false;
    this.pressedOnLine = false;
    this.feedbackPart = null;
    this.canvas.style.cursor = "";
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.hideFeedback();
    this.hidePartHint();
  }

  private pointerY(event: PointerEvent | MouseEvent): number {
    return event.clientY - this.canvas.getBoundingClientRect().top;
  }

  private displayWidth(): number {
    return this.canvas.width / this.dpr;
  }

  private displayHeight(): number {
    return this.canvas.height / this.dpr;
  }

  private lineDisplayY(): number {
    return this.splitY === null ? -1 : this.splitY / this.scale;
  }

  private toSplitY(displayY: number): number {
    if (!this.image) return 0;
    return Math.min(Math.max(Math.round(displayY * this.scale), 1), this.image.height - 1);
  }

  private drawHover(event: PointerEvent): void {
    if (!this.image) return;
    const y = this.pointerY(event);

    if (this.dragging) {
      this.hidePartHint();
      this.redrawImage();
      this.drawLine(this.toSplitY(y) / this.scale, true);
      this.canvas.style.cursor = "ns-resize";
      return;
    }

    if (this.splitY === null) {
      this.hidePartHint();
      this.redrawImage();
      this.drawLine(y);
      this.canvas.style.cursor = "";
      return;
    }

    const lineY = this.lineDisplayY();
    this.redrawImage();
    if (Math.abs(y - lineY) <= GRAB_ZONE) {
      this.hidePartHint();
      this.drawLine(lineY, true);
      this.canvas.style.cursor = "ns-resize";
    } else {
      this.fillPart(y < lineY);
      this.drawLine(lineY);
      this.showPartHint(y < lineY);
      this.canvas.style.cursor = "pointer";
    }
  }

  private startLineDrag(event: PointerEvent): void {
    if (!this.image || this.splitY === null) return;
    const y = this.pointerY(event);
    if (Math.abs(y - this.lineDisplayY()) <= GRAB_ZONE) {
      this.pressedOnLine = true;
      this.dragging = true;
      this.canvas.setPointerCapture(event.pointerId);
    }
  }

  private finishLineDrag(event: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    const splitY = this.toSplitY(this.pointerY(event));
    this.splitY = splitY;
    this.onLineMove(splitY);
    this.clearCanvas();
    this.drawImageAndLine(splitY, false);
    this.canvas.style.cursor = "pointer";
  }

  private handleCanvasClick(event: MouseEvent): void {
    if (!this.image) return;
    const y = this.pointerY(event);

    if (this.splitY === null) {
      this.onSplit(this.toSplitY(y));
      return;
    }

    if (this.pressedOnLine) {
      this.pressedOnLine = false;
      return;
    }

    this.onPartClick(y < this.lineDisplayY());
  }

  private resolveColor(cssVariable: string): string {
    return getComputedStyle(this.canvas).getPropertyValue(cssVariable).trim() || "#000000";
  }

  private redrawImage(): void {
    if (!this.image) return;
    this.clearCanvas();
    this.ctx.drawImage(this.image, 0, 0, this.displayWidth(), this.displayHeight());
  }

  private clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.displayWidth(), this.displayHeight());
  }

  private drawImageAndLine(splitY: number, focused: boolean): void {
    this.redrawImage();
    this.drawLine(splitY / this.scale, focused);
  }

  private drawLine(displayY: number, focused = false): void {
    const width = this.displayWidth();
    this.ctx.save();
    this.ctx.strokeStyle = this.resolveColor("--split-line-shadow");
    this.ctx.beginPath();
    this.ctx.moveTo(0, displayY + 2);
    this.ctx.lineTo(width, displayY + 2);
    this.ctx.stroke();

    this.ctx.strokeStyle = focused ? this.resolveColor("--focus") : this.resolveColor("--split-line");
    this.ctx.lineWidth = focused ? 3 : 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, displayY);
    this.ctx.lineTo(width, displayY);
    this.ctx.stroke();
    this.ctx.restore();
  }

  private fillPart(isTop: boolean): void {
    const width = this.displayWidth();
    const height = this.displayHeight();
    const lineY = this.lineDisplayY();

    this.ctx.save();
    this.ctx.globalAlpha = 0.15;
    this.ctx.fillStyle = "#000000";
    if (isTop) {
      this.ctx.fillRect(0, 0, width, lineY);
    } else {
      this.ctx.fillRect(0, lineY, width, height - lineY);
    }
    this.ctx.restore();
  }
}