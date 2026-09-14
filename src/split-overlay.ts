import type { PartIndex, SplitOrientation } from "./types";

export function positionOverlay(
  element: HTMLElement,
  orientation: SplitOrientation,
  partIndex: PartIndex,
  linePos: number,
  width: number,
  height: number,
): void {
  element.style.top = "";
  element.style.left = "";
  element.style.width = "";
  element.style.height = "";

  if (orientation === "vertical") {
    element.style.top = "0";
    element.style.height = `${height}px`;
    if (partIndex === 0) {
      element.style.left = "0";
      element.style.width = `${linePos}px`;
    } else {
      element.style.left = `${linePos}px`;
      element.style.width = `${width - linePos}px`;
    }
    return;
  }

  if (partIndex === 0) {
    element.style.top = "0";
    element.style.height = `${linePos}px`;
  } else {
    element.style.top = `${linePos}px`;
    element.style.height = `${height - linePos}px`;
  }
}
