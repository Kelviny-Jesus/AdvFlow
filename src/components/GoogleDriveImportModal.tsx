import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Cloud, Loader2 } from 'lucide-react';
import { googleDriveService } from '@/services/googleDriveService';
import { toast } from '@/hooks/use-toast';

interface GoogleDriveImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFilesImported: (files: File[]) => void;
  closeOnImport?: boolean; // Se true, fecha modal após importar
}

export function GoogleDriveImportModal({ 
  open, 
  onOpenChange, 
  onFilesImported,
  closeOnImport = true 
}: GoogleDriveImportModalProps) {
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handlePickFiles = async () => {
    try {
      setPickerOpen(true);
      setLoading(true);
      const driveFiles = await googleDriveService.openPicker();
      
      if (driveFiles.length > 0) {
        // Download e importar automaticamente
        toast({
          title: 'Baixando arquivos...',
          description: `Importando ${driveFiles.length} arquivo(s) do Google Drive`,
        });
        
        const files: File[] = [];
        for (const driveFile of driveFiles) {
          const file = await googleDriveService.downloadFile(driveFile.id, driveFile.name, driveFile.mimeType);
          files.push(file);
        }

        // Importar diretamente
        onFilesImported(files);
        
        toast({
          title: 'Arquivos importados!',
          description: `${files.length} arquivo(s) adicionado(s) com sucesso`,
        });
        
        // Fechar modal automaticamente (se configurado)
        if (closeOnImport) {
          onOpenChange(false);
        }
      }
    } catch (error) {
      console.error('Erro ao importar arquivos:', error);
      toast({
        title: 'Erro ao importar arquivos',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setPickerOpen(false);
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Prevenir fechamento enquanto picker ou loading está ativo
    if (!newOpen && (pickerOpen || loading)) {
      return;
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={handleOpenChange}
      modal={false}
    >
      <DialogContent 
        className="max-w-2xl z-[100]"
        onInteractOutside={(e) => {
          if (pickerOpen) {
            e.preventDefault();
          }
        }}
        onPointerDownOutside={(e) => {
          if (pickerOpen) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          if (pickerOpen) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="w-5 h-5" />
            Importar do Google Drive
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 relative">
          {(pickerOpen || loading) && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
              <div className="text-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                <div>
                  <p className="font-medium">
                    {pickerOpen ? 'Aguardando seleção no Google Drive...' : 'Importando arquivos...'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {pickerOpen 
                      ? 'Selecione os arquivos na janela do Google Drive' 
                      : 'Os arquivos serão adicionados automaticamente'}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Cloud className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">Selecione arquivos do Google Drive</p>
            <p className="text-sm text-muted-foreground mb-6">
              Os arquivos serão importados automaticamente após a seleção
            </p>
            <Button onClick={handlePickFiles} disabled={loading || pickerOpen}>
              {loading || pickerOpen ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {pickerOpen ? 'Aguardando...' : 'Importando...'}
                </>
              ) : (
                <>
                  <Cloud className="w-4 h-4 mr-2" />
                  Selecionar Arquivos do Drive
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

