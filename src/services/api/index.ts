import { toast } from "@/hooks/use-toast";
import { getMockData } from "@/data/mocks";
import type { 
  Client, 
  Case, 
  FileItem, 
  Settings, 
  Petition, 
  Fact,
  UploadProgress,
  ApiResponse,
  DriveTreeParams 
} from "@/types";

// Configuração base da API
const API_BASE_URL = process.env.REACT_APP_API_URL || "/api";

class ApiService {
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${API_BASE_URL}${endpoint}`;
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro na requisição";
      toast({
        title: "Erro na API",
        description: message,
        variant: "destructive",
      });
      throw error;
    }
  }

  // Uploads
  async initUpload(file: File): Promise<{ uploadId: string; fileId: string }> {
    // Mock para desenvolvimento
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      uploadId: `upload-${Date.now()}`,
      fileId: `file-${Date.now()}`,
    };
  }

  async uploadData(uploadId: string, file: File, onProgress?: (progress: number) => void): Promise<void> {
    // Mock de upload com progresso
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          resolve();
        }
        onProgress?.(progress);
      }, 200);
    });
  }

  async commitUpload(uploadId: string, metadata: any): Promise<FileItem> {
    // Mock commit
    await new Promise(resolve => setTimeout(resolve, 300));
    return {
      id: `file-${Date.now()}`,
      name: metadata.name,
      mimeType: metadata.mimeType,
      size: metadata.size,
      clientId: metadata.clientId,
      caseId: metadata.caseId,
      type: metadata.type,
      webViewLink: "#",
      downloadLink: "#",
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      appProperties: metadata.appProperties,
    } as FileItem;
  }

  // Drive / Documentos
  async getDriveTree(params: DriveTreeParams = {}): Promise<ApiResponse<FileItem[]>> {
    // Mock usando dados locais
    return getMockData.files(params.clientId, params.caseId);
  }

  async updateFile(id: string, updates: Partial<FileItem>): Promise<ApiResponse<FileItem>> {
    // Mock update
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.request(`/drive/files/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
  }

  async moveFile(fileId: string, toCaseId: string): Promise<ApiResponse<void>> {
    // Mock move
    await new Promise(resolve => setTimeout(resolve, 500));
    toast({
      title: "Arquivo movido",
      description: "Arquivo movido com sucesso para o novo caso.",
    });
    return { data: undefined };
  }

  async getFileLink(id: string): Promise<string> {
    // Mock link
    await new Promise(resolve => setTimeout(resolve, 200));
    return `https://drive.google.com/file/d/${id}/view`;
  }

  async getPreview(id: string): Promise<string> {
    // Mock preview
    await new Promise(resolve => setTimeout(resolve, 300));
    return `https://drive.google.com/file/d/${id}/preview`;
  }

  // Clientes
  async getClients(): Promise<ApiResponse<Client[]>> {
    return getMockData.clients();
  }

  async searchClients(query: string): Promise<ApiResponse<Client[]>> {
    const { data: clients } = await getMockData.clients();
    const filtered = clients.filter(c => 
      c.name.toLowerCase().includes(query.toLowerCase())
    );
    return { data: filtered };
  }

  // Casos
  async getCases(clientId?: string): Promise<ApiResponse<Case[]>> {
    return getMockData.cases(clientId);
  }

  async searchCases(clientId: string, query: string): Promise<ApiResponse<Case[]>> {
    const { data: cases } = await getMockData.cases(clientId);
    const filtered = cases.filter(c => 
      c.name.toLowerCase().includes(query.toLowerCase())
    );
    return { data: filtered };
  }

  // Fatos
  async generatePetition(params: {
    clientId: string;
    caseId: string; 
    documentIds: string[];
    template?: string;
  }): Promise<ApiResponse<{ content: string; facts: Fact[] }>> {
    // Mock geração de Fatos
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const { data: facts } = await getMockData.facts(params.documentIds);
    const content = `# Fatos Gerada

## Fatos Relevantes
${facts.map(f => `- ${f.text}`).join('\n')}

## Documentos Anexos
${params.documentIds.map((id, index) => `DOC n. ${String(index + 1).padStart(3, '0')}`).join('\n')}`;

    return { 
      data: { 
        content,
        facts 
      } 
    };
  }

  async savePetition(petition: Petition): Promise<ApiResponse<Petition>> {
    // Mock save
    await new Promise(resolve => setTimeout(resolve, 500));
    const saved = {
      ...petition,
      id: `petition-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    toast({
      title: "Fatos salva",
      description: "Minuta salva com sucesso.",
    });
    
    return { data: saved };
  }

  async exportPetition(id: string, format: 'docx' | 'pdf'): Promise<Blob> {
    // Mock export
    await new Promise(resolve => setTimeout(resolve, 1000));
    return new Blob(["Mock exported content"], { 
      type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
  }

  // Configurações
  async getSettings(): Promise<ApiResponse<Settings>> {
    return getMockData.settings();
  }

  async updateSettings(settings: Settings): Promise<ApiResponse<Settings>> {
    // Mock update
    await new Promise(resolve => setTimeout(resolve, 500));
    toast({
      title: "Configurações salvas",
      description: "Suas preferências foram atualizadas.",
    });
    return { data: settings };
  }
}

export const api = new ApiService();