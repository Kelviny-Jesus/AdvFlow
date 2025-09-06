/**
 * Adapter para dados mock - desenvolvimento
 */

import type { 
  Client, 
  Case, 
  FileItem, 
  FolderItem, 
  Settings, 
  Petition, 
  Fact 
} from '@/types';
import type { 
  ClientAdapter, 
  CaseAdapter, 
  DocumentAdapter, 
  FolderAdapter, 
  PetitionAdapter, 
  SettingsAdapter,
  DataAdapter 
} from './types';
import { 
  mockClients, 
  mockCases, 
  mockFiles, 
  mockFolders, 
  defaultSettings, 
  mockFacts 
} from '@/data/mocks';
import { logger } from '@/lib/logger';

// Simulação de delay de rede
const networkDelay = (ms: number = 300) => 
  new Promise(resolve => setTimeout(resolve, ms));

class MockClientAdapter implements ClientAdapter {
  async getClients(): Promise<Client[]> {
    await networkDelay();
    logger.debug('Mock: Fetching all clients', { count: mockClients.length }, 'MockAdapter');
    return [...mockClients];
  }

  async getClientById(id: string): Promise<Client | null> {
    await networkDelay();
    const client = mockClients.find(c => c.id === id) || null;
    logger.debug('Mock: Fetching client by ID', { id, found: !!client }, 'MockAdapter');
    return client;
  }

  async createClient(data: Omit<Client, 'id' | 'createdAt' | 'casesCount'>): Promise<Client> {
    await networkDelay();
    const newClient: Client = {
      ...data,
      id: `client-${Date.now()}`,
      createdAt: new Date().toISOString(),
      casesCount: 0,
    };
    mockClients.push(newClient);
    logger.info('Mock: Client created', { id: newClient.id, name: newClient.name }, 'MockAdapter');
    return newClient;
  }

  async updateClient(id: string, updates: Partial<Omit<Client, 'id' | 'createdAt'>>): Promise<Client> {
    await networkDelay();
    const index = mockClients.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('Cliente não encontrado');
    }
    
    mockClients[index] = { ...mockClients[index], ...updates };
    logger.info('Mock: Client updated', { id, updates }, 'MockAdapter');
    return mockClients[index];
  }

  async deleteClient(id: string): Promise<void> {
    await networkDelay();
    const index = mockClients.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('Cliente não encontrado');
    }
    
    mockClients.splice(index, 1);
    logger.info('Mock: Client deleted', { id }, 'MockAdapter');
  }

  async searchClients(query: string): Promise<Client[]> {
    await networkDelay();
    const results = mockClients.filter(c => 
      c.name.toLowerCase().includes(query.toLowerCase())
    );
    logger.debug('Mock: Searching clients', { query, results: results.length }, 'MockAdapter');
    return results;
  }

  async getClientCasesCount(clientId: string): Promise<number> {
    await networkDelay();
    const count = mockCases.filter(c => c.clientId === clientId).length;
    logger.debug('Mock: Getting client cases count', { clientId, count }, 'MockAdapter');
    return count;
  }
}

class MockCaseAdapter implements CaseAdapter {
  async getCases(clientId?: string): Promise<Case[]> {
    await networkDelay();
    const cases = clientId 
      ? mockCases.filter(c => c.clientId === clientId)
      : [...mockCases];
    logger.debug('Mock: Fetching cases', { clientId, count: cases.length }, 'MockAdapter');
    return cases;
  }

  async getCaseById(id: string): Promise<Case | null> {
    await networkDelay();
    const case_ = mockCases.find(c => c.id === id) || null;
    logger.debug('Mock: Fetching case by ID', { id, found: !!case_ }, 'MockAdapter');
    return case_;
  }

  async createCase(data: Omit<Case, 'id' | 'createdAt' | 'documentsCount'>): Promise<Case> {
    await networkDelay();
    const newCase: Case = {
      ...data,
      id: `case-${Date.now()}`,
      createdAt: new Date().toISOString(),
      documentsCount: 0,
    };
    mockCases.push(newCase);
    logger.info('Mock: Case created', { id: newCase.id, name: newCase.name }, 'MockAdapter');
    return newCase;
  }

  async updateCase(id: string, updates: Partial<Omit<Case, 'id' | 'createdAt' | 'clientId'>>): Promise<Case> {
    await networkDelay();
    const index = mockCases.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('Caso não encontrado');
    }
    
