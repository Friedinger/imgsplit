import "./style.css";
import type { AppState, SplitOrientation } from "./types";
import { setupImageLoader } from "./image-loader";
import { CanvasView } from "./canvas-view";
import { splitImage } from "./image-split";
import { copyCanvasToClipboard } from "./clipboard";

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
  onSplit: (orientation, splitPx) => handleSplit(orientation, splitPx),
  onLineMove: (orientation, splitPx) => handleLineMove(orientation, splitPx),
  onClearSplit: () => handleClearSplit(),
  onPartClick: (partIndex) => void handlePartClick(partIndex),
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

  setStatus("Move & swipe to choose a split direction, then click — drop, paste or select a new image to replace");
}

function handleSplit(orientation: SplitOrientation, splitPx: number): void {
  if (state.phase !== "loaded") return;

  const { first, second } = splitImage(state.image, orientation, splitPx);
  state = { phase: "split", image: state.image, orientation, first, second };

  view.setSplit(orientation, splitPx);
  setStatus("Click a part to copy it, drag the line to move it, or drop/paste a new image");
}

function handleLineMove(orientation: SplitOrientation, splitPx: number): void {
  if (state.phase !== "split") return;

  const { first, second } = splitImage(state.image, orientation, splitPx);
  state = { phase: "split", image: state.image, orientation, first, second };
}

function handleClearSplit(): void {
  if (state.phase !== "split") return;

  state = { phase: "loaded", image: state.image };
  view.backToLoaded();
  setStatus("Move & swipe to choose a split direction, then click — drop, paste or select a new image to replace");
}

async function handlePartClick(partIndex: 0 | 1): Promise<void> {
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