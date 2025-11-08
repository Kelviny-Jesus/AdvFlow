import { logger } from '@/lib/logger';
import { AppError } from '@/lib/errors';

interface GoogleDriveConfig {
  clientId: string;
  apiKey: string;
  scopes: string[];
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
}

interface UploadOptions {
  folderId?: string;
  description?: string;
}

interface TokenData {
  access_token: string;
  expires_at: number;
}

class GoogleDriveService {
  private config: GoogleDriveConfig;
  private accessToken: string | null = null;
  private tokenClient: any = null;
  private gapiInited = false;
  private gisInited = false;
  private readonly TOKEN_STORAGE_KEY = 'google_drive_token';

  constructor() {
    this.config = {
      clientId: import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID || '',
      apiKey: import.meta.env.VITE_GOOGLE_DRIVE_API_KEY || '',
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    };
    
    // Restaurar token do localStorage ao inicializar
    this.restoreToken();
  }

  /**
   * Restaurar token do localStorage
   */
  private restoreToken(): void {
    try {
      const stored = localStorage.getItem(this.TOKEN_STORAGE_KEY);
      if (stored) {
        const tokenData: TokenData = JSON.parse(stored);
        
        // Verificar se o token ainda é válido (não expirou)
        if (tokenData.expires_at > Date.now()) {
          this.accessToken = tokenData.access_token;
          logger.info('Google Drive token restored from storage', {}, 'GoogleDriveService');
        } else {
          // Token expirado, remover
          localStorage.removeItem(this.TOKEN_STORAGE_KEY);
          logger.info('Google Drive token expired and removed', {}, 'GoogleDriveService');
        }
      }
    } catch (error) {
      logger.error('Error restoring Google Drive token', error as Error, {}, 'GoogleDriveService');
      localStorage.removeItem(this.TOKEN_STORAGE_KEY);
    }
  }

  /**
   * Salvar token no localStorage
   */
  private saveToken(accessToken: string): void {
    try {
      const tokenData: TokenData = {
        access_token: accessToken,
        expires_at: Date.now() + (7 * 24 * 3600 * 1000) // 7 dias
      };
      localStorage.setItem(this.TOKEN_STORAGE_KEY, JSON.stringify(tokenData));
      this.accessToken = accessToken;
      logger.info('Google Drive token saved to storage (7 days)', {}, 'GoogleDriveService');
    } catch (error) {
      logger.error('Error saving Google Drive token', error as Error, {}, 'GoogleDriveService');
    }
  }

  /**
   * Remover token do localStorage
   */
  private clearToken(): void {
    try {
      localStorage.removeItem(this.TOKEN_STORAGE_KEY);
      this.accessToken = null;
    } catch (error) {
      logger.error('Error clearing Google Drive token', error as Error, {}, 'GoogleDriveService');
    }
  }

  /**
   * Inicializar Google API
   */
  async initialize(): Promise<void> {
    if (!this.config.clientId || !this.config.apiKey) {
      throw new AppError('Google Drive não está configurado. Configure CLIENT_ID e API_KEY.', 500);
    }

    try {
      await this.loadGoogleScripts();
      await this.initializeGapi();
      await this.initializeGis();
      
      logger.info('Google Drive initialized successfully', {}, 'GoogleDriveService');
    } catch (error) {
      logger.error('Failed to initialize Google Drive', error as Error, {}, 'GoogleDriveService');
      throw error;
    }
  }

  /**
   * Carregar scripts do Google
   */
  private async loadGoogleScripts(): Promise<void> {
    // Carregar GAPI
    if (!document.getElementById('gapi-script')) {
      const gapiScript = document.createElement('script');
      gapiScript.id = 'gapi-script';
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.async = true;
      gapiScript.defer = true;
      document.body.appendChild(gapiScript);
      
      await new Promise((resolve) => {
        gapiScript.onload = resolve;
      });
    }

    // Carregar GIS (Google Identity Services)
    if (!document.getElementById('gis-script')) {
      const gisScript = document.createElement('script');
      gisScript.id = 'gis-script';
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.async = true;
      gisScript.defer = true;
      document.body.appendChild(gisScript);
      
      await new Promise((resolve) => {
        gisScript.onload = resolve;
      });
    }
  }

  /**
   * Inicializar GAPI
   */
  private async initializeGapi(): Promise<void> {
    return new Promise((resolve, reject) => {
      (window as any).gapi.load('client:picker', async () => {
        try {
          await (window as any).gapi.client.init({
            apiKey: this.config.apiKey,
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
          });
          this.gapiInited = true;
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Inicializar GIS (Google Identity Services)
   */
  private async initializeGis(): Promise<void> {
    this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: this.config.clientId,
      scope: this.config.scopes.join(' '),
      callback: '', // definido dinamicamente
    });
    this.gisInited = true;
  }

  /**
   * Autenticar usuário
   */
  async authenticate(): Promise<boolean> {
    if (!this.gapiInited || !this.gisInited) {
      await this.initialize();
    }

    // Se já temos um token válido, não precisa autenticar novamente
    if (this.accessToken) {
      // Definir o token no gapi.client para que funcione
      try {
        (window as any).gapi.client.setToken({ access_token: this.accessToken });
        logger.info('Using stored Google Drive token', {}, 'GoogleDriveService');
        return true;
      } catch (error) {
        logger.warn('Error setting stored token, requesting new one', {}, 'GoogleDriveService');
        this.clearToken();
      }
    }

    return new Promise((resolve, reject) => {
      try {
        this.tokenClient.callback = async (response: any) => {
          if (response.error !== undefined) {
            reject(new AppError(response.error, 401));
            return;
          }
          
          // Salvar token no localStorage
          this.saveToken(response.access_token);
          
          logger.info('User authenticated with Google Drive', {}, 'GoogleDriveService');
          resolve(true);
        };

        // Verificar se já tem token válido no gapi
        const gapiToken = (window as any).gapi?.client?.getToken();
        if (gapiToken === null) {
          this.tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
          this.tokenClient.requestAccessToken({ prompt: '' });
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Desconectar
   */
  disconnect(): void {
    try {
      const gapi = (window as any).gapi;
      const google = (window as any).google;
      
      if (gapi && gapi.client) {
        const token = gapi.client.getToken();
        if (token !== null && google && google.accounts && google.accounts.oauth2) {
          google.accounts.oauth2.revoke(token.access_token);
          gapi.client.setToken(null);
        }
      }
      
      // Limpar token do localStorage
      this.clearToken();
      this.gapiInited = false;
      this.gisInited = false;
      
      logger.info('User disconnected from Google Drive', {}, 'GoogleDriveService');
    } catch (error) {
      logger.error('Error disconnecting from Google Drive', error as Error, {}, 'GoogleDriveService');
      // Mesmo com erro, limpar estado local
      this.clearToken();
      this.gapiInited = false;
      this.gisInited = false;
    }
  }

  /**
   * Verificar se está autenticado
   */
  isAuthenticated(): boolean {
    try {
      const gapi = (window as any).gapi;
      if (this.accessToken !== null) return true;
      if (gapi && gapi.client) {
        const token = gapi.client.getToken();
        return token !== null && token !== undefined;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Upload de arquivo para Google Drive
   */
  async uploadFile(file: File, options: UploadOptions = {}): Promise<DriveFile> {
    if (!this.isAuthenticated()) {
      throw new AppError('Não autenticado no Google Drive', 401);
    }

    try {
      logger.info('Uploading file to Google Drive', { 
        fileName: file.name, 
        size: file.size 
      }, 'GoogleDriveService');

      const metadata = {
        name: file.name,
        mimeType: file.type,
        description: options.description,
        ...(options.folderId && { parents: [options.folderId] }),
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink,thumbnailLink,iconLink',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken || (window as any).gapi.client.getToken().access_token}`,
          },
          body: form,
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new AppError(`Erro ao fazer upload: ${error.error?.message || 'Erro desconhecido'}`, response.status);
      }

      const driveFile: DriveFile = await response.json();
      
      logger.info('File uploaded successfully to Google Drive', { 
        fileId: driveFile.id,
        fileName: driveFile.name 
      }, 'GoogleDriveService');

      return driveFile;
    } catch (error) {
      logger.error('Failed to upload file to Google Drive', error as Error, {}, 'GoogleDriveService');
      throw error;
    }
  }

  /**
   * Listar arquivos do Google Drive
   */
  async listFiles(folderId?: string, pageSize: number = 100): Promise<DriveFile[]> {
    if (!this.isAuthenticated()) {
      throw new AppError('Não autenticado no Google Drive', 401);
    }

    try {
      let query = "trashed = false";
      if (folderId) {
        query += ` and '${folderId}' in parents`;
      }

      const response = await (window as any).gapi.client.drive.files.list({
        pageSize,
        q: query,
        fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,thumbnailLink,iconLink)',
        orderBy: 'modifiedTime desc',
      });

      return response.result.files || [];
    } catch (error) {
      logger.error('Failed to list Google Drive files', error as Error, {}, 'GoogleDriveService');
      throw error;
    }
  }

  /**
   * Mapear mimeTypes do Google para formatos de exportação
   */
  private getExportMimeType(googleMimeType: string): { mimeType: string; extension: string } | null {
    const exportMap: Record<string, { mimeType: string; extension: string }> = {
      'application/vnd.google-apps.document': { 
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
        extension: '.docx' 
      },
      'application/vnd.google-apps.spreadsheet': { 
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        extension: '.xlsx' 
      },
      'application/vnd.google-apps.presentation': { 
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 
        extension: '.pptx' 
      },
      'application/vnd.google-apps.drawing': { 
        mimeType: 'application/pdf', 
        extension: '.pdf' 
      },
      'application/vnd.google-apps.script': { 
        mimeType: 'application/vnd.google-apps.script+json', 
        extension: '.json' 
      },
    };

    return exportMap[googleMimeType] || null;
  }

  /**
   * Baixar arquivo do Google Drive
   */
  async downloadFile(fileId: string, fileName: string, mimeType: string): Promise<File> {
    if (!this.isAuthenticated()) {
      throw new AppError('Não autenticado no Google Drive', 401);
    }

    try {
      const gapi = (window as any).gapi;
      if (!gapi || !gapi.client) {
        throw new AppError('Google API não inicializada', 500);
      }

      const token = this.accessToken || gapi.client.getToken().access_token;
      let url: string;
      let exportInfo = this.getExportMimeType(mimeType);
      let finalFileName = fileName;
      let finalMimeType = mimeType;

      // Se for um Google Doc nativo, usar a API de export
      if (exportInfo) {
        url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportInfo.mimeType)}`;
        finalMimeType = exportInfo.mimeType;
        
        // Adicionar extensão apropriada se não existir
        if (!fileName.toLowerCase().endsWith(exportInfo.extension)) {
          finalFileName = fileName + exportInfo.extension;
        }

        logger.info(`Exporting Google Doc: ${fileName} as ${exportInfo.extension}`, {}, 'GoogleDriveService');
      } else {
        // Arquivo normal, baixar diretamente
        url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`;
        logger.info(`Downloading file: ${fileName}`, {}, 'GoogleDriveService');
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          `Download failed: ${response.status} ${response.statusText}`,
          new Error(errorText),
          { fileId, fileName, mimeType, url },
          'GoogleDriveService'
        );
        throw new AppError(
          `Erro ao baixar arquivo: ${response.statusText || 'Verifique as permissões do arquivo'}`, 
          response.status
        );
      }

      const blob = await response.blob();
      logger.info(`File downloaded successfully: ${fileName} (${blob.size} bytes)`, {}, 'GoogleDriveService');
      
      return new File([blob], finalFileName, { type: finalMimeType });
    } catch (error) {
      logger.error('Failed to download file from Google Drive', error as Error, { fileId, fileName, mimeType }, 'GoogleDriveService');
      throw error;
    }
  }

  /**
   * Abrir Google Drive Picker para selecionar arquivos
   */
  async openPicker(): Promise<DriveFile[]> {
    if (!this.isAuthenticated()) {
      await this.authenticate();
    }

    return new Promise((resolve, reject) => {
      try {
        const picker = new (window as any).google.picker.PickerBuilder()
          .addView((window as any).google.picker.ViewId.DOCS)
          .setOAuthToken(this.accessToken || (window as any).gapi.client.getToken().access_token)
          .setDeveloperKey(this.config.apiKey)
          .setCallback((data: any) => {
            if (data.action === (window as any).google.picker.Action.PICKED) {
              const files = data.docs.map((doc: any) => ({
                id: doc.id,
                name: doc.name,
                mimeType: doc.mimeType,
                size: doc.sizeBytes,
                createdTime: doc.createdDate,
                modifiedTime: doc.lastEditedUtc,
                webViewLink: doc.url,
                thumbnailLink: doc.thumbnailUrl,
                iconLink: doc.iconUrl,
              }));
              resolve(files);
            } else if (data.action === (window as any).google.picker.Action.CANCEL) {
              resolve([]);
            }
          })
          .build();
        
        picker.setVisible(true);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Criar pasta no Google Drive
   */
  async createFolder(name: string, parentId?: string): Promise<DriveFile> {
    if (!this.isAuthenticated()) {
      throw new AppError('Não autenticado no Google Drive', 401);
    }

    try {
      const metadata = {
        name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId && { parents: [parentId] }),
      };

      const response = await (window as any).gapi.client.drive.files.create({
        resource: metadata,
        fields: 'id,name,mimeType,createdTime,modifiedTime',
      });

      logger.info('Folder created in Google Drive', { 
        folderId: response.result.id, 
        folderName: name 
      }, 'GoogleDriveService');

      return response.result;
    } catch (error) {
      logger.error('Failed to create folder in Google Drive', error as Error, { name }, 'GoogleDriveService');
      throw error;
    }
  }

  /**
   * Verificar se o serviço está configurado
   */
  isConfigured(): boolean {
    return !!(this.config.clientId && this.config.apiKey);
  }
}

export const googleDriveService = new GoogleDriveService();
export type { DriveFile, UploadOptions };