    mockCases[index] = { ...mockCases[index], ...updates };
    logger.info('Mock: Case updated', { id, updates }, 'MockAdapter');
    return mockCases[index];
  }

  async deleteCase(id: string): Promise<void> {
    await networkDelay();
    const index = mockCases.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('Caso não encontrado');
    }
    
    mockCases.splice(index, 1);
    logger.info('Mock: Case deleted', { id }, 'MockAdapter');
  }

  async searchCases(clientId: string, query: string): Promise<Case[]> {
    await networkDelay();
    const results = mockCases.filter(c => 
      c.clientId === clientId && 
      c.name.toLowerCase().includes(query.toLowerCase())
    );
    logger.debug('Mock: Searching cases', { clientId, query, results: results.length }, 'MockAdapter');
    return results;
  }
}

class MockDocumentAdapter implements DocumentAdapter {
  async uploadFile(file: File, folderPath: string, onProgress?: (progress: number) => void): Promise<string> {
    // Simular upload com progresso
    if (onProgress) {
      for (let progress = 0; progress <= 100; progress += 20) {
        await networkDelay(100);
        onProgress(progress);
      }
    } else {
      await networkDelay(500);
    }
    
    const path = `${folderPath}/${Date.now()}-${file.name}`;
    logger.info('Mock: File uploaded', { fileName: file.name, path, size: file.size }, 'MockAdapter');
    return path;
  }

  async createDocument(data: {
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
  }): Promise<FileItem> {
    await networkDelay();
    const newDocument: FileItem = {
      id: `file-${Date.now()}`,
      name: data.name,
      docNumber: data.docNumber,
      mimeType: data.mimeType,
      size: data.size,
      clientId: data.clientId,
      caseId: data.caseId,
      type: data.type as FileItem['type'],
      webViewLink: '#',
      downloadLink: '#',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      description: data.description,
      appProperties: {
        folderId: data.folderId,
        supabaseStoragePath: data.supabaseStoragePath,
      },
    };
    
    mockFiles.push(newDocument);
    logger.info('Mock: Document created', { id: newDocument.id, name: newDocument.name }, 'MockAdapter');
    return newDocument;
  }

  async getDocuments(filters?: {
    clientId?: string;
    caseId?: string;
    folderId?: string;
    type?: string;
  }): Promise<FileItem[]> {
    await networkDelay();
    let documents = [...mockFiles];
    
    if (filters?.clientId) {
      documents = documents.filter(d => d.clientId === filters.clientId);
    }
    if (filters?.caseId) {
      documents = documents.filter(d => d.caseId === filters.caseId);
    }
    if (filters?.folderId) {
      documents = documents.filter(d => d.appProperties?.folderId === filters.folderId);
    }
    if (filters?.type) {
      documents = documents.filter(d => d.type === filters.type);
    }
    
    logger.debug('Mock: Fetching documents', { filters, count: documents.length }, 'MockAdapter');
    return documents;
  }

  async getDocumentById(id: string): Promise<FileItem | null> {
    await networkDelay();
    const document = mockFiles.find(d => d.id === id) || null;
    logger.debug('Mock: Fetching document by ID', { id, found: !!document }, 'MockAdapter');
    return document;
  }

  async updateDocument(id: string, updates: Partial<{
    name: string;
    docNumber: string;
    description: string;
    folderId: string;
  }>): Promise<FileItem> {
    await networkDelay();
    const index = mockFiles.findIndex(d => d.id === id);
    if (index === -1) {
      throw new Error('Documento não encontrado');
    }
    
    const updatedDocument = {
      ...mockFiles[index],
      ...updates,
      modifiedAt: new Date().toISOString(),
      appProperties: {
        ...mockFiles[index].appProperties,
        ...(updates.folderId !== undefined && { folderId: updates.folderId }),
      },
    };
    
    mockFiles[index] = updatedDocument;
    logger.info('Mock: Document updated', { id, updates }, 'MockAdapter');
    return updatedDocument;
  }

  async deleteDocument(id: string): Promise<void> {
    await networkDelay();
    const index = mockFiles.findIndex(d => d.id === id);
    if (index === -1) {
      throw new Error('Documento não encontrado');
    }
    
    mockFiles.splice(index, 1);
    logger.info('Mock: Document deleted', { id }, 'MockAdapter');
  }

  async searchDocuments(query: string, filters?: {
    clientId?: string;
    caseId?: string;
    folderId?: string;
  }): Promise<FileItem[]> {
    await networkDelay();
    let documents = mockFiles.filter(d => 
      d.name.toLowerCase().includes(query.toLowerCase())
    );
    
    if (filters?.clientId) {
      documents = documents.filter(d => d.clientId === filters.clientId);
    }
    if (filters?.caseId) {
      documents = documents.filter(d => d.caseId === filters.caseId);
    }
    if (filters?.folderId) {
      documents = documents.filter(d => d.appProperties?.folderId === filters.folderId);
    }
    
    logger.debug('Mock: Searching documents', { query, filters, results: documents.length }, 'MockAdapter');
    return documents;
  }

