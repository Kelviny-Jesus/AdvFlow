/**
 * Exemplo de componente usando as melhorias implementadas
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

// Usar os hooks melhorados
import { 
  useDocumentsV2, 
  useSmartUploadDocument, 
  useSearchDocumentsV2,
  useBatchUpload 
} from '@/hooks/useDocumentsV2';

// Usar utilitários das melhorias
import { UploadUtils, type UploadProgress } from '@/lib/uploadManager';
import { logger } from '@/lib/logger';
import { isUsingMockData } from '@/adapters';

export function ExampleImprovedComponent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Usar hooks melhorados
  const { data: documents, isLoading, error } = useDocumentsV2({
    clientId: 'silva-joao', // Exemplo
  });

  const { data: searchResults, isLoading: isSearching } = useSearchDocumentsV2(
    searchQuery,
    { clientId: 'silva-joao' }
  );

  const smartUpload = useSmartUploadDocument();
  const batchUpload = useBatchUpload();

  // Handler para upload único inteligente
  const handleSmartUpload = async (file: File) => {
    logger.info('Iniciando upload inteligente', { fileName: file.name }, 'ExampleComponent');

    smartUpload.mutate({
      file,
      folderPath: 'clients/silva-joao/documentos',
      documentData: {
        clientId: 'silva-joao',
        caseId: 'silva-trabalhista',
        type: 'other', // Será auto-detectado
      },
      options: {
        autoCompress: true,
        autoDetectType: true,
        onProgress: (progress) => {
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: progress
          }));
        }
      }
    });
  };

  // Handler para upload em lote
  const handleBatchUpload = async () => {
    if (selectedFiles.length === 0) return;

    logger.info('Iniciando upload em lote', { count: selectedFiles.length }, 'ExampleComponent');

    batchUpload.mutate({
      files: selectedFiles,
      folderPath: 'clients/silva-joao/lote',
      baseDocumentData: {
        clientId: 'silva-joao',
        caseId: 'silva-trabalhista',
      },
      onProgress: (fileIndex, progress) => {
        const fileName = selectedFiles[fileIndex]?.name;
        if (fileName) {
          setUploadProgress(prev => ({
            ...prev,
            [fileName]: progress
          }));
        }
      }
    });
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    logger.debug('Arquivos selecionados', { count: files.length }, 'ExampleComponent');
  };

  return (
    <div className="space-y-6 p-6">
      {/* Status do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle>🚀 Sistema Melhorado - Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={isUsingMockData() ? "secondary" : "default"}>
              {isUsingMockData() ? "📝 Mock Data" : "🗄️ Supabase"}
            </Badge>
            <Badge variant="outline">✅ Error Handling</Badge>
            <Badge variant="outline">📊 Logging</Badge>
            <Badge variant="outline">⚡ Cache Otimizado</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Busca de Documentos */}
      <Card>
        <CardHeader>
          <CardTitle>🔍 Busca Melhorada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Buscar documentos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          {isSearching && <p>🔄 Buscando...</p>}
          
          {searchResults && searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                {searchResults.length} resultado(s) encontrado(s)
              </p>
              {searchResults.slice(0, 3).map((doc) => (
                <div key={doc.id} className="p-2 border rounded">
                  <p className="font-medium">{doc.name}</p>
                  <p className="text-sm text-gray-500">
                    {UploadUtils.formatFileSize(doc.size)} • {doc.type}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Inteligente */}
      <Card>
        <CardHeader>
          <CardTitle>📤 Upload Inteligente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            type="file"
            multiple
            onChange={handleFileSelect}
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.mp3,.wav,.ogg,.opus"
          />
          
          {selectedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm">
                {selectedFiles.length} arquivo(s) selecionado(s)
              </p>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => selectedFiles[0] && handleSmartUpload(selectedFiles[0])}
                  disabled={smartUpload.isPending}
                  size="sm"
                >
                  {smartUpload.isPending ? "🔄 Enviando..." : "📤 Upload Único"}
                </Button>
                
                <Button
                  onClick={handleBatchUpload}
                  disabled={batchUpload.isPending}
                  variant="outline"
                  size="sm"
                >
                  {batchUpload.isPending ? "🔄 Enviando Lote..." : "📦 Upload em Lote"}
                </Button>
              </div>
            </div>
          )}

          {/* Progress de Upload */}
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="truncate">{fileName}</span>
                <span>{progress.percentage.toFixed(0)}%</span>
              </div>
              <Progress value={progress.percentage} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{UploadUtils.formatFileSize(progress.loaded)} / {UploadUtils.formatFileSize(progress.total)}</span>
                <span>{UploadUtils.formatSpeed(progress.speed)} • {UploadUtils.formatTime(progress.timeRemaining)}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Lista de Documentos */}
      <Card>
        <CardHeader>
          <CardTitle>📄 Documentos ({documents?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p>🔄 Carregando documentos...</p>}
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                ❌ Erro ao carregar documentos: {error.message}
              </AlertDescription>
            </Alert>
          )}
          
          {documents && documents.length > 0 && (
            <div className="space-y-2">
              {documents.slice(0, 5).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-sm text-gray-500">
                      {UploadUtils.formatFileSize(doc.size)} • {doc.type}
                      {doc.docNumber && ` • ${doc.docNumber}`}
                    </p>
                  </div>
                  <Badge variant="outline">{doc.type}</Badge>
                </div>
              ))}
              
              {documents.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  ... e mais {documents.length - 5} documento(s)
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
