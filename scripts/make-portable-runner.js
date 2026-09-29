const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const version = require(path.join(root, 'package.json')).version;
const appDir = path.join(root, 'squashfs-root');
const outputDir = path.join(root, 'dist');
const output = path.join(outputDir, `CachyOS-OCR-Text-Grabber-${version}-x86_64.run`);
fs.mkdirSync(outputDir, { recursive: true });
const appImage = path.join(outputDir, `CachyOS-OCR-Text-Grabber-${version}-x86_64.AppImage`);
if (!fs.existsSync(appImage)) throw new Error('Build the AppImage before creating the portable runner.');
fs.rmSync(appDir, { recursive: true, force: true });
const extract = spawnSync(appImage, ['--appimage-extract'], { cwd: root, stdio: 'ignore' });
if (extract.error) throw extract.error;
if (extract.status !== 0 || !fs.existsSync(path.join(appDir, 'AppRun'))) throw new Error('Could not extract the AppImage payload.');

const header = `#!/bin/sh
set -eu
VERSION='${version}'
CACHE_ROOT="\${XDG_CACHE_HOME:-\${HOME:?}/.cache}/cachyos-ocr-text-grabber"
APP_DIR="$CACHE_ROOT/$VERSION"
if [ ! -x "$APP_DIR/AppRun" ]; then
  mkdir -p "$CACHE_ROOT"
  TEMP_DIR=$(mktemp -d "$CACHE_ROOT/.extract.XXXXXX")
  trap 'rm -rf "$TEMP_DIR"' EXIT HUP INT TERM
  PAYLOAD_LINE=$(awk '$0 == "__GRAB2TEXT_PAYLOAD_BELOW__" { print NR + 1; exit }' "$0")
  [ -n "$PAYLOAD_LINE" ] || { echo 'Package data is missing.' >&2; exit 1; }
  tail -n +"$PAYLOAD_LINE" "$0" | tar -xz -C "$TEMP_DIR"
  rm -rf "$APP_DIR"
  mv "$TEMP_DIR" "$APP_DIR"
  trap - EXIT HUP INT TERM
fi
exec "$APP_DIR/AppRun" --ozone-platform=x11 "$@"
__GRAB2TEXT_PAYLOAD_BELOW__
`;
fs.writeFileSync(output, header, { mode: 0o755 });
const fd = fs.openSync(output, 'a');
const result = spawnSync('tar', ['-czf', '-', '-C', appDir, '.'], { stdio: ['ignore', fd, 'inherit'] });
fs.closeSync(fd);
if (result.error) throw result.error;
if (result.status !== 0) throw new Error(`tar failed with status ${result.status}`);
fs.chmodSync(output, 0o755);
console.log(`Created ${path.relative(root, output)}`);
