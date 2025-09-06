import { Document } from "@/types/document";

export function getDocumentIcon(type: Document['type']): string {
  switch (type) {
    case 'pdf':
      return 'PDF';
    case 'word':
      return 'DOC';
    case 'excel':
      return 'XLS';
    case 'image':
      return 'IMG';
    case 'audio':
      return 'MP3';
    default:
      return 'FILE';
  }
}

export function getDocumentIconClass(type: Document['type']): string {
  switch (type) {
    case 'pdf':
      return 'doc-icon-pdf';
    case 'word':
      return 'doc-icon-word';
    case 'excel':
      return 'doc-icon-excel';
    case 'image':
      return 'doc-icon-image';
    case 'audio':
      return 'doc-icon-audio';
    default:
      return 'doc-icon-default';
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getStatusColor(status: Document['status']): string {
  switch (status) {
    case 'completed':
      return 'text-success';
    case 'processing':
      return 'text-warning';
    case 'error':
      return 'text-destructive';
    default:
      return 'text-muted-foreground';
  }
}

export function getStatusBadgeVariant(status: Document['status']): 'default' | 'secondary' | 'destructive' {
  switch (status) {
    case 'completed':
      return 'default';
    case 'processing':
      return 'secondary';
    case 'error':
      return 'destructive';
    default:
      return 'secondary';
  }
}

export function generateFileName(originalName: string, client: string, caseName: string): string {
  const timestamp = new Date().toISOString().slice(0, 10);
  const sanitizedClient = client.replace(/[^a-zA-Z0-9]/g, '_');
  const sanitizedCase = caseName.replace(/[^a-zA-Z0-9]/g, '_');
  const extension = originalName.split('.').pop();
  
  return `${sanitizedClient}_${sanitizedCase}_${timestamp}_${originalName.split('.')[0]}.${extension}`;
}

export function detectFileType(fileName: string): Document['type'] {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return 'pdf';
    case 'doc':
    case 'docx':
      return 'word';
    case 'xls':
    case 'xlsx':
      return 'excel';
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
    default:
      return 'other';
  }
}