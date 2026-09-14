import type { SplitOrientation } from "./types";

export interface CanvasViewOptions {
  onSplit: (orientation: SplitOrientation, splitPx: number) => void;
  onLineMove: (orientation: SplitOrientation, splitPx: number) => void;
  onClearSplit: () => void;
  onPartClick: (partIndex: 0 | 1) => void;
}

const GRAB_ZONE = 8;
const ORIENT_THRESHOLD = 30;
const DRAG_CLICK_THRESHOLD = 4;

type PartIndex = 0 | 1;

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
  private orientation: SplitOrientation | null = null;
  private linePos: number | null = null;
  private dragging = false;
  private pressedOnLine = false;
  private dragMoved = false;
  private pressPos = 0;
  private feedbackPart: PartIndex | null = null;
  private prevMove: { x: number; y: number } | null = null;
  private moveAx = 0;
  private moveAy = 0;
  private previewOrientation: SplitOrientation | null = null;
  private readonly onSplit: (
    orientation: SplitOrientation,
    splitPx: number,
  ) => void;
  private readonly onLineMove: (
    orientation: SplitOrientation,
    splitPx: number,
  ) => void;
  private readonly onClearSplit: () => void;
  private readonly onPartClick: (partIndex: PartIndex) => void;

  private readonly handlePointerMove = (event: PointerEvent) =>
    this.drawHover(event);
  private readonly handlePointerDown = (event: PointerEvent) =>
    this.startLineDrag(event);
  private readonly handlePointerUp = (event: PointerEvent) =>
    this.finishLineDrag(event);
  private readonly handleClick = (event: MouseEvent) =>
    this.handleCanvasClick(event);

  constructor(
    canvas: HTMLCanvasElement,
    badge: HTMLElement,
    hint: HTMLElement,
    options: CanvasViewOptions,
  ) {
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
    this.onClearSplit = options.onClearSplit;
    this.onPartClick = options.onPartClick;
  }

  show(image: ImageBitmap, maxWidth: number, maxHeight: number): void {
    this.image = image;
    this.orientation = null;
    this.linePos = null;
    this.dragging = false;
    this.pressedOnLine = false;
    this.dragMoved = false;
    this.resetOrientationTracking();

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

  setSplit(orientation: SplitOrientation, splitPx: number): void {
    this.orientation = orientation;
    this.linePos = splitPx / this.scale;
    this.dragging = false;
    this.pressedOnLine = false;
    this.dragMoved = false;
    this.resetOrientationTracking();
    this.redrawImage();
    this.drawLine(this.linePos, false);
    this.canvas.style.cursor = "pointer";
  }

  showPartFeedback(partIndex: PartIndex, text: string): void {
    if (!this.image || this.linePos === null || this.orientation === null)
      return;
    this.hidePartHint();
    this.positionOver(this.badge, partIndex);
    this.chip.textContent = text;
    this.badge.hidden = false;
    this.feedbackPart = partIndex;
  }

  hideFeedback(): void {
    this.badge.hidden = true;
    this.feedbackPart = null;
  }

  private showPartHint(partIndex: PartIndex): void {
    if (
      !this.image ||
      this.linePos === null ||
      this.orientation === null ||
      this.feedbackPart === partIndex
    )
      return;
    this.positionOver(this.hint, partIndex);
    this.hintChip.textContent = "Click to copy";
    this.hint.hidden = false;
  }

  private hidePartHint(): void {
    this.hint.hidden = true;
  }

  private positionOver(element: HTMLElement, partIndex: PartIndex): void {
    const width = this.displayWidth();
    const height = this.displayHeight();
    this.clearInlineOverlay(element);

    if (this.orientation === "vertical") {
      const lineX = this.lineDisplayPos();
      element.style.top = "0";
      element.style.height = `${height}px`;
      if (partIndex === 0) {
        element.style.left = "0";
        element.style.width = `${lineX}px`;
      } else {
        element.style.left = `${lineX}px`;
        element.style.width = `${width - lineX}px`;
      }
      return;
    }

    const lineY = this.lineDisplayPos();
    if (partIndex === 0) {
      element.style.top = "0";
      element.style.height = `${lineY}px`;
    } else {
      element.style.top = `${lineY}px`;
      element.style.height = `${height - lineY}px`;
    }
  }

  private clearInlineOverlay(element: HTMLElement): void {
    element.style.top = "";
    element.style.left = "";
    element.style.width = "";
    element.style.height = "";
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
    this.orientation = null;
    this.linePos = null;
    this.dragging = false;
    this.pressedOnLine = false;
    this.dragMoved = false;
    this.feedbackPart = null;
    this.resetOrientationTracking();
    this.canvas.style.cursor = "";
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.hideFeedback();
    this.hidePartHint();
  }

  private pointer(event: PointerEvent | MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private orientationPos(event: PointerEvent | MouseEvent): number {
    const { x, y } = this.pointer(event);
    return this.orientation === "vertical" ? x : y;
  }

  private displayWidth(): number {
    return this.canvas.width / this.dpr;
  }

  private displayHeight(): number {
    return this.canvas.height / this.dpr;
  }

  private lineDisplayPos(): number {
    return this.linePos === null ? -1 : this.linePos;
  }

  private toSplitPx(displayPos: number): number {
    if (!this.image) return 0;
    const dim =
      this.orientation === "vertical" ? this.image.width : this.image.height;
    return Math.min(Math.max(Math.round(displayPos * this.scale), 1), dim - 1);
  }

  private resetOrientationTracking(): void {
    this.prevMove = null;
    this.moveAx = 0;
    this.moveAy = 0;
    this.previewOrientation = null;
  }

  private trackOrientation(event: PointerEvent): void {
    const { x, y } = this.pointer(event);
    if (this.prevMove) {
      this.moveAx += Math.abs(x - this.prevMove.x);
      this.moveAy += Math.abs(y - this.prevMove.y);
    }
    this.prevMove = { x, y };

    if (this.moveAx >= this.moveAy + ORIENT_THRESHOLD) {
      this.previewOrientation = "vertical";
      this.moveAx = 0;
      this.moveAy = 0;
    } else if (this.moveAy >= this.moveAx + ORIENT_THRESHOLD) {
      this.previewOrientation = "horizontal";
      this.moveAx = 0;
      this.moveAy = 0;
    }
  }

  private drawHover(event: PointerEvent): void {
    if (!this.image) return;

    if (this.linePos === null) {
      this.trackOrientation(event);
      this.redrawImage();
      if (this.previewOrientation) {
        const { x, y } = this.pointer(event);
        this.drawLine(
          this.previewOrientation === "vertical" ? x : y,
          false,
          this.previewOrientation,
        );
      }
      this.hidePartHint();
      this.canvas.style.cursor = "";
      return;
    }

    const pos = this.orientationPos(event);
    const line = this.linePos;
    const isVertical = this.orientation === "vertical";

    if (this.dragging) {
      this.hidePartHint();
      this.canvas.style.cursor = isVertical ? "ew-resize" : "ns-resize";
      if (Math.abs(pos - this.pressPos) > DRAG_CLICK_THRESHOLD) {
        this.dragMoved = true;
        this.redrawImage();
        this.drawLine(pos, true);
      }
      return;
    }

    this.redrawImage();
    if (Math.abs(pos - line) <= GRAB_ZONE) {
      this.hidePartHint();
      this.drawLine(line, true);
      this.canvas.style.cursor = isVertical ? "ew-resize" : "ns-resize";
    } else {
      this.fillPart(pos < line ? 0 : 1);
      this.drawLine(line);
      this.showPartHint(pos < line ? 0 : 1);
      this.canvas.style.cursor = "pointer";
    }
  }

  private startLineDrag(event: PointerEvent): void {
    if (!this.image || this.linePos === null) return;
    const pos = this.orientationPos(event);
    if (Math.abs(pos - this.linePos) <= GRAB_ZONE) {
      this.pressedOnLine = true;
      this.dragging = true;
      this.dragMoved = false;
      this.pressPos = pos;
      this.canvas.setPointerCapture(event.pointerId);
    }
  }

  private finishLineDrag(event: PointerEvent): void {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.canvas.hasPointerCapture(event.pointerId)) {
      this.canvas.releasePointerCapture(event.pointerId);
    }
    if (!this.dragMoved) return;
    const splitPx = this.toSplitPx(this.orientationPos(event));
    this.linePos = splitPx / this.scale;
    this.onLineMove(this.orientation as SplitOrientation, splitPx);
    this.redrawImage();
    this.drawLine(this.linePos, false);
    this.canvas.style.cursor = "pointer";
  }

  private handleCanvasClick(event: MouseEvent): void {
    if (!this.image) return;

    if (this.linePos === null) {
      const orientation = this.previewOrientation ?? "horizontal";
      this.orientation = orientation;
      this.linePos =
        this.pointer(event)[orientation === "vertical" ? "x" : "y"];
      this.onSplit(orientation, this.toSplitPx(this.linePos));
      this.resetOrientationTracking();
      return;
    }

    if (this.pressedOnLine) {
      this.pressedOnLine = false;
      if (!this.dragMoved) {
        this.onClearSplit();
        this.backToLoaded();
      }
      this.dragMoved = false;
      return;
    }

    this.onPartClick(this.orientationPos(event) < this.linePos ? 0 : 1);
  }

  backToLoaded(): void {
    this.orientation = null;
    this.linePos = null;
    this.dragging = false;
    this.pressedOnLine = false;
    this.dragMoved = false;
    this.resetOrientationTracking();
    this.redrawImage();
    this.canvas.style.cursor = "";
    this.hideFeedback();
    this.hidePartHint();
  }

  private resolveColor(cssVariable: string): string {
    return (
      getComputedStyle(this.canvas).getPropertyValue(cssVariable).trim() ||
      "#000000"
    );
  }

  private redrawImage(): void {
    if (!this.image) return;
    this.clearCanvas();
    this.ctx.drawImage(
      this.image,
      0,
      0,
      this.displayWidth(),
      this.displayHeight(),
    );
  }

  private clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.displayWidth(), this.displayHeight());
  }

  private drawLine(
    displayPos: number,
    focused = false,
    orientation = this.orientation ?? "horizontal",
  ): void {
    const width = this.displayWidth();
    const height = this.displayHeight();
    const horizontal = orientation === "horizontal";

    this.ctx.save();
    this.ctx.strokeStyle = this.resolveColor("--split-line-shadow");
    this.ctx.beginPath();
    if (horizontal) {
      this.ctx.moveTo(0, displayPos + 2);
      this.ctx.lineTo(width, displayPos + 2);
    } else {
      this.ctx.moveTo(displayPos + 2, 0);
      this.ctx.lineTo(displayPos + 2, height);
    }
    this.ctx.stroke();

    this.ctx.strokeStyle = focused
      ? this.resolveColor("--focus")
      : this.resolveColor("--split-line");
    this.ctx.lineWidth = focused ? 3 : 1;
    this.ctx.beginPath();
    if (horizontal) {
      this.ctx.moveTo(0, displayPos);
      this.ctx.lineTo(width, displayPos);
    } else {
      this.ctx.moveTo(displayPos, 0);
      this.ctx.lineTo(displayPos, height);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  private fillPart(partIndex: PartIndex): void {
    const width = this.displayWidth();
    const height = this.displayHeight();
    const line = this.lineDisplayPos();

    this.ctx.save();
    this.ctx.globalAlpha = 0.15;
    this.ctx.fillStyle = "#000000";
    if (this.orientation === "vertical") {
      if (partIndex === 0) {
        this.ctx.fillRect(0, 0, line, height);
      } else {
        this.ctx.fillRect(line, 0, width - line, height);
      }
    } else if (partIndex === 0) {
      this.ctx.fillRect(0, 0, width, line);
    } else {
      this.ctx.fillRect(0, line, width, height - line);
    }
    this.ctx.restore();
  }
}
