// FFmpeg.wasm v0.12+ API (FFmpeg class)
let ffmpegInstance: any | null = null;
let ffmpegLoadingPromise: Promise<void> | null = null;

async function ensureFfmpegLoaded(): Promise<void> {
  if (ffmpegInstance) return;
  if (ffmpegLoadingPromise) return ffmpegLoadingPromise;

  ffmpegLoadingPromise = (async () => {
    // Tenta usar pacote local; se não houver, cai para CDN
    let FFmpegCtor: any;
    try {
      // @ts-ignore - optional local dependency
      FFmpegCtor = (await import(/* @vite-ignore */ '@ffmpeg/ffmpeg')).FFmpeg;
    } catch {
      // @ts-ignore - CDN fallback
      FFmpegCtor = (await import(/* @vite-ignore */ 'https://esm.sh/@ffmpeg/ffmpeg@0.12.6')).FFmpeg;
    }

    ffmpegInstance = new FFmpegCtor();
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      await ffmpegInstance.load({
        coreURL: origin + '/ffmpeg/ffmpeg-core.js',
        wasmURL: origin + '/ffmpeg/ffmpeg-core.wasm',
        workerURL: origin + '/ffmpeg/ffmpeg-core.worker.js',
      });
    } catch (e) {
      // Fallback para CDN se arquivos locais não estiverem disponíveis
      await ffmpegInstance.load({
        coreURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.js',
        wasmURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.wasm',
        workerURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/ffmpeg-core.worker.js',
      });
    }
  })();

  return ffmpegLoadingPromise;
}

export async function convertOpusToMp3(inputFile: File): Promise<File> {
  try {
    await ensureFfmpegLoaded();

    const inputName = 'input.opus';
    const outputName = 'output.mp3';

    // Pequeno helper para ler o arquivo como Uint8Array (evita depender de @ffmpeg/util types)
    const fetchFile = async (f: File) => new Uint8Array(await f.arrayBuffer());
    await ffmpegInstance.writeFile(inputName, await fetchFile(inputFile));

    await ffmpegInstance.exec(['-i', inputName, '-vn', '-ac', '2', '-b:a', '128k', outputName]);

    const out = await ffmpegInstance.readFile(outputName);
    const blob = new Blob([out], { type: 'audio/mpeg' });
    const newName = inputFile.name.replace(/\.opus$/i, '.mp3');
    const mp3File = new File([blob], newName, { type: 'audio/mpeg', lastModified: Date.now() });

    // Cleanup fs
    try { await ffmpegInstance.deleteFile(inputName); } catch {}
    try { await ffmpegInstance.deleteFile(outputName); } catch {}

    return mp3File;
  } catch (err) {
    console.warn('[audioConverter] FFmpeg conversion failed, using original file.', err);
    return inputFile;
  }
}

export function shouldConvertToMp3(file: File): boolean {
  const isOpusMime = file.type?.toLowerCase() === 'audio/opus';
  const isOpusExt = file.name.toLowerCase().endsWith('.opus');
  return isOpusMime || isOpusExt;
}


