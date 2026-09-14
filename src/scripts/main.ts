import "@/styles/style.css";
import { setupImageLoader } from "@/scripts/image/image-loader";
import { CanvasView } from "@/scripts/view/canvas-view";
import { splitImage } from "@/scripts/image/image-split";
import { copyCanvasToClipboard } from "@/scripts/image/clipboard";
import type { AppState, PartIndex, SplitOrientation } from "@/scripts/types";

const CHOOSE_SPLIT_STATUS =
  "Move & swipe to choose a split direction, then click — drop, paste or select a new image to replace";
const SPLIT_STATUS =
  "Click a part to copy it, drag the line to move it, or drop/paste a new image";

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} not found.`);
  return el as T;
};

const dropZone = $<HTMLElement>("dropZone");
const emptyState = $<HTMLElement>("emptyState");
const fileInput = $<HTMLInputElement>("fileInput");
const canvasWrap = $<HTMLElement>("canvasWrap");
const canvasEl = $<HTMLCanvasElement>("canvas");
const copyBadge = $<HTMLElement>("copyBadge");
const copyHint = $<HTMLElement>("copyHint");
const statusText = $<HTMLElement>("statusText");
const resetBtn = $<HTMLButtonElement>("resetBtn");

let state: AppState = { phase: "idle" };
let feedbackTimer: ReturnType<typeof setTimeout> | undefined;

const view = new CanvasView(canvasEl, copyBadge, copyHint, {
  onSplit: handleSplit,
  onLineMove: handleLineMove,
  onClearSplit: handleClearSplit,
  onPartClick: handlePartClick,
});

function setStatus(text: string): void {
  statusText.textContent = text;
}

function showImage(image: ImageBitmap): void {
  state = { phase: "loaded", image };

  emptyState.hidden = true;
  canvasWrap.hidden = false;

  const maxWidth = dropZone.clientWidth - 32;
  const maxHeight = dropZone.clientHeight - 32;
  view.show(image, maxWidth, maxHeight);

  setStatus(CHOOSE_SPLIT_STATUS);
}

function applySplit(
  image: ImageBitmap,
  orientation: SplitOrientation,
  splitPx: number,
): void {
  const parts = splitImage(image, orientation, splitPx);
  state = { phase: "split", image, ...parts };
}

function handleSplit(orientation: SplitOrientation, splitPx: number): void {
  if (state.phase !== "loaded") return;
  applySplit(state.image, orientation, splitPx);
  view.setSplit(orientation, splitPx);
  setStatus(SPLIT_STATUS);
}

function handleLineMove(orientation: SplitOrientation, splitPx: number): void {
  if (state.phase !== "split") return;
  applySplit(state.image, orientation, splitPx);
}

function handleClearSplit(): void {
  if (state.phase !== "split") return;

  state = { phase: "loaded", image: state.image };
  view.backToLoaded();
  setStatus(CHOOSE_SPLIT_STATUS);
}

async function handlePartClick(partIndex: PartIndex): Promise<void> {
  if (state.phase !== "split") return;

  const part = partIndex === 0 ? state.first : state.second;
  try {
    await copyCanvasToClipboard(part);
    view.showPartFeedback(partIndex, "Copied ✓");
  } catch {
    view.showPartFeedback(partIndex, "Copy failed");
  }

  if (feedbackTimer) clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => view.hideFeedback(), 1500);
}

function resetToIdle(): void {
  state = { phase: "idle" };
  view.reset();
  emptyState.hidden = false;
  canvasWrap.hidden = true;
  setStatus("Paste, drop or select an image");
}

setupImageLoader(fileInput, dropZone, {
  onImage: (image) => showImage(image),
  onNoImage: () => setStatus("No image found — please try again"),
});

resetBtn.addEventListener("click", resetToIdle);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") resetToIdle();
});

window.addEventListener("resize", () => {
  if (state.phase === "loaded") {
    const maxWidth = dropZone.clientWidth - 32;
    const maxHeight = dropZone.clientHeight - 32;
    view.show(state.image, maxWidth, maxHeight);
  }
});
