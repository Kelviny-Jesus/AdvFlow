export async function convertImageToPdfViaBackend(
  file: File,
  onProgress?: (status: string) => void
): Promise<File> {
  const formData = new FormData();
  formData.append('image', file);

  onProgress?.('Enviando imagem para o servidor...');
  const response = await fetch('/api/ocr/convert-image-to-pdf', { method: 'POST', body: formData });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({} as any));
    throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
  }

  onProgress?.('Recebendo PDF processado...');
  const blob = await response.blob();
  const fileName = file.name.replace(/\.(jpg|jpeg|png|webp)$/i, '_vision_ocr.pdf');
  return new File([blob], fileName, { type: 'application/pdf', lastModified: Date.now() });
}

export async function extractTextViaBackend(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('image', file);
  const response = await fetch('/api/ocr/extract-text', { method: 'POST', body: formData });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({} as any));
    throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
  }
  const data = await response.json();
  return data.text as string;
}

export function shouldConvertImageForVision(file: File): boolean {
  const type = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const isImageType = type.startsWith('image/');
  const hasImageExt = /\.(jpg|jpeg|png|webp|tif|tiff|heic|heif|bmp)$/i.test(name);
  return isImageType || hasImageExt;
}

export async function convertPdfToPdfViaBackend(
  file: File,
  onProgress?: (status: string) => void
): Promise<File> {
  const formData = new FormData();
  formData.append('pdf', file);

  onProgress?.('Enviando PDF para OCR (Vision)...');
  const response = await fetch('/api/ocr/convert-pdf-to-pdf', { method: 'POST', body: formData });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({} as any));
    throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
  }
  onProgress?.('Recebendo PDF pesquisável...');
  const blob = await response.blob();
  const fileName = file.name.replace(/\.pdf$/i, '_vision_ocr.pdf');
  return new File([blob], fileName, { type: 'application/pdf', lastModified: Date.now() });
}


