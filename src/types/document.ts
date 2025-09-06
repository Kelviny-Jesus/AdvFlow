export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'word' | 'excel' | 'image' | 'audio' | 'other';
  size: number;
  uploadDate: Date;
  client: string;
  case: string;
  status: 'processing' | 'completed' | 'error';
  url?: string;
  thumbnail?: string;
  metadata?: {
    [key: string]: any;
  };
}

export interface Client {
  id: string;
  name: string;
  email?: string;
  cases: Case[];
}

export interface Case {
  id: string;
  name: string;
  clientId: string;
  documents: Document[];
  createdAt: Date;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

export type DocumentFilter = {
  search?: string;
  client?: string;
  case?: string;
  type?: Document['type'];
  dateFrom?: Date;
  dateTo?: Date;
  status?: Document['status'];
};

export type SortField = 'name' | 'uploadDate' | 'client' | 'case' | 'size';
export type SortOrder = 'asc' | 'desc';