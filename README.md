# ImgSplit

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-blue?style=flat-square)](https://friedinger.github.io/imgsplit/)
[![Build Status](https://img.shields.io/github/actions/workflow/status/Friedinger/imgsplit/build-deploy.yml?style=flat-square&label=Build%20and%20Deploy&color=lime)](https://github.com/Friedinger/imgsplit/actions/workflows/build-deploy.yml)
[![Last Commit](https://img.shields.io/github/last-commit/Friedinger/imgsplit?style=flat-square&color=orange)](https://github.com/Friedinger/imgsplit/commits/main)
[![License: MIT](https://img.shields.io/github/license/Friedinger/imgsplit?style=flat-square&color=yellow)](LICENSE)

A simple tool that splits an image into two parts in the browser. No server,
no uploads. Paste an image (Ctrl+V), drop it via drag & drop, or select it via
the file dialog, swipe to choose the split direction, click to split, and copy
both parts individually to the clipboard.

## Features

- Split an image horizontally or vertically into two parts with a click
- Load images by pasting (Ctrl+V), drag & drop, or file dialog
- Drag the split line to move it; click it to remove the split
- Copy each part individually to the clipboard
- Hover hints and copy feedback directly on the image
- Works entirely in the browser, your image never leaves your device

## Usage

1. Load an image by pasting, dragging & dropping, or selecting a file.
2. Move the pointer to preview the split direction, then click to split.
3. Hover a part and click to copy it to the clipboard.
4. Drag the line to adjust the split position, or click it to start over.

## Development

```sh
npm install
npm run dev
```

## Build

```sh
npm run build
npm run preview

npm run lint   # Prettier & ESLint
npm run fix    # Format and fix issues
```

## License

[MIT License](LICENSE) © 2026 Friedinger
