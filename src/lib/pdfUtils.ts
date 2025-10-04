export async function renderPdfFirstPageToPng(url: string, scale: number = 2): Promise<string> {
  // Import ESM diretamente do unpkg (garante getDocument)
  // @ts-ignore
  const pdfjsLib = await import(/* @vite-ignore */ 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.mjs');
  const loadingTask = (pdfjsLib as any).getDocument({ url });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL('image/png');
}


