# CachyOS OCR Text Grabber

A Linux system-tray app that grabs text from a selected area of the screen. The default shortcut is **Super (⌘) + Left Shift + 1**. Drag over any text, including text in images or terminal windows, and the recognized text is copied to the clipboard.

On KDE Wayland, the app captures the workspace through KWin and keeps the temporary frame in memory. It creates a local desktop entry so KWin can authorize screen capture. The selection overlay is rendered by the app; no system screenshot editor is opened.

## Run from source

- Install Node.js, npm, Tesseract, and the English `eng.traineddata` model.
- The Turkish `tur.traineddata` model is included in this repository.
- Run `npm install`, then `npm start` from the project directory.

The tray menu provides text capture, the last 50 copied results, launch at system startup, settings, and quit. OCR crops are processed in memory and are not saved to disk. History text is stored in the app's user settings.

KDE Wayland screen capture requires KWin.
