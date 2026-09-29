# CachyOS OCR Text Grabber

A Linux system-tray app that grabs text from a selected area of the screen. The default shortcut is **Super (⌘) + Left Shift + 1**. Drag over any text, including text in images or terminal windows, and the recognized text is copied to the clipboard.

On KDE Wayland, the app captures the workspace through KWin and keeps the temporary frame in memory. It creates a local desktop entry so KWin can authorize screen capture. The selection overlay is rendered by the app; no system screenshot editor is opened.

## Download and run

Download the latest `.AppImage` from [GitHub Releases](https://github.com/erdinc11/cachyos-ocr-text-grabber/releases/latest). Allow it to run in the file's Properties, then double-click it. The package includes Electron, Tesseract, and the English and Turkish OCR models; Node.js and Tesseract do not need to be installed separately. A working FUSE 2 setup is required by the AppImage runtime.

If FUSE 2 is unavailable, download the `.run` file from the same release instead. It includes the same app and OCR files and extracts them to `~/.cache/cachyos-ocr-text-grabber` on first launch.

To run it from a terminal:

```sh
chmod +x CachyOS-OCR-Text-Grabber-*.run
./CachyOS-OCR-Text-Grabber-*.run
```

On first launch, the app extracts its files to `~/.cache/cachyos-ocr-text-grabber`.

## Run from source

- Install Node.js, npm, Tesseract, and the English `eng.traineddata` model.
- The Turkish `tur.traineddata` model is included in this repository.
- Run `npm install`, then `npm start` from the project directory.

## Build a release package

On CachyOS/Arch Linux x86_64, install Tesseract and its English language data, then run:

```sh
npm install
npm run release:linux
```

The AppImage and self-extracting runner are written to `dist/`. Both include Electron, Tesseract, both OCR models, and Tesseract's shared libraries. The target machine still needs the standard Linux desktop libraries used by Electron. KDE Wayland screen capture requires KWin.

The tray menu provides text capture, the last 50 copied results, launch at system startup, settings, and quit. OCR crops are processed in memory and are not saved to disk. History text is stored in the app's user settings.
