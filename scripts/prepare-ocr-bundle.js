const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const output = path.join(root, 'build', 'ocr');
const binary = process.env.GRAB2TEXT_TESSERACT || '/usr/bin/tesseract';
if (!fs.existsSync(binary)) throw new Error('Tesseract not found. Install tesseract before packaging.');

const tessdataDirs = [process.env.TESSDATA_PREFIX, '/usr/share/tessdata', '/usr/share/tesseract-ocr/5/tessdata', '/usr/share/tesseract-ocr/4.00/tessdata'].filter(Boolean);
const englishData = tessdataDirs.map(dir => path.join(dir, 'eng.traineddata')).find(file => fs.existsSync(file));
if (!englishData) throw new Error('English Tesseract data (eng.traineddata) not found.');

fs.rmSync(output, { recursive: true, force: true });
const binDir = path.join(output, 'bin');
const libDir = path.join(output, 'lib');
const dataDir = path.join(output, 'tessdata');
fs.mkdirSync(binDir, { recursive: true });
fs.mkdirSync(libDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });
fs.copyFileSync(binary, path.join(binDir, 'tesseract'));
fs.chmodSync(path.join(binDir, 'tesseract'), 0o755);
fs.copyFileSync(englishData, path.join(dataDir, 'eng.traineddata'));
fs.copyFileSync(path.join(root, 'assets', 'tessdata', 'tur.traineddata'), path.join(dataDir, 'tur.traineddata'));

const ldd = spawnSync('ldd', [binary], { encoding: 'utf8' });
if (ldd.status !== 0) throw new Error(ldd.stderr || 'Unable to inspect Tesseract libraries.');
for (const line of ldd.stdout.split('\n')) {
  const match = line.match(/=>\s+(\/\S+)/) || line.trim().match(/^(\/\S+)/);
  if (!match) continue;
  const source = match[1];
  const soname = path.basename(source);
  if (/^(libc|libm|libdl|libpthread|librt|libresolv)\.so|^ld-linux/.test(soname)) continue;
  fs.copyFileSync(source, path.join(libDir, soname));
}
console.log('Bundled Tesseract, English/Turkish models, and shared libraries into build/ocr.');
