// Types para o sistema DocFlow

export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  createdAt: string;
  casesCount?: number;
}

export interface Case {
  id: string;
  name: string;
  clientId: string;
  reference?: string;
  description?: string;
  status: 'active' | 'closed' | 'archived';
  createdAt: string;
  documentsCount?: number;
}

export interface FileItem {
  id: string;
  name: string;
  docNumber?: string; // "DOC n. 003"
  mimeType: string;
  size: number;
  clientId: string;
  caseId: string;
  folderId?: string;
  type: 'pdf' | 'docx' | 'image' | 'audio' | 'video' | 'zip' | 'other';
  webViewLink?: string;
  downloadLink?: string;
  thumbnailLink?: string;
  createdAt: string;
  modifiedAt: string;
  description?: string;
  extractedData?: string;
  extractionStatus?: 'pending' | 'processing' | 'completed' | 'failed' | 'not_supported';
  appProperties?: Record<string, string>;
}

export interface FolderItem {
  id: string;
  name: string;
  parentId?: string;
  kind: 'client' | 'case' | 'subfolder';
  itemsCount: number;
  documentsCount: number;
  subfolderCount: number;
  createdAt: string;
  clientId?: string; // Para subpastas, indica qual cliente pertencem
  caseId?: string; // Para pastas de caso, indica qual caso representa
  path: string; // Caminho completo da pasta (ex: "João Silva/Contratos")
}

export interface UploadDestination {
  type: 'existing_folder' | 'new_client' | 'new_subfolder';
  folderId?: string; // ID da pasta existente
  clientName?: string; // Nome do novo cliente
  subfolderName?: string; // Nome da nova subpasta
  parentFolderId?: string; // ID da pasta pai para nova subpasta
  isContext?: boolean; // Upload de contexto (sem renomeação por IA)
}

export interface UploadFile {
  id: string;
  file: File;
  clientId?: string;
  caseId?: string;
  folderId?: string; // ID da pasta de destino
  documentType?: string;
  processingDate?: Date;
  destination?: UploadDestination;
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  error?: string;
  result?: FileItem;
}

export interface Petition {
  id?: string;
  title: string;
  clientId: string;
  caseId: string;
  documentIds: string[];
  content: string; // markdown/HTML
  facts?: Fact[];
  template?: string;
  createdAt?: string;
  updatedAt?: string;
  status: 'draft' | 'review' | 'final';
}

export interface Fact {
  id: string;
  type: 'contratual' | 'processual' | 'probatório' | 'comunicação';
  text: string;
  documentRefs?: string[];
  tags?: string[];
  confidence?: number;
}

export interface Settings {
  naming: {
    pattern: string;
    uppercaseClient: boolean;
    useUnderscores: boolean;
    seqResetPerClient: boolean;
    dateFormat: string;
  };
  petition: {
    template: string;
    factCategories: string[];
    autoExtractFacts: boolean;
  };
  classification: {
    rules: ClassificationRule[];
    enabled: boolean;
  };
  integrations: {
    googleDrive: {
      connected: boolean;
      lastSync?: string;
    };
  };
}

export interface ClassificationRule {
  id: string;
  match: string;
  type: string;
  priority: number;
  enabled: boolean;
}

export interface DriveTreeParams {
  clientId?: string;
  caseId?: string;
  q?: string;
  type?: string;
  from?: string;
  to?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}

export interface UploadProgress {
  uploadId: string;
  fileId: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
}

export type ViewMode = 'grid' | 'list';
export type SortField = 'name' | 'createdAt' | 'size' | 'type';
export type SortOrder = 'asc' | 'desc';