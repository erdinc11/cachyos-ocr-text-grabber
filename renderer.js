const qs = new URLSearchParams(location.search);
const mode = qs.get('mode');
if (mode === 'settings') {
  document.body.style.background = '#18181b';
  const panel = document.getElementById('settings'), button = document.getElementById('shortcut');
  panel.hidden = false;
  const pretty = value => value.replace('Super', '⌘').replace('Command', '⌘').replace('Control', 'Ctrl').replace('Shift', 'Left Shift').replaceAll('+', ' + ');
  window.grab.getConfig().then(config => { button.textContent = pretty(config.shortcut); document.getElementById('current').textContent = pretty(config.shortcut); });
  let recording = false;
  button.addEventListener('click', () => { recording = true; button.classList.add('recording'); button.textContent = 'Press a new shortcut…'; });
  window.addEventListener('keydown', async event => {
    if (!recording) return;
    event.preventDefault(); event.stopPropagation();
    if (event.key === 'Escape') { recording = false; button.classList.remove('recording'); return; }
    const keyNames = { Digit0:'0',Digit1:'1',Digit2:'2',Digit3:'3',Digit4:'4',Digit5:'5',Digit6:'6',Digit7:'7',Digit8:'8',Digit9:'9',Space:'Space',ArrowUp:'Up',ArrowDown:'Down',ArrowLeft:'Left',ArrowRight:'Right',Enter:'Enter',Tab:'Tab',Backspace:'Backspace',Delete:'Delete',Comma:',',Period:'.',Minus:'-',Equal:'=',BracketLeft:'[',BracketRight:']',Slash:'/',Semicolon:';',Quote:"'",Backslash:'\\',Backquote:'`'};
    const key = keyNames[event.code] || (event.code.startsWith('Key') ? event.code.slice(3).toUpperCase() : event.code.match(/^F\d+$/) ? event.code : null);
    if (!key || ['Shift','Control','Alt','Meta'].includes(event.key)) return;
    const parts = [];
    if (event.metaKey) parts.push('Super');
    else if (event.ctrlKey) parts.push('Control');
    if (event.altKey) parts.push('Alt');
    if (event.shiftKey) parts.push('Shift');
    parts.push(key);
    const result = await window.grab.setShortcut(parts.join('+'));
    recording = false; button.classList.remove('recording');
    button.textContent = pretty(result.shortcut);
    document.getElementById('current').textContent = pretty(result.shortcut);
    document.getElementById('hint').textContent = result.ok ? 'Shortcut saved.' : 'This shortcut is unavailable; the previous shortcut was kept.';
  }, true);
} else if (mode === 'overlay') {
  document.body.style.background = 'transparent';
  const overlay = document.getElementById('overlay'), rect = document.getElementById('selection');
  overlay.hidden = false;
  let image = new Image(), start = null, active = false;
  window.grab.onOverlayInit(data => {
    image.onload = () => {
      image.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none';
      overlay.prepend(image);
      window.grab.overlayReady();
    };
    if (data.raw) {
      const raw = data.image instanceof Uint8Array ? data.image : Uint8Array.from(atob(data.image), char => char.charCodeAt(0));
      const canvas = document.createElement('canvas'); canvas.width = data.width; canvas.height = data.height;
      const context = canvas.getContext('2d'), pixels = context.createImageData(data.width, data.height);
      const bgra = [4, 5, 6].includes(data.format);
      for (let y = 0; y < data.height; y++) for (let x = 0; x < data.width; x++) {
        const src = y * data.stride + x * 4, dst = (y * data.width + x) * 4;
        if (bgra) { pixels.data[dst] = raw[src + 2]; pixels.data[dst + 1] = raw[src + 1]; pixels.data[dst + 2] = raw[src]; pixels.data[dst + 3] = raw[src + 3]; }
        else { pixels.data[dst] = raw[src]; pixels.data[dst + 1] = raw[src + 1]; pixels.data[dst + 2] = raw[src + 2]; pixels.data[dst + 3] = raw[src + 3]; }
      }
      context.putImageData(pixels, 0, 0); image.src = canvas.toDataURL('image/png');
    } else image.src = data.image;
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); clearOverlay(); requestAnimationFrame(() => requestAnimationFrame(() => window.grab.cancel())); }
  });
  overlay.addEventListener('mousedown', event => { if (event.button !== 0) return; event.preventDefault(); active = true; start = { x: event.clientX, y: event.clientY }; rect.style.display = 'block'; update(event.clientX, event.clientY); });
  window.addEventListener('mousemove', event => { if (active) update(event.clientX, event.clientY); });
  window.addEventListener('mouseup', event => {
    if (!active) return;
    active = false;
    const x = Math.min(start.x, event.clientX), y = Math.min(start.y, event.clientY), w = Math.abs(event.clientX - start.x), h = Math.abs(event.clientY - start.y);
    if (w < 5 || h < 5 || !image.complete || !image.naturalWidth) { clearOverlay(); requestAnimationFrame(() => requestAnimationFrame(() => window.grab.select({ image: null }))); return; }
    const sx = image.naturalWidth / overlay.clientWidth, sy = image.naturalHeight / overlay.clientHeight;
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(w * sx)); canvas.height = Math.max(1, Math.round(h * sy));
    const context = canvas.getContext('2d'); context.drawImage(image, Math.round(x * sx), Math.round(y * sy), canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
    const data = canvas.toDataURL('image/png');
    clearOverlay();
    requestAnimationFrame(() => requestAnimationFrame(() => window.grab.select({ image: data })));
  });
  function update(x, y) { const left = Math.min(start.x, x), top = Math.min(start.y, y); rect.style.left = left + 'px'; rect.style.top = top + 'px'; rect.style.width = Math.abs(x - start.x) + 'px'; rect.style.height = Math.abs(y - start.y) + 'px'; }
  function clearOverlay() { document.body.style.background = 'transparent'; image.remove(); overlay.style.backgroundImage = 'none'; overlay.style.backgroundColor = 'transparent'; overlay.hidden = true; }
} else if (mode === 'toast') {
  document.body.style.background = 'transparent';
  const toast = document.getElementById('toast'); toast.hidden = false;
  const span = document.createElement('span'); span.textContent = qs.get('text') || 'text grabbed'; toast.appendChild(span);
}
