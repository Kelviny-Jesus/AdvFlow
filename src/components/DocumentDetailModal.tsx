import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  ExternalLink,
  Edit,
  Trash,
  Copy,
  Calendar,
  User,
  Folder,
  HardDrive,
  FileText,
  Clock,
} from "lucide-react";
import { Document } from "@/types/document";
import {
  getDocumentIcon,
  getDocumentIconClass,
  formatFileSize,
  formatDate,
  getStatusBadgeVariant,
} from "@/utils/documentUtils";
import { toast } from "@/hooks/use-toast";

interface DocumentDetailModalProps {
  document: Document | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditDocument: (document: Document) => void;
  onDeleteDocument: (document: Document) => void;
}

export function DocumentDetailModal({
  document,
  open,
  onOpenChange,
  onEditDocument,
  onDeleteDocument,
}: DocumentDetailModalProps) {
  if (!document) return null;

  const handleCopyLink = () => {
    if (document.url) {
      navigator.clipboard.writeText(document.url);
      toast({
        title: "Link copiado!",
        description: "O link do documento foi copiado para a área de transferência.",
      });
    }
  };

  const statusLabels = {
    completed: "Concluído",
    processing: "Processando",
    error: "Erro",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Detalhes do Documento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Document Header */}
          <div className="flex items-start gap-4">
            <div className={`doc-icon ${getDocumentIconClass(document.type)} text-lg`}>
              {getDocumentIcon(document.type)}
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-foreground truncate">
                {document.name}
              </h3>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant={getStatusBadgeVariant(document.status)}>
                  {statusLabels[document.status]}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatFileSize(document.size)}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Document Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Cliente</p>
                  <p className="text-sm text-muted-foreground">{document.client}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Folder className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Caso</p>
                  <p className="text-sm text-muted-foreground">{document.case}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Data de Upload</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(document.uploadDate)}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Tipo</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {document.type}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <HardDrive className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Tamanho</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(document.size)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">ID</p>
                  <p className="text-sm text-muted-foreground font-mono">
                    {document.id}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Metadata */}
          {document.metadata && Object.keys(document.metadata).length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Metadados
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(document.metadata).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-2 px-3 bg-muted/30 rounded-lg">
                      <span className="text-sm font-medium text-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            {document.url && (
              <>
                <Button className="bg-gradient-primary hover:shadow-medium transition-all">
                  <Download className="w-4 h-4 mr-2" />
                  Baixar
                </Button>
                
                <Button variant="outline" onClick={handleCopyLink}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar Link
                </Button>
                
                <Button variant="outline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir
                </Button>
              </>
            )}
            
            <Button
              variant="outline"
              onClick={() => {
                onEditDocument(document);
                onOpenChange(false);
              }}
            >
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </Button>
            
            <Button
              variant="outline"
              onClick={() => {
                onDeleteDocument(document);
                onOpenChange(false);
              }}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}