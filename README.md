# CachyOS OCR Text Grabber

A Linux system-tray app that grabs text from a selected area of the screen. The default shortcut is **Super (⌘) + Left Shift + 1**. Drag over any text, including text in images or terminal windows, and the recognized text is copied to the clipboard.

On KDE Wayland, the app captures the workspace through KWin and keeps the temporary frame in memory. It creates a local desktop entry so KWin can authorize screen capture. The selection overlay is rendered by the app; no system screenshot editor is opened.

## Install and run on another Linux computer

Install Node.js with npm, Tesseract, and Tesseract's English `eng.traineddata` model on that computer. The Turkish `tur.traineddata` model is included in this repository. Use your Linux distribution's package manager to install these prerequisites.

Download the project from GitHub with Git:

```sh
git clone https://github.com/erdinc11/cachyos-ocr-text-grabber.git
cd cachyos-ocr-text-grabber
npm install
npm start
```

You can also download and extract the repository's ZIP archive, then run `npm install` and `npm start` from the extracted project directory. The app runs in the system tray; its default capture shortcut is **Super + Left Shift + 1**. KDE Wayland screen capture requires KWin.

The tray menu provides text capture, the last 50 copied results, launch at system startup, settings, and quit. OCR crops are processed in memory and are not saved to disk. History text is stored in the app's user settings.
