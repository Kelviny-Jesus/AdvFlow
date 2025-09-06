/**
 * Tipos para o sistema de adapters
 */

import type { 
  Client, 
  Case, 
  FileItem, 
  FolderItem, 
  Settings, 
  Petition, 
  Fact,
  ApiResponse 
} from '@/types';

// Interfaces dos adapters
export interface ClientAdapter {
  getClients(): Promise<Client[]>;
  getClientById(id: string): Promise<Client | null>;
  createClient(data: Omit<Client, 'id' | 'createdAt' | 'casesCount'>): Promise<Client>;
  updateClient(id: string, updates: Partial<Omit<Client, 'id' | 'createdAt'>>): Promise<Client>;
  deleteClient(id: string): Promise<void>;
  searchClients(query: string): Promise<Client[]>;
  getClientCasesCount(clientId: string): Promise<number>;
}

export interface CaseAdapter {
  getCases(clientId?: string): Promise<Case[]>;
  getCaseById(id: string): Promise<Case | null>;
  createCase(data: Omit<Case, 'id' | 'createdAt' | 'documentsCount'>): Promise<Case>;
  updateCase(id: string, updates: Partial<Omit<Case, 'id' | 'createdAt' | 'clientId'>>): Promise<Case>;
  deleteCase(id: string): Promise<void>;
  searchCases(clientId: string, query: string): Promise<Case[]>;
}

export interface DocumentAdapter {
  uploadFile(file: File, folderPath: string, onProgress?: (progress: number) => void): Promise<string>;
  createDocument(data: {
    name: string;
    mimeType: string;
    size: number;
    clientId: string;
    caseId: string;
    folderId?: string;
    type: string;
    docNumber?: string;
    description?: string;
    supabaseStoragePath: string;
  }): Promise<FileItem>;
  getDocuments(filters?: {
    clientId?: string;
    caseId?: string;
    folderId?: string;
    type?: string;
  }): Promise<FileItem[]>;
  getDocumentById(id: string): Promise<FileItem | null>;
  updateDocument(id: string, updates: Partial<{
    name: string;
    docNumber: string;
    description: string;
    folderId: string;
  }>): Promise<FileItem>;
  deleteDocument(id: string): Promise<void>;
  searchDocuments(query: string, filters?: {
    clientId?: string;
    caseId?: string;
    folderId?: string;
  }): Promise<FileItem[]>;
  getDownloadUrl(documentId: string, expiresIn?: number): Promise<string>;
  getNextDocNumber(clientId: string): Promise<string>;
}

export interface FolderAdapter {
  getFolders(parentId?: string, clientId?: string): Promise<FolderItem[]>;
  getFolderById(id: string): Promise<FolderItem | null>;
  createFolder(data: {
    name: string;
    kind: string;
    parentId?: string;
    clientId?: string;
    caseId?: string;
    path: string;
  }): Promise<FolderItem>;
  updateFolder(id: string, updates: Partial<{
    name: string;
    path: string;
  }>): Promise<FolderItem>;
  deleteFolder(id: string): Promise<void>;
  searchFolders(query: string, clientId?: string): Promise<FolderItem[]>;
  getFolderPath(folderId: string): Promise<string>;
}

export interface PetitionAdapter {
  createPetition(data: {
    title: string;
    clientId: string;
    caseId: string;
    content: string;
    status?: string;
    template?: string;
  }): Promise<Petition>;
  getPetitions(filters?: {
    clientId?: string;
    caseId?: string;
    status?: string;
  }): Promise<Petition[]>;
  getPetitionById(id: string): Promise<Petition | null>;
  updatePetition(id: string, updates: Partial<{
    title: string;
    content: string;
    status: string;
    template: string;
  }>): Promise<Petition>;
  deletePetition(id: string): Promise<void>;
  addFactToPetition(petitionId: string, fact: {
    type: string;
    text: string;
    documentRefs?: string[];
    tags?: string[];
    confidence?: number;
  }): Promise<Fact>;
  exportPetition(id: string, format: 'docx' | 'pdf'): Promise<Blob>;
}

export interface SettingsAdapter {
  getUserSettings(): Promise<Settings>;
  updateUserSettings(settings: Partial<Settings>): Promise<Settings>;
  resetToDefaults(): Promise<Settings>;
}

// Interface principal do adapter
export interface DataAdapter {
  clients: ClientAdapter;
  cases: CaseAdapter;
  documents: DocumentAdapter;
  folders: FolderAdapter;
  petitions: PetitionAdapter;
  settings: SettingsAdapter;
}

// Configuração do ambiente
export interface AdapterConfig {
  environment: 'development' | 'production' | 'test';
  useMockData: boolean;
  supabaseUrl?: string;
  supabaseKey?: string;
}
