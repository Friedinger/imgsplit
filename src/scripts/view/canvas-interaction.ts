import { SwipeDirection } from "@/scripts/view/swipe-direction";
import type { PartIndex } from "@/scripts/types";
import type { CanvasView, CanvasViewOptions } from "@/scripts/view/canvas-view";

const GRAB_ZONE = 8;
const DRAG_CLICK_THRESHOLD = 4;

export class CanvasInteraction {
  private readonly view: CanvasView;
  private readonly swipe = new SwipeDirection();
  private readonly onSplit: CanvasViewOptions["onSplit"];
  private readonly onLineMove: CanvasViewOptions["onLineMove"];
  private readonly onClearSplit: CanvasViewOptions["onClearSplit"];
  private readonly onPartClick: CanvasViewOptions["onPartClick"];

  private dragging = false;
  private pressedOnLine = false;
  private dragMoved = false;
  private pressPos = 0;

  private readonly handlePointerMove = (event: PointerEvent) =>
    this.drawHover(event);
  private readonly handlePointerDown = (event: PointerEvent) =>
    this.startLineDrag(event);
  private readonly handlePointerUp = (event: PointerEvent) =>
    this.finishLineDrag(event);
  private readonly handleClick = (event: MouseEvent) =>
    this.handleCanvasClick(event);

  constructor(view: CanvasView, options: CanvasViewOptions) {
    this.view = view;
    this.onSplit = options.onSplit;
    this.onLineMove = options.onLineMove;
    this.onClearSplit = options.onClearSplit;
    this.onPartClick = options.onPartClick;
  }

  attach(): void {
    const canvas = this.view.canvas;
    canvas.addEventListener("pointermove", this.handlePointerMove);
    canvas.addEventListener("pointerdown", this.handlePointerDown);
    canvas.addEventListener("pointerup", this.handlePointerUp);
    canvas.addEventListener("click", this.handleClick);
    canvas.classList.add("canvas--interactive");
  }

  detach(): void {
    const canvas = this.view.canvas;
    canvas.removeEventListener("pointermove", this.handlePointerMove);
    canvas.removeEventListener("pointerdown", this.handlePointerDown);
    canvas.removeEventListener("pointerup", this.handlePointerUp);
    canvas.removeEventListener("click", this.handleClick);
    canvas.classList.remove("canvas--interactive");
  }

  reset(): void {
    this.dragging = false;
    this.pressedOnLine = false;
    this.dragMoved = false;
    this.swipe.reset();
  }

  private drawHover(event: PointerEvent): void {
    const {
      view,
      view: { image, renderer },
    } = this;
    if (!image) return;

    if (view.linePos === null) {
      const { x, y } = view.pointer(event);
      this.swipe.update(x, y);
      renderer.drawImage(image);
      const orientation = this.swipe.orientation;
      if (orientation) {
        renderer.drawLine(orientation === "vertical" ? x : y, orientation);
      }
      view.hidePartHint();
      view.canvas.style.cursor = "";
      return;
    }

    const pos = view.orientationPos(event);
    const orientation = view.orientation ?? "horizontal";
    const resizeCursor = orientation === "vertical" ? "ew-resize" : "ns-resize";

    if (this.dragging) {
      view.hidePartHint();
      view.canvas.style.cursor = resizeCursor;
      if (Math.abs(pos - this.pressPos) > DRAG_CLICK_THRESHOLD) {
        this.dragMoved = true;
        renderer.drawImage(image);
        renderer.drawLine(pos, orientation, true);
      }
      return;
    }

    renderer.drawImage(image);
    const linePos = view.linePos;
    if (Math.abs(pos - linePos) <= GRAB_ZONE) {
      view.hidePartHint();
      renderer.drawLine(linePos, orientation, true);
      view.canvas.style.cursor = resizeCursor;
    } else {
      const partIndex: PartIndex = pos < linePos ? 0 : 1;
      renderer.fillPart(partIndex, orientation, linePos);
      renderer.drawLine(linePos, orientation);
      view.showPartHint(partIndex);
      view.canvas.style.cursor = "pointer";
    }
  }

  private startLineDrag(event: PointerEvent): void {
    const { view } = this;
    if (!view.image || view.linePos === null) return;
    const pos = view.orientationPos(event);
    if (Math.abs(pos - view.linePos) <= GRAB_ZONE) {
      this.pressedOnLine = true;
      this.dragging = true;
      this.dragMoved = false;
      this.pressPos = pos;
      view.canvas.setPointerCapture(event.pointerId);
    }
  }

  private finishLineDrag(event: PointerEvent): void {
    const { view } = this;
    if (!this.dragging) return;
    this.dragging = false;
    if (view.canvas.hasPointerCapture(event.pointerId)) {
      view.canvas.releasePointerCapture(event.pointerId);
    }
    if (!this.dragMoved || !view.image || view.orientation === null) return;

    const splitPx = view.renderer.toSplitPx(
      view.orientationPos(event),
      view.splitDimension(),
    );
    view.linePos = view.renderer.toDisplayPos(splitPx);
    this.onLineMove(view.orientation, splitPx);
    view.renderer.drawImage(view.image);
    view.renderer.drawLine(view.linePos, view.orientation);
    view.canvas.style.cursor = "pointer";
  }

  private handleCanvasClick(event: MouseEvent): void {
    const { view } = this;
    if (!view.image) return;

    if (view.linePos === null) {
      const orientation = this.swipe.orientation ?? "horizontal";
      const { x, y } = view.pointer(event);
      view.orientation = orientation;
      view.linePos = orientation === "vertical" ? x : y;
      this.onSplit(
        orientation,
        view.renderer.toSplitPx(view.linePos, view.splitDimension()),
      );
      this.swipe.reset();
      return;
    }

    if (this.pressedOnLine) {
      this.pressedOnLine = false;
      if (!this.dragMoved) {
        this.onClearSplit();
        view.backToLoaded();
      }
      this.dragMoved = false;
      return;
    }

    this.onPartClick(view.orientationPos(event) < view.linePos ? 0 : 1);
  }
}
