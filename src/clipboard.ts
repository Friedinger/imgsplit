export async function copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<void> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png");
  });

  if (!blob) {
    throw new Error("Canvas could not be converted to an image.");
  }

  await navigator.clipboard.write([
    new ClipboardItem({ "image/png": blob }),
  ]);
}
