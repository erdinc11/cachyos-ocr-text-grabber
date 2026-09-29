const { spawnSync } = require('node:child_process');
const version = require('electron/package.json').version;
const result = spawnSync('npm', ['rebuild', 'usocket', '--runtime=electron', '--target=' + version, '--dist-url=https://electronjs.org/headers'], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
