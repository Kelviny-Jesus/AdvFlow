/**
 * Componente para visualizar documentos em modal
 */

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Download, 
  ExternalLink, 
  Eye,
  Calendar,
  User,
  Hash,
  File,
  Loader2,
  Pencil,
  Check,
  X,
  Trash
} from "lucide-react";
import type { FileItem } from "@/types";
import { formatFileSize } from "@/utils/fileUtils";
import { DocumentService } from "@/services/documentService";

interface DocumentViewerProps {
  document: FileItem;
  children: React.ReactNode;
  siblingDocuments?: FileItem[];
  initialIndex?: number;
}

export function DocumentViewer({ document, children, siblingDocuments, initialIndex = 0 }: DocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const currentDoc: FileItem = siblingDocuments && siblingDocuments.length > 0
    ? siblingDocuments[Math.min(Math.max(currentIndex, 0), siblingDocuments.length - 1)]
    : document;

  const [newName, setNewName] = useState(currentDoc.name);

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

  const handleDownload = async () => {
    try {
      const ensureExt = (name: string, ext: string) => {
        const lower = name.toLowerCase();
        if (lower.endsWith(`.${ext}`)) return name;
        return `${name}.${ext}`;
      };
      const fileName = ensureExt(newName || currentDoc.name, currentDoc.type || 'pdf');
      const url = await DocumentService.getDownloadUrl(currentDoc.id, 60 * 10, fileName);
      window.open(url, '_blank');
    } catch (e) {
      console.error(e);
      if (currentDoc.downloadLink) window.open(currentDoc.downloadLink, '_blank');
    }
  };

  const handleOpenExternal = async () => {
    try {
      const url = await DocumentService.getDownloadUrl(currentDoc.id, 60 * 10);
      window.open(url, '_blank');
    } catch (e) {
      console.error(e);
      if (currentDoc.webViewLink) window.open(currentDoc.webViewLink, '_blank');
    }
  };

  useEffect(() => {
    const fetchSigned = async () => {
      try {
        const url = await DocumentService.getDownloadUrl(currentDoc.id, 60 * 10);
        setSignedUrl(url);
      } catch (e) {
        console.error(e);
        setSignedUrl(currentDoc.webViewLink || null);
      }
    };
    if (isOpen) {
      fetchSigned();
    }
  }, [isOpen, currentDoc.id, currentDoc.webViewLink]);

  // Ao trocar de documento, sincronizar nome
  useEffect(() => {
    setNewName(currentDoc.name);
    setSignedUrl(null);
    setIsLoading(false);
  }, [currentDoc.id]);

  // Resetar índice ao abrir conforme item clicado
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  // Navegação por teclado (setas esquerda/direita)
  useEffect(() => {
    if (!isOpen || !siblingDocuments || siblingDocuments.length <= 1) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(i + 1, siblingDocuments.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(i - 1, 0));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, siblingDocuments]);

  const handleRename = async () => {
    if (!newName.trim() || newName === currentDoc.name) {
      setIsEditing(false);
      return;
    }
    try {
      await DocumentService.updateDocument(currentDoc.id, { name: newName.trim() });
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    try {
      await DocumentService.deleteDocument(currentDoc.id);
      window.location.reload();
    } catch (e) {
      console.error(e);
    }
  };

  const renderDocumentPreview = () => {
    if (!currentDoc.webViewLink) {
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
      webViewLink: currentDoc.webViewLink,
      downloadLink: currentDoc.downloadLink,
      type: currentDoc.type
    });

    // Para PDFs, usar iframe
    if (currentDoc.type === 'pdf') {
      return (
        <div className="relative h-full bg-muted rounded-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}
          <iframe
            src={`${(signedUrl || currentDoc.webViewLink) ?? ''}#toolbar=0`}
            className="w-full h-full border-0"
            title={currentDoc.name}
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

    // Para DOCX, usar Office Online Viewer
    if (currentDoc.type === 'docx') {
      const viewerSrc = signedUrl || currentDoc.downloadLink || currentDoc.webViewLink || '';
      return (
        <div className="relative h-full bg-muted rounded-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(viewerSrc)}`}
            className="w-full h-full border-0"
            title={currentDoc.name}
            onLoad={() => setIsLoading(false)}
            onError={(e) => {
              console.error('Office viewer error:', e);
              setIsLoading(false);
            }}
          />
        </div>
      );
    }

    // Para imagens, mostrar diretamente
    if (currentDoc.type === 'image' || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(currentDoc.type)) {
      return (
        <div className="relative h-full bg-muted rounded-lg overflow-hidden flex items-center justify-center">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}
          <img
            src={signedUrl || currentDoc.webViewLink}
            alt={currentDoc.name}
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
        {getFileIcon(currentDoc.type)}
        <p className="text-lg font-medium mt-4 mb-2">{currentDoc.name}</p>
        <p className="text-muted-foreground mb-4">
          Tipo: {currentDoc.type.toUpperCase()} • Tamanho: {formatFileSize(currentDoc.size)}
        </p>
        <Button onClick={handleOpenExternal} className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4" />
          Abrir em Nova Aba
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] max-h-[92vh] overflow-auto pb-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getFileIcon(currentDoc.type)}
            <div className="flex-1 min-w-0">
              {!isEditing ? (
                <div className="flex items-center gap-2">
                  <p className="truncate">{currentDoc.name}</p>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsEditing(true)}>
                    <Pencil className="w-3 h-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    className="w-full bg-background border rounded px-2 py-1 text-sm"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRename}>
                    <Check className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setIsEditing(false); setNewName(currentDoc.name); }}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {currentDoc.type.toUpperCase()}
                </Badge>
                {currentDoc.appProperties && (currentDoc.appProperties as any).category === 'generated' && (
                  <Badge variant="outline" className="text-xs">Documento Gerado pelo AdvFlow</Badge>
                )}
                {currentDoc.docNumber && (
                  <Badge variant="outline" className="text-xs">
                    {currentDoc.docNumber}
                  </Badge>
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Painel dividido: Texto extraído (esquerda) | Preview do documento (direita) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-lg border bg-background">
            {/* Texto extraído */}
            <div className="p-4 h-[36rem] flex flex-col border-b lg:border-b-0 lg:border-r">
              <div className="mb-3">
                <p className="text-sm font-semibold">Texto extraído - Google Vision OCR</p>
                {currentDoc.name && (
                  <p className="text-xs text-muted-foreground">Arquivo original: {currentDoc.name}</p>
                )}
              </div>
              <div className="flex-1 border rounded bg-muted/20 overflow-hidden">
                <ScrollArea className="h-full w-full max-w-full p-3">
                  <pre className="w-full max-w-full whitespace-pre-wrap break-words break-all text-sm leading-6 overflow-x-auto">{(currentDoc.extractedData || 'Texto ainda não disponível para este documento.').trim()}</pre>
                  <ScrollBar orientation="vertical" />
                </ScrollArea>
              </div>
            </div>

            {/* Preview do documento */}
            <div className="relative h-[36rem] p-4">
              {renderDocumentPreview()}
              {siblingDocuments && siblingDocuments.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                    onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
                    disabled={currentIndex <= 0}
                  >
                    ‹
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                    onClick={() => setCurrentIndex((i) => Math.min(i + 1, siblingDocuments.length - 1))}
                    disabled={currentIndex >= siblingDocuments.length - 1}
                  >
                    ›
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Divisor visual entre o painel principal e o rodapé */}
          <Separator className="mt-2" />

          {/* Informações do documento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">ID:</span>
                <span className="font-mono text-xs">{currentDoc.id.slice(0, 8)}...</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <File className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Tamanho:</span>
                <span>{formatFileSize(currentDoc.size)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Criado:</span>
                <span>{formatDate(currentDoc.createdAt)}</span>
              </div>
            </div>

            <div className="space-y-2">
              {currentDoc.description && (
                <div className="text-sm">
                  <span className="font-medium">Descrição:</span>
                  <p className="text-muted-foreground mt-1">{currentDoc.description}</p>
                </div>
              )}
              
              <div className="text-sm">
                <span className="font-medium">Tipo MIME:</span>
                <span className="text-muted-foreground ml-2">{currentDoc.mimeType}</span>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-2">
            <Button
              variant="destructive"
              onClick={handleDelete}
              className="flex items-center gap-2"
            >
              <Trash className="w-4 h-4" />
              Excluir
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
            
            {currentDoc.webViewLink && (
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
