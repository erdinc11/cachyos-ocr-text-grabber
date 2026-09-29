const { app, BrowserWindow, Tray, Menu, globalShortcut, desktopCapturer, screen, clipboard, ipcMain, nativeImage } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { sessionBus, Message } = require('dbus-next');
const DEFAULT_SHORTCUT = 'Super+Shift+1';
let tray, settingsWindow, overlays = [], idleOverlays = [], toastWindow;
let config = { shortcut: DEFAULT_SHORTCUT, launchAtLogin: false, history: [] };
let ocrDataDir, ocrLanguages = 'eng', ocrBinary = 'tesseract', ocrLibraryDir;
const configFile = () => path.join(app.getPath('userData'), 'settings.json');
function usesKwinWayland() { return process.platform === 'linux' && (process.env.GRAB2TEXT_WAYLAND === '1' || (process.env.XDG_SESSION_TYPE === 'wayland' && /KDE/i.test(process.env.XDG_CURRENT_DESKTOP || ''))); }
function saveConfig() { fs.mkdirSync(path.dirname(configFile()), { recursive: true }); fs.writeFileSync(configFile(), JSON.stringify(config, null, 2)); }
function loadConfig() { try { config = { ...config, ...JSON.parse(fs.readFileSync(configFile(), 'utf8')) }; if (!Array.isArray(config.history)) config.history = []; } catch {} }
function prepareOcrData() {
  if (app.isPackaged) {
    const bundledOcr = path.join(process.resourcesPath, 'ocr');
    ocrBinary = path.join(bundledOcr, 'bin', 'tesseract');
    ocrDataDir = path.join(bundledOcr, 'tessdata');
    ocrLibraryDir = path.join(bundledOcr, 'lib');
    ocrLanguages = 'tur+eng';
    return;
  }
  const dirs = [process.env.TESSDATA_PREFIX, '/usr/share/tessdata', '/usr/share/tesseract-ocr/5/tessdata', '/usr/share/tesseract-ocr/4.00/tessdata'].filter(Boolean);
  const find = name => dirs.map(dir => path.join(dir, name + '.traineddata')).find(file => fs.existsSync(file));
  const targetDir = path.join(app.getPath('userData'), 'tessdata');
  fs.mkdirSync(targetDir, { recursive: true });
  const copyModel = (name, source) => {
    if (!source) return false;
    const target = path.join(targetDir, name + '.traineddata');
    try {
      if (fs.existsSync(target) && fs.statSync(target).size === fs.statSync(source).size) return true;
      try { fs.unlinkSync(target); } catch {}
      if (name === 'eng') fs.symlinkSync(source, target);
      else fs.copyFileSync(source, target);
      return true;
    } catch { try { fs.copyFileSync(source, target); return true; } catch { return false; } }
  };
  const english = copyModel('eng', find('eng'));
  const turkish = copyModel('tur', find('tur') || path.join(__dirname, 'assets', 'tessdata', 'tur.traineddata'));
  ocrDataDir = targetDir;
  ocrLanguages = english && turkish ? 'tur+eng' : 'eng';
}
function ensureKwinDesktopEntry() {
  const dir = path.join(app.getPath('home'), '.local', 'share', 'applications');
  const file = path.join(dir, 'grab2text.desktop');
  const quote = value => '"' + String(value).replaceAll('"', '\\"') + '"';
  const contents = '[Desktop Entry]\nType=Application\nName=Grab2Text\nExec=' + quote(process.execPath) + ' --ozone-platform=x11 ' + quote(app.getAppPath()) + '\nNoDisplay=true\nTerminal=false\nX-KDE-DBUS-Restricted-Interfaces=org.kde.KWin.ScreenShot2\n';
  fs.mkdirSync(dir, { recursive: true });
  let changed = true;
  try { changed = fs.readFileSync(file, 'utf8') !== contents; } catch {}
  if (changed) { fs.writeFileSync(file, contents); spawn('kbuildsycoca6', ['--noincremental'], { stdio: 'ignore' }).on('error', () => {}); }
}
function iconImage() {
  return nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png'));
}
function showToast(message) {
  if (toastWindow && !toastWindow.isDestroyed()) toastWindow.destroy();
  const b = screen.getPrimaryDisplay().bounds;
  toastWindow = new BrowserWindow({ width: 190, height: 48, x: Math.round(b.x + (b.width - 190) / 2), y: Math.round(b.y + b.height - 105), frame: false, transparent: true, resizable: false, skipTaskbar: true, alwaysOnTop: true, focusable: false, show: false, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true } });
  toastWindow.loadFile('index.html', { query: { mode: 'toast', text: message } });
  toastWindow.once('ready-to-show', () => { toastWindow.showInactive(); setTimeout(() => { if (toastWindow && !toastWindow.isDestroyed()) toastWindow.destroy(); }, 1500); });
}
function writeAutostart(enabled) {
  const dir = path.join(app.getPath('home'), '.config', 'autostart'), file = path.join(dir, 'grab2text.desktop');
  if (!enabled) { try { fs.unlinkSync(file); } catch {} return; }
  fs.mkdirSync(dir, { recursive: true });
  const quote = s => '"' + String(s).replaceAll('"', '\\"') + '"';
  const wayland = usesKwinWayland();
  const prefix = wayland ? 'env -u WAYLAND_DISPLAY GRAB2TEXT_WAYLAND=1 XDG_SESSION_TYPE=x11 ' : '';
  const x11 = wayland ? ' --ozone-platform=x11' : '';
  fs.writeFileSync(file, '[Desktop Entry]\nType=Application\nName=Grab2Text\nExec=' + prefix + quote(process.execPath) + x11 + ' ' + quote(app.getAppPath()) + '\nTerminal=false\nX-GNOME-Autostart-enabled=true\n');
}
function refreshMenu() {
  if (!tray) return;
  const history = config.history.slice(0, 50);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Yakala  (' + config.shortcut.replace('Super', '⌘').replaceAll('+', ' + ') + ')', click: startCapture },
    { label: 'Geçmiş', submenu: history.length ? history.map((item, i) => ({ label: (i + 1) + '. ' + item.replace(/\s+/g, ' ').slice(0, 72), click: () => { clipboard.writeText(item); showToast('copied'); } })) : [{ label: 'Henüz metin yok', enabled: false }] },
    { label: 'Sistemle başlat', type: 'checkbox', checked: !!config.launchAtLogin, click: item => { config.launchAtLogin = item.checked; saveConfig(); writeAutostart(item.checked); } },
    { type: 'separator' },
    { label: 'Ayarlar', click: openSettings },
    { label: 'Tamamen kapat', click: () => app.quit() }
  ]));
}
function openSettings() {
  if (settingsWindow && !settingsWindow.isDestroyed()) { settingsWindow.show(); settingsWindow.focus(); return; }
  settingsWindow = new BrowserWindow({ width: 440, height: 390, title: 'Grab2Text Ayarları', resizable: false, autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true } });
  settingsWindow.loadFile('index.html', { query: { mode: 'settings' } });
  settingsWindow.on('closed', () => settingsWindow = null);
}
async function startCapture() {
  idleOverlays.forEach(win => { if (!win.isDestroyed()) win.destroy(); });
  idleOverlays = [];
  if (overlays.length) return;
  if (usesKwinWayland()) {
    try { await startKwinCapture(); } catch (error) { console.error('KWin screenshot failed:', error); showToast('no text'); }
    return;
  }
  const displays = screen.getAllDisplays();
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 3840, height: 2160 }, fetchWindowIcons: false });
    overlays = displays.map(display => {
      const source = sources.find(s => s.display_id === String(display.id)) || sources[displays.indexOf(display)];
      if (!source || source.thumbnail.isEmpty()) return null;
      const win = new BrowserWindow({ x: display.bounds.x, y: display.bounds.y, width: display.bounds.width, height: display.bounds.height, frame: false, transparent: true, backgroundColor: '#00000000', resizable: false, movable: false, skipTaskbar: true, alwaysOnTop: true, hasShadow: false, show: false, opacity: 0, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true } });
      win.setAlwaysOnTop(true, 'screen-saver');
      win.loadFile('index.html', { query: { mode: 'overlay' } });
      win.webContents.once('did-finish-load', () => win.webContents.send('overlay:init', { image: source.thumbnail.toDataURL(), display: { width: display.bounds.width, height: display.bounds.height, scaleFactor: display.scaleFactor } }));
      win.on('closed', () => { overlays = overlays.filter(w => w !== win); });
      return win;
    }).filter(Boolean);
  } catch (err) { overlays.forEach(w => w.destroy()); overlays = []; showToast('no text'); }
}
async function startKwinCapture() {
  const displays = screen.getAllDisplays();
  const bounds = displays.reduce((all, item) => ({ x: Math.min(all.x, item.bounds.x), y: Math.min(all.y, item.bounds.y), right: Math.max(all.right, item.bounds.x + item.bounds.width), bottom: Math.max(all.bottom, item.bounds.y + item.bounds.height) }), { x: Infinity, y: Infinity, right: -Infinity, bottom: -Infinity });
  const tempDir = fs.mkdtempSync(path.join('/dev/shm', 'grab2text-'));
  const framePath = path.join(tempDir, 'frame.raw');
  const fd = fs.openSync(framePath, 'w+');
  const bus = sessionBus({ negotiateUnixFd: true });
  let timeout;
  try {
    const request = bus.call(new Message({ destination: 'org.kde.KWin.ScreenShot2', path: '/org/kde/KWin/ScreenShot2', interface: 'org.kde.KWin.ScreenShot2', member: 'CaptureWorkspace', signature: 'a{sv}h', body: [{}, fd] }));
    const reply = await Promise.race([request, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('KWin capture timed out')), 6000); })]);
    if (reply.type !== 2 || !reply.body[0]) throw new Error('KWin capture failed');
    const metadata = reply.body[0], value = key => metadata[key] && metadata[key].value !== undefined ? metadata[key].value : metadata[key];
    const width = Number(value('width')), height = Number(value('height')), stride = Number(value('stride')), format = Number(value('format'));
    const expected = stride * height;
    if (!width || !height || !stride) throw new Error('Invalid KWin dimensions');
    let size = fs.fstatSync(fd).size;
    for (let attempt = 0; size < expected && attempt < 100; attempt++) { await new Promise(resolve => setTimeout(resolve, 15)); size = fs.fstatSync(fd).size; }
    if (size < expected) throw new Error('Incomplete KWin frame (' + size + '/' + expected + ')');
    const raw = Buffer.alloc(expected);
    fs.readSync(fd, raw, 0, expected, 0);
    const window = new BrowserWindow({ x: bounds.x, y: bounds.y, width: bounds.right - bounds.x, height: bounds.bottom - bounds.y, frame: false, transparent: true, backgroundColor: '#00000000', resizable: false, movable: false, skipTaskbar: true, alwaysOnTop: true, hasShadow: false, show: false, opacity: 0, webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true } });
    window.setAlwaysOnTop(true, 'screen-saver');
    window.loadFile('index.html', { query: { mode: 'overlay' } });
    window.webContents.once('did-finish-load', () => window.webContents.send('overlay:init', { image: raw, raw: true, width, height, stride, format }));
    window.on('closed', () => { overlays = overlays.filter(item => item !== window); });
    overlays = [window];
  } finally {
    if (timeout) clearTimeout(timeout);
    bus.disconnect();
    fs.closeSync(fd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
function doOcr(dataUrl) {
  const encoded = dataUrl.replace(/^data:image\/png;base64,/, '');
  const env = ocrLibraryDir ? { ...process.env, LD_LIBRARY_PATH: [ocrLibraryDir, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':') } : process.env;
  const child = spawn(ocrBinary, ['stdin', 'stdout', '--tessdata-dir', ocrDataDir, '-l', ocrLanguages, '--psm', '6'], { stdio: ['pipe', 'pipe', 'ignore'], env });
  const chunks = [];
  child.stdout.on('data', chunk => chunks.push(chunk));
  child.on('error', () => { showToast('no text'); });
  child.on('close', code => {
    const text = Buffer.concat(chunks).toString('utf8').trim();
    if (!code && text) { clipboard.writeText(text); config.history.unshift(text); config.history = config.history.slice(0, 50); saveConfig(); refreshMenu(); showToast('text grabbed'); }
    else showToast('no text');
  });
  child.stdin.end(Buffer.from(encoded, 'base64'));
}
function registerShortcut() {
  globalShortcut.unregisterAll();
  if (!globalShortcut.register(config.shortcut, startCapture)) { config.shortcut = DEFAULT_SHORTCUT; saveConfig(); globalShortcut.register(DEFAULT_SHORTCUT, startCapture); }
}
app.whenReady().then(() => {
  loadConfig();
  prepareOcrData();
  if (usesKwinWayland()) ensureKwinDesktopEntry();
  if (config.launchAtLogin) writeAutostart(true);
  tray = new Tray(iconImage()); tray.setToolTip('Grab2Text'); refreshMenu(); registerShortcut();
  app.on('activate', openSettings);
});
app.on('window-all-closed', () => {});
app.on('will-quit', () => globalShortcut.unregisterAll());
ipcMain.handle('config:get', () => ({ shortcut: config.shortcut, launchAtLogin: config.launchAtLogin }));
ipcMain.handle('config:shortcut', (_event, shortcut) => {
  const previous = config.shortcut;
  globalShortcut.unregisterAll();
  if (!globalShortcut.register(shortcut, startCapture)) { globalShortcut.register(previous, startCapture); return { ok: false, shortcut: previous }; }
  config.shortcut = shortcut; saveConfig(); refreshMenu(); return { ok: true, shortcut };
});
function destroyOverlay(win) {
  if (!win || win.isDestroyed()) return;
  overlays = overlays.filter(item => item !== win);
  win.setOpacity(0);
  win.setIgnoreMouseEvents(true);
  win.setFocusable(false);
  if (!idleOverlays.includes(win)) idleOverlays.push(win);
}
ipcMain.on('overlay:cancel', event => destroyOverlay(BrowserWindow.fromWebContents(event.sender)));
ipcMain.on('overlay:ready', event => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || !overlays.includes(win)) return;
  win.show();
  setTimeout(() => { if (!win.isDestroyed() && overlays.includes(win)) win.setOpacity(1); }, 24);
});
ipcMain.on('overlay:selection', (event, data) => { destroyOverlay(BrowserWindow.fromWebContents(event.sender)); if (data.image) doOcr(data.image); else showToast('no text'); });