  async getDownloadUrl(documentId: string, expiresIn: number = 3600): Promise<string> {
    await networkDelay();
    const url = `https://mock-storage.com/download/${documentId}?expires=${expiresIn}`;
    logger.debug('Mock: Generated download URL', { documentId, expiresIn }, 'MockAdapter');
    return url;
  }

  async getNextDocNumber(clientId: string): Promise<string> {
    await networkDelay();
    const clientDocs = mockFiles.filter(d => d.clientId === clientId);
    const nextNumber = clientDocs.length + 1;
    const docNumber = `DOC n. ${String(nextNumber).padStart(3, '0')}`;
    logger.debug('Mock: Generated next doc number', { clientId, docNumber }, 'MockAdapter');
    return docNumber;
  }
}

class MockFolderAdapter implements FolderAdapter {
  async getFolders(parentId?: string, clientId?: string): Promise<FolderItem[]> {
    await networkDelay();
    let folders = [...mockFolders];
    
    if (parentId) {
      folders = folders.filter(f => f.parentId === parentId);
    } else if (clientId) {
      folders = folders.filter(f => f.clientId === clientId && !f.parentId);
    } else {
      folders = folders.filter(f => !f.parentId);
    }
    
    logger.debug('Mock: Fetching folders', { parentId, clientId, count: folders.length }, 'MockAdapter');
    return folders;
  }

  async getFolderById(id: string): Promise<FolderItem | null> {
    await networkDelay();
    const folder = mockFolders.find(f => f.id === id) || null;
    logger.debug('Mock: Fetching folder by ID', { id, found: !!folder }, 'MockAdapter');
    return folder;
  }

  async createFolder(data: {
    name: string;
    kind: string;
    parentId?: string;
    clientId?: string;
    caseId?: string;
    path: string;
  }): Promise<FolderItem> {
    await networkDelay();
    const newFolder: FolderItem = {
      ...data,
      kind: data.kind as "client" | "case" | "subfolder",
      id: `folder-${Date.now()}`,
      createdAt: new Date().toISOString(),
      itemsCount: 0,
      documentsCount: 0,
      subfolderCount: 0,
    };
    
    mockFolders.push(newFolder);
    logger.info('Mock: Folder created', { id: newFolder.id, name: newFolder.name }, 'MockAdapter');
    return newFolder;
  }

  async updateFolder(id: string, updates: Partial<{
    name: string;
    path: string;
  }>): Promise<FolderItem> {
    await networkDelay();
    const index = mockFolders.findIndex(f => f.id === id);
    if (index === -1) {
      throw new Error('Pasta não encontrada');
    }
    
    mockFolders[index] = { ...mockFolders[index], ...updates };
    logger.info('Mock: Folder updated', { id, updates }, 'MockAdapter');
    return mockFolders[index];
  }

  async deleteFolder(id: string): Promise<void> {
    await networkDelay();
    const index = mockFolders.findIndex(f => f.id === id);
    if (index === -1) {
      throw new Error('Pasta não encontrada');
    }
    
    mockFolders.splice(index, 1);
    logger.info('Mock: Folder deleted', { id }, 'MockAdapter');
  }

  async searchFolders(query: string, clientId?: string): Promise<FolderItem[]> {
    await networkDelay();
    let folders = mockFolders.filter(f => 
      f.name.toLowerCase().includes(query.toLowerCase())
    );
    
    if (clientId) {
      folders = folders.filter(f => f.clientId === clientId);
    }
    
    logger.debug('Mock: Searching folders', { query, clientId, results: folders.length }, 'MockAdapter');
    return folders;
  }

  async getFolderPath(folderId: string): Promise<string> {
    await networkDelay();
    const folder = mockFolders.find(f => f.id === folderId);
    const path = folder?.path || '';
    logger.debug('Mock: Getting folder path', { folderId, path }, 'MockAdapter');
    return path;
  }
}

class MockPetitionAdapter implements PetitionAdapter {
  private mockPetitions: Petition[] = [];

  async createPetition(data: {
    title: string;
    clientId: string;
    caseId: string;
    content: string;
    status?: string;
    template?: string;
  }): Promise<Petition> {
    await networkDelay();
    const newPetition: Petition = {
      ...data,
      id: `petition-${Date.now()}`,
      status: (data.status || 'draft') as "draft" | "review" | "final",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      documentIds: [], // Adicionar propriedade obrigatória
    };
    
    this.mockPetitions.push(newPetition);
    logger.info('Mock: Petition created', { id: newPetition.id, title: newPetition.title }, 'MockAdapter');
    return newPetition;
  }

