import { mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

function tryCopy(src, dest) {
  try {
    if (existsSync(dest)) return true;
    if (!src) return false;
    copyFileSync(src, dest);
    return true;
  } catch {
    return false;
  }
}

function main() {
  const require = createRequire(import.meta.url);
  // Prefer ESM dist paths; fall back to UMD if needed
  let esmDir;
  let umdDir;
  try {
    const esmEntry = require.resolve('@ffmpeg/core/dist/esm/ffmpeg-core.js');
    esmDir = dirname(esmEntry);
  } catch {}
  if (!esmDir || !umdDir) {
    const nmDist = join(process.cwd(), 'node_modules', '@ffmpeg', 'core', 'dist');
    const esmGuess = join(nmDist, 'esm');
    const umdGuess = join(nmDist, 'umd');
    if (existsSync(join(esmGuess, 'ffmpeg-core.js'))) esmDir = esmDir || esmGuess;
    if (existsSync(join(umdGuess, 'ffmpeg-core.js'))) umdDir = umdDir || umdGuess;
  }
  try {
    const umdEntry = require.resolve('@ffmpeg/core/dist/umd/ffmpeg-core.js');
    umdDir = dirname(umdEntry);
  } catch {}

  const publicDir = join(__dirname, '..', 'public', 'ffmpeg');
  ensureDir(publicDir);

  const candidates = {
    js: [
      esmDir && join(esmDir, 'ffmpeg-core.js'),
      umdDir && join(umdDir, 'ffmpeg-core.js'),
    ],
    wasm: [
      esmDir && join(esmDir, 'ffmpeg-core.wasm'),
      umdDir && join(umdDir, 'ffmpeg-core.wasm'),
    ],
    worker: [
      esmDir && join(esmDir, 'ffmpeg-core.worker.js'),
      umdDir && join(umdDir, 'ffmpeg-core.worker.js'),
    ],
  };

  const targets = {
    js: join(publicDir, 'ffmpeg-core.js'),
    wasm: join(publicDir, 'ffmpeg-core.wasm'),
    worker: join(publicDir, 'ffmpeg-core.worker.js'),
  };

  let ok = true;
  for (const key of Object.keys(candidates)) {
    const list = candidates[key];
    let copied = false;
    for (const src of list) {
      if (tryCopy(src, targets[key])) {
        copied = true;
        break;
      }
    }
    if (!copied) ok = false;
  }

  if (!ok) {
    // eslint-disable-next-line no-console
    console.warn('[setup-ffmpeg] Warn: Could not copy all FFmpeg core files.');
  } else {
    // eslint-disable-next-line no-console
    console.log('[setup-ffmpeg] FFmpeg core files ready at public/ffmpeg');
  }
}

main();


