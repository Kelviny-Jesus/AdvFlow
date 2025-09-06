import type { FileItem, Settings } from "@/types";

export function getFileIcon(type: FileItem['type'] | string): string {
  switch (type.toLowerCase()) {
    case 'pdf':
      return '📄';
    case 'docx':
    case 'doc':
      return '📝';
    case 'image':
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return '🖼️';
    case 'audio':
    case 'mp3':
    case 'wav':
      return '🎵';
    case 'video':
    case 'mp4':
    case 'avi':
      return '🎬';
    case 'zip':
    case 'rar':
      return '📦';
    default:
      return '📄';
  }
}

export function getFileIconClass(type: FileItem['type'] | string): string {
  switch (type.toLowerCase()) {
    case 'pdf':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'docx':
    case 'doc':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'image':
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'audio':
    case 'mp3':
    case 'wav':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'video':
    case 'mp4':
    case 'avi':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
    case 'zip':
    case 'rar':
      return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function detectFileType(fileName: string): FileItem['type'] {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return 'pdf';
    case 'doc':
    case 'docx':
      return 'docx';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'svg':
      return 'image';
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'm4a':
      return 'audio';
    case 'mp4':
    case 'avi':
    case 'mov':
    case 'wmv':
      return 'video';
    case 'zip':
    case 'rar':
    case '7z':
      return 'zip';
    default:
      return 'other';
  }
}

export function generateFileName(
  originalName: string, 
  clientName: string, 
  documentType: string, 
  processingDate: Date,
  settings: Settings['naming'],
  sequenceNumber: number
): string {
  let pattern = settings.pattern;
  
  // Sanitize client name
  let client = clientName;
  if (settings.uppercaseClient) {
    client = client.toUpperCase();
  }
  if (settings.useUnderscores) {
    client = client.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_]/g, '');
  }
  
  // Format date
  const date = processingDate.toISOString().slice(0, 10);
  
  // Format sequence
  const seq = String(sequenceNumber).padStart(3, '0');
  
  // Get file extension
  const extension = originalName.split('.').pop();
  
  // Replace placeholders
  pattern = pattern
    .replace('{seq}', seq)
    .replace('{client}', client)
    .replace('{type}', documentType)
    .replace('{date}', date);
  
  return `${pattern}.${extension}`;
}

export function extractDocumentNumber(fileName: string): string | undefined {
  const match = fileName.match(/DOC\s+n\.\s+(\d+)/i);
  return match ? `DOC n. ${match[1]}` : undefined;
}

export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

export function isPdfFile(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

export function isAudioFile(mimeType: string): boolean {
  return mimeType.startsWith('audio/');
}

export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

export function canPreview(mimeType: string): boolean {
  return isImageFile(mimeType) || isPdfFile(mimeType);
}

export function getMimeTypeFromExtension(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    mp4: 'video/mp4',
    avi: 'video/x-msvideo',
    zip: 'application/zip',
    rar: 'application/vnd.rar',
  };
  
  return mimeTypes[extension || ''] || 'application/octet-stream';
}