import "./style.css";
import type { AppState } from "./types";
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
const toolbar = $<HTMLElement>("toolbar");
const resetBtn = $<HTMLButtonElement>("resetBtn");

let state: AppState = { phase: "idle" };
let feedbackTimer: ReturnType<typeof setTimeout> | undefined;

const view = new CanvasView(canvasEl, copyBadge, copyHint, {
  onSplit: (splitY) => handleSplit(splitY),
  onLineMove: (splitY) => handleLineMove(splitY),
  onPartClick: (isTop) => void handlePartClick(isTop),
});

function setStatus(text: string): void {
  statusText.textContent = text;
}

function showImage(image: ImageBitmap): void {
  state = { phase: "loaded", image };

  emptyState.hidden = true;
  canvasWrap.hidden = false;
  toolbar.hidden = false;

  const maxWidth = dropZone.clientWidth - 32;
  const maxHeight = dropZone.clientHeight - 32;
  view.show(image, maxWidth, maxHeight);

  setStatus("Click position to split");
}

function handleSplit(splitY: number): void {
  if (state.phase !== "loaded") return;

  const { top, bottom } = splitImage(state.image, splitY);
  state = { phase: "split", image: state.image, top, bottom };

  view.setSplit(splitY);
  setStatus("Click a part to copy it or drag the line");
}

function handleLineMove(splitY: number): void {
  if (state.phase !== "split") return;

  const { top, bottom } = splitImage(state.image, splitY);
  state = { phase: "split", image: state.image, top, bottom };
}

async function handlePartClick(isTop: boolean): Promise<void> {
  if (state.phase !== "split") return;

  const part = isTop ? state.top : state.bottom;
  try {
    await copyCanvasToClipboard(part);
    view.showPartFeedback(isTop, "Copied ✓");
  } catch {
    view.showPartFeedback(isTop, "Copy failed");
  }

  if (feedbackTimer) clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => view.hideFeedback(), 1500);
}

function resetToIdle(): void {
  state = { phase: "idle" };
  view.reset();
  emptyState.hidden = false;
  canvasWrap.hidden = true;
  toolbar.hidden = true;
  setStatus("Paste, drop or select an image");
}

setupImageLoader(fileInput, dropZone, {
  onImage: (image) => showImage(image),
  onNoImage: () => setStatus("No image found — please try again"),
});

resetBtn.addEventListener("click", resetToIdle);

window.addEventListener("resize", () => {
  if (state.phase === "loaded") {
    const maxWidth = dropZone.clientWidth - 32;
    const maxHeight = dropZone.clientHeight - 32;
    view.show(state.image, maxWidth, maxHeight);
  }
});
