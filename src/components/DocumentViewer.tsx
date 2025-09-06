/**
 * Componente para visualizar documentos em modal
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Download, 
  ExternalLink, 
  Eye,
  Calendar,
  User,
  Hash,
  File,
  Loader2
} from "lucide-react";
import type { FileItem } from "@/types";
import { formatFileSize } from "@/utils/fileUtils";

interface DocumentViewerProps {
  document: FileItem;
  children: React.ReactNode;
}

export function DocumentViewer({ document, children }: DocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'docx':
      case 'doc':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'xlsx':
      case 'xls':
        return <FileText className="w-5 h-5 text-green-500" />;
      case 'image':
      case 'jpg':
      case 'jpeg':
      case 'png':
        return <File className="w-5 h-5 text-purple-500" />;
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const handleDownload = () => {
    if (document.downloadLink) {
      window.open(document.downloadLink, '_blank');
    }
  };

  const handleOpenExternal = () => {
    if (document.webViewLink) {
      window.open(document.webViewLink, '_blank');
    }
  };

  const renderDocumentPreview = () => {
    if (!document.webViewLink) {
      return (
        <div className="flex flex-col items-center justify-center h-96 bg-muted rounded-lg">
          <File className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Preview não disponível</p>
          <p className="text-sm text-muted-foreground">Clique em "Download" para visualizar o arquivo</p>
        </div>
      );
    }

    // Log da URL para debug
    console.log('Document URLs:', {
      webViewLink: document.webViewLink,
      downloadLink: document.downloadLink,
      type: document.type
    });

    // Para PDFs, usar iframe
    if (document.type === 'pdf') {
      return (
        <div className="relative h-96 bg-muted rounded-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}
          <iframe
            src={`${document.webViewLink}#toolbar=0`}
            className="w-full h-full border-0"
            title={document.name}
            onLoad={() => setIsLoading(false)}
            onLoadStart={() => setIsLoading(true)}
            onError={(e) => {
              console.error('Iframe error:', e);
              setIsLoading(false);
            }}
          />
          
          {/* Fallback para erro de carregamento */}
          <div className="absolute bottom-2 right-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenExternal}
              className="text-xs"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Abrir Externa
            </Button>
          </div>
        </div>
      );
    }

    // Para imagens, mostrar diretamente
    if (document.type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(document.type)) {
      return (
        <div className="relative h-96 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}
          <img
            src={document.webViewLink}
            alt={document.name}
            className="max-w-full max-h-full object-contain"
            onLoad={() => setIsLoading(false)}
            onLoadStart={() => setIsLoading(true)}
          />
        </div>
      );
    }

    // Para outros tipos, mostrar link para abrir externamente
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-muted rounded-lg">
        {getFileIcon(document.type)}
        <p className="text-lg font-medium mt-4 mb-2">{document.name}</p>
        <p className="text-muted-foreground mb-4">
          Tipo: {document.type.toUpperCase()} • Tamanho: {formatFileSize(document.size)}
        </p>
        <Button onClick={handleOpenExternal} className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4" />
          Abrir em Nova Aba
        </Button>
      </div>
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getFileIcon(document.type)}
            <div className="flex-1 min-w-0">
              <p className="truncate">{document.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {document.type.toUpperCase()}
                </Badge>
                {document.docNumber && (
                  <Badge variant="outline" className="text-xs">
                    {document.docNumber}
                  </Badge>
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview do documento */}
          <div>
            {renderDocumentPreview()}
          </div>

          {/* Informações do documento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">ID:</span>
                <span className="font-mono text-xs">{document.id.slice(0, 8)}...</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <File className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Tamanho:</span>
                <span>{formatFileSize(document.size)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Criado:</span>
                <span>{formatDate(document.createdAt)}</span>
              </div>
            </div>

            <div className="space-y-2">
              {document.description && (
                <div className="text-sm">
                  <span className="font-medium">Descrição:</span>
                  <p className="text-muted-foreground mt-1">{document.description}</p>
                </div>
              )}
              
              <div className="text-sm">
                <span className="font-medium">Tipo MIME:</span>
                <span className="text-muted-foreground ml-2">{document.mimeType}</span>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
            
            {document.webViewLink && (
              <Button
                onClick={handleOpenExternal}
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir em Nova Aba
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
