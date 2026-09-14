import { CanvasRenderer } from "@/scripts/view/canvas-renderer";
import { positionOverlay } from "@/scripts/view/split-overlay";
import { CanvasInteraction } from "@/scripts/view/canvas-interaction";
import type { PartIndex, SplitOrientation } from "@/scripts/types";

export interface CanvasViewOptions {
  onSplit: (orientation: SplitOrientation, splitPx: number) => void;
  onLineMove: (orientation: SplitOrientation, splitPx: number) => void;
  onClearSplit: () => void;
  onPartClick: (partIndex: PartIndex) => void;
}

export class CanvasView {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: CanvasRenderer;
  readonly interaction: CanvasInteraction;
  private readonly badge: HTMLElement;
  private readonly badgeLabel: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly hintLabel: HTMLElement;

  image: ImageBitmap | null = null;
  orientation: SplitOrientation | null = null;
  linePos: number | null = null;
  feedbackPart: PartIndex | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    badge: HTMLElement,
    hint: HTMLElement,
    options: CanvasViewOptions,
  ) {
    this.canvas = canvas;
    this.renderer = new CanvasRenderer(canvas);
    this.badge = badge;
    this.badgeLabel = badge.querySelector(".copy-badge__chip") as HTMLElement;
    this.hint = hint;
    this.hintLabel = hint.querySelector(".copy-hint__chip") as HTMLElement;
    this.interaction = new CanvasInteraction(this, options);
  }

  show(image: ImageBitmap, maxWidth: number, maxHeight: number): void {
    this.image = image;
    this.orientation = null;
    this.linePos = null;
    this.interaction.reset();

    this.renderer.fit(image, maxWidth, maxHeight);
    this.canvas.style.cursor = "";
    this.interaction.attach();
  }

  setSplit(orientation: SplitOrientation, splitPx: number): void {
    this.orientation = orientation;
    this.linePos = this.renderer.toDisplayPos(splitPx);
    this.interaction.reset();
    if (!this.image) return;
    this.renderer.drawImage(this.image);
    this.renderer.drawLine(this.linePos, orientation);
    this.canvas.style.cursor = "pointer";
  }

  backToLoaded(): void {
    this.orientation = null;
    this.linePos = null;
    this.interaction.reset();
    if (this.image) this.renderer.drawImage(this.image);
    this.canvas.style.cursor = "";
    this.hideFeedback();
    this.hidePartHint();
  }

  reset(): void {
    this.interaction.detach();
    this.image = null;
    this.orientation = null;
    this.linePos = null;
    this.feedbackPart = null;
    this.interaction.reset();
    this.canvas.style.cursor = "";
    this.renderer.clear();
    this.hideFeedback();
    this.hidePartHint();
  }

  showPartFeedback(partIndex: PartIndex, text: string): void {
    if (!this.image || this.linePos === null || this.orientation === null)
      return;
    this.hidePartHint();
    this.placeOverlay(this.badge, partIndex);
    this.badgeLabel.textContent = text;
    this.badge.hidden = false;
    this.feedbackPart = partIndex;
  }

  hideFeedback(): void {
    this.badge.hidden = true;
    this.feedbackPart = null;
  }

  showPartHint(partIndex: PartIndex): void {
    if (
      !this.image ||
      this.linePos === null ||
      this.orientation === null ||
      this.feedbackPart === partIndex
    )
      return;
    this.placeOverlay(this.hint, partIndex);
    this.hintLabel.textContent = "Click to copy";
    this.hint.hidden = false;
  }

  hidePartHint(): void {
    this.hint.hidden = true;
  }

  pointer(event: PointerEvent | MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  orientationPos(event: PointerEvent | MouseEvent): number {
    const { x, y } = this.pointer(event);
    return this.orientation === "vertical" ? x : y;
  }

  splitDimension(): number {
    const orientation = this.orientation ?? "horizontal";
    const image = this.image;
    if (!image) return 0;
    return orientation === "vertical" ? image.width : image.height;
  }

  private placeOverlay(element: HTMLElement, partIndex: PartIndex): void {
    if (this.orientation === null || this.linePos === null) return;
    positionOverlay(
      element,
      this.orientation,
      partIndex,
      this.linePos,
      this.renderer.displayWidth(),
      this.renderer.displayHeight(),
    );
  }
}
