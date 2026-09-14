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
const canvasEl = $<HTMLCanvasElement>("canvas");
const statusText = $<HTMLElement>("statusText");
const toolbar = $<HTMLElement>("toolbar");
const copyTopBtn = $<HTMLButtonElement>("copyTopBtn");
const copyBottomBtn = $<HTMLButtonElement>("copyBottomBtn");
const resetBtn = $<HTMLButtonElement>("resetBtn");

let state: AppState = { phase: "idle" };

const view = new CanvasView(canvasEl, {
  onSplit: (splitY) => handleSplit(splitY),
});

function setStatus(text: string): void {
  statusText.textContent = text;
}

function showImage(image: ImageBitmap): void {
  state = { phase: "loaded", image };

  emptyState.hidden = true;
  canvasEl.hidden = false;
  toolbar.hidden = false;
  copyTopBtn.hidden = true;
  copyBottomBtn.hidden = true;

  const maxWidth = dropZone.clientWidth - 32;
  const maxHeight = dropZone.clientHeight - 32;
  view.show(image, maxWidth, maxHeight);

  setStatus("Click position to split");
}

function handleSplit(splitY: number): void {
  if (state.phase !== "loaded") return;

  const { top, bottom } = splitImage(state.image, splitY);
  state = { phase: "split", image: state.image, top, bottom };

  view.disableInteraction();
  copyTopBtn.hidden = false;
  copyBottomBtn.hidden = false;
  setStatus("Copy parts to clipboard");
}

async function handleCopy(canvas: HTMLCanvasElement, button: HTMLButtonElement): Promise<void> {
  const originalLabel = button.textContent;
  try {
    await copyCanvasToClipboard(canvas);
    button.textContent = "Copied ✓";
  } catch {
    button.textContent = "Copy failed";
  } finally {
    setTimeout(() => {
      button.textContent = originalLabel;
    }, 1500);
  }
}

function resetToIdle(): void {
  state = { phase: "idle" };
  view.reset();
  emptyState.hidden = false;
  canvasEl.hidden = true;
  toolbar.hidden = true;
  setStatus("Paste, drop or select an image");
}

setupImageLoader(fileInput, dropZone, {
  onImage: (image) => showImage(image),
  onNoImage: () => setStatus("No image found — please try again"),
});

copyTopBtn.addEventListener("click", () => {
  if (state.phase === "split") void handleCopy(state.top, copyTopBtn);
});

copyBottomBtn.addEventListener("click", () => {
  if (state.phase === "split") void handleCopy(state.bottom, copyBottomBtn);
});

resetBtn.addEventListener("click", resetToIdle);

window.addEventListener("resize", () => {
  if (state.phase === "loaded") {
    const maxWidth = dropZone.clientWidth - 32;
    const maxHeight = dropZone.clientHeight - 32;
    view.show(state.image, maxWidth, maxHeight);
  }
});
