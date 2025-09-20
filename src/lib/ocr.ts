import { createWorker } from 'tesseract.js';
import { PDFDocument, rgb } from 'pdf-lib';

let ocrWorker: any | null = null;
let ocrLoading: Promise<void> | null = null;

async function initializeOCR(): Promise<void> {
  if (ocrWorker) return;
  if (ocrLoading) return ocrLoading;

  ocrLoading = (async () => {
    const worker = await createWorker();
    await worker.loadLanguage('por');
    await worker.initialize('por');
    ocrWorker = worker;
  })();

  return ocrLoading;
}

export function shouldConvertImageToPdf(file: File): boolean {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return imageTypes.includes(file.type?.toLowerCase());
}

export async function convertImageToSearchablePdf(
  inputFile: File,
  onProgress?: (status: string, progress?: number) => void
): Promise<File> {
  onProgress?.('Inicializando OCR...', 0);
  await initializeOCR();

  onProgress?.('Extraindo texto da imagem...', 25);
  const { data } = await ocrWorker!.recognize(inputFile);

  onProgress?.('Criando PDF com texto extraível...', 75);

  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage();
  let { width, height } = page.getSize();

  const fontSize = 12;
  const lineHeight = 16;
  const margin = 50;

  const maxWidth = width - margin * 2;
  const words = (data.text || '').split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length * (fontSize * 0.6) < maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  let y = height - margin;
  for (const line of lines) {
    if (y < margin) {
      page = pdfDoc.addPage();
      ({ width, height } = page.getSize());
      y = height - margin;
    }
    page.drawText(line, { x: margin, y, size: fontSize, color: rgb(0, 0, 0) });
    y -= lineHeight;
  }

  onProgress?.('Finalizando PDF...', 90);

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const newName = inputFile.name.replace(/\.(jpg|jpeg|png|webp)$/i, '_extracted.pdf');

  onProgress?.('Concluído!', 100);

  return new File([blob], newName, { type: 'application/pdf', lastModified: Date.now() });
}