  async getPetitions(filters?: {
    clientId?: string;
    caseId?: string;
    status?: string;
  }): Promise<Petition[]> {
    await networkDelay();
    let petitions = [...this.mockPetitions];
    
    if (filters?.clientId) {
      petitions = petitions.filter(p => p.clientId === filters.clientId);
    }
    if (filters?.caseId) {
      petitions = petitions.filter(p => p.caseId === filters.caseId);
    }
    if (filters?.status) {
      petitions = petitions.filter(p => p.status === filters.status);
    }
    
    logger.debug('Mock: Fetching petitions', { filters, count: petitions.length }, 'MockAdapter');
    return petitions;
  }

  async getPetitionById(id: string): Promise<Petition | null> {
    await networkDelay();
    const petition = this.mockPetitions.find(p => p.id === id) || null;
    logger.debug('Mock: Fetching petition by ID', { id, found: !!petition }, 'MockAdapter');
    return petition;
  }

  async updatePetition(id: string, updates: Partial<{
    title: string;
    content: string;
    status: string;
    template: string;
  }>): Promise<Petition> {
    await networkDelay();
    const index = this.mockPetitions.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('Fatos não encontrada');
    }
    
    this.mockPetitions[index] = {
      ...this.mockPetitions[index],
      ...updates,
      status: updates.status ? updates.status as "draft" | "review" | "final" : this.mockPetitions[index].status,
      updatedAt: new Date().toISOString(),
    };
    
    logger.info('Mock: Petition updated', { id, updates }, 'MockAdapter');
    return this.mockPetitions[index];
  }

  async deletePetition(id: string): Promise<void> {
    await networkDelay();
    const index = this.mockPetitions.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('Fatos não encontrada');
    }
    
    this.mockPetitions.splice(index, 1);
    logger.info('Mock: Petition deleted', { id }, 'MockAdapter');
  }

  async addFactToPetition(petitionId: string, fact: {
    type: string;
    text: string;
    documentRefs?: string[];
    tags?: string[];
    confidence?: number;
  }): Promise<Fact> {
    await networkDelay();
    const newFact: Fact = {
      ...fact,
      id: `fact-${Date.now()}`,
      type: fact.type as "contratual" | "processual" | "probatório" | "comunicação",
    };
    
    logger.info('Mock: Fact added to petition', { petitionId, factId: newFact.id }, 'MockAdapter');
    return newFact;
  }

  async exportPetition(id: string, format: 'docx' | 'pdf'): Promise<Blob> {
    await networkDelay(1000); // Simular processamento
    const content = `Mock exported petition content for ID: ${id}`;
    const mimeType = format === 'pdf' 
      ? 'application/pdf' 
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    
    const blob = new Blob([content], { type: mimeType });
    logger.info('Mock: Petition exported', { id, format, size: blob.size }, 'MockAdapter');
    return blob;
  }
}

class MockSettingsAdapter implements SettingsAdapter {
  private mockSettings: Settings = { ...defaultSettings };

  async getUserSettings(): Promise<Settings> {
    await networkDelay();
    logger.debug('Mock: Fetching user settings', undefined, 'MockAdapter');
    return { ...this.mockSettings };
  }

  async updateUserSettings(settings: Partial<Settings>): Promise<Settings> {
    await networkDelay();
    this.mockSettings = {
      ...this.mockSettings,
      ...settings,
      naming: { ...this.mockSettings.naming, ...settings.naming },
      petition: { ...this.mockSettings.petition, ...settings.petition },
      classification: { ...this.mockSettings.classification, ...settings.classification },
      integrations: { ...this.mockSettings.integrations, ...settings.integrations },
    };
    
    logger.info('Mock: Settings updated', { updates: Object.keys(settings) }, 'MockAdapter');
    return { ...this.mockSettings };
  }

  async resetToDefaults(): Promise<Settings> {
    await networkDelay();
    this.mockSettings = { ...defaultSettings };
    logger.info('Mock: Settings reset to defaults', undefined, 'MockAdapter');
    return { ...this.mockSettings };
  }
}

export class MockDataAdapter implements DataAdapter {
  public readonly clients: ClientAdapter;
  public readonly cases: CaseAdapter;
  public readonly documents: DocumentAdapter;
  public readonly folders: FolderAdapter;
  public readonly petitions: PetitionAdapter;
  public readonly settings: SettingsAdapter;

  constructor() {
    this.clients = new MockClientAdapter();
    this.cases = new MockCaseAdapter();
    this.documents = new MockDocumentAdapter();
    this.folders = new MockFolderAdapter();
    this.petitions = new MockPetitionAdapter();
    this.settings = new MockSettingsAdapter();
    
    logger.info('Mock Data Adapter initialized', undefined, 'MockAdapter');
  }
}
