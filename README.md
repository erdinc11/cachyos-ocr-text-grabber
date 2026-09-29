# CachyOS OCR Text Grabber

A Linux system-tray app that grabs text from a selected area of the screen. The default shortcut is **Super (⌘) + Left Shift + 1**. Drag over any text, including text in images or terminal windows, and the recognized text is copied to the clipboard.

On KDE Wayland, the app captures the workspace through KWin and keeps the temporary frame in memory. It creates a local desktop entry so KWin can authorize screen capture. The selection overlay is rendered by the app; no system screenshot editor is opened.

## Download and run

Download the latest `.AppImage` from [GitHub Releases](https://github.com/erdinc11/cachyos-ocr-text-grabber/releases/latest). The package includes Electron, Tesseract, and the English and Turkish OCR models; Node.js and Tesseract do not need to be installed separately. The AppImage runtime requires FUSE 2. On CachyOS or Arch Linux, install it with:

```sh
sudo pacman -S fuse2
```

Then allow the AppImage to run in the file's Properties and double-click it.

To run it from a terminal:

```sh
chmod +x CachyOS-OCR-Text-Grabber-*.AppImage
./CachyOS-OCR-Text-Grabber-*.AppImage
```

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

The AppImage is written to `dist/`. It includes Electron, Tesseract, both OCR models, and Tesseract's shared libraries. The target machine still needs the standard Linux desktop libraries used by Electron. KDE Wayland screen capture requires KWin.

The tray menu provides text capture, the last 50 copied results, launch at system startup, settings, and quit. OCR crops are processed in memory and are not saved to disk. History text is stored in the app's user settings.
