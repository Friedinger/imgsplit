export type ImageSource = "paste" | "drop" | "file";

export interface ImageLoaderOptions {
  onImage: (image: ImageBitmap, source: ImageSource) => void;
  onNoImage?: (source: ImageSource) => void;
}

function findImageBlob(items: DataTransferItemList | undefined): File | null {
  if (!items) return null;
  for (const item of items) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      return item.getAsFile();
    }
  }
  return null;
}

function findImageFile(files: FileList | undefined): File | null {
  if (!files || files.length === 0) return null;
  for (const file of files) {
    if (file.type.startsWith("image/")) return file;
  }
  return null;
}

export function setupImageLoader(
  fileInput: HTMLInputElement,
  dropZone: HTMLElement,
  options: ImageLoaderOptions,
): void {
  const handleBlob = async (blob: Blob, source: ImageSource) => {
    try {
      const bitmap = await createImageBitmap(blob);
      options.onImage(bitmap, source);
    } catch {
      options.onNoImage?.(source);
    }
  };

  window.addEventListener("paste", (event) => {
    const file = findImageBlob(event.clipboardData?.items);
    if (file) {
      event.preventDefault();
      void handleBlob(file, "paste");
    } else {
      options.onNoImage?.("paste");
    }
  });

  dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("drop-zone--active");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drop-zone--active");
  });

  dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("drop-zone--active");
    const file =
      findImageBlob(event.dataTransfer?.items) ??
      findImageFile(event.dataTransfer?.files);
    if (file) {
      void handleBlob(file, "drop");
    } else {
      options.onNoImage?.("drop");
    }
  });

  fileInput.addEventListener("change", () => {
    const file = findImageFile(fileInput.files ?? undefined);
    if (file) {
      void handleBlob(file, "file");
    } else {
      options.onNoImage?.("file");
    }
    fileInput.value = "";
  });
}
