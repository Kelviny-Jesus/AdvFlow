import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Trash2, FileText, Loader2, Plus, Settings, HardDrive, Cloud } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { GoogleDriveImportModal } from '@/components/GoogleDriveImportModal';
import { googleDriveService } from '@/services/googleDriveService';
import { toast } from '@/hooks/use-toast';
import { trainingDocumentsService } from '@/services/trainingDocumentsService';
import { DOCUMENT_TRAINING_TYPES, type DocumentTrainingType, type TrainingDocument } from '@/types/training';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface TrainingDocumentsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ragEnabled?: boolean;
  ragTopK?: number;
  onRagSettingsChange?: (ragEnabled: boolean, ragTopK: number) => void;
}

export function TrainingDocumentsModal({ 
  open, 
  onOpenChange,
  ragEnabled = false,
  ragTopK = 5,
  onRagSettingsChange 
}: TrainingDocumentsModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<TrainingDocument[]>([]);
  const [selectedType, setSelectedType] = useState<DocumentTrainingType>('procuracao');
  const [selectedSubtype, setSelectedSubtype] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localRagEnabled, setLocalRagEnabled] = useState(ragEnabled);
  const [localRagTopK, setLocalRagTopK] = useState(ragTopK);
  const [showSourceDialog, setShowSourceDialog] = useState(false);
  const [showGoogleDriveModal, setShowGoogleDriveModal] = useState(false);

  useEffect(() => {
    if (open) {
      loadDocuments();
      setLocalRagEnabled(ragEnabled);
      setLocalRagTopK(ragTopK);
    }
  }, [open, ragEnabled, ragTopK]);

  useEffect(() => {
    // Reset subtype quando mudar o tipo
    setSelectedSubtype('');
  }, [selectedType]);

  const handleSaveRagSettings = () => {
    if (onRagSettingsChange) {
      onRagSettingsChange(localRagEnabled, localRagTopK);
      toast({
        title: 'Configurações salvas',
        description: 'As configurações de RAG foram atualizadas',
      });
    }
  };

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) return;

      const docs = await trainingDocumentsService.listUserTrainingDocuments(user.user.id);
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading training documents:', error);
      toast({
        title: 'Erro ao carregar documentos',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleChooseSource = () => {
    if (!selectedType) {
      toast({
        title: 'Selecione o tipo de documento',
        description: 'Escolha o tipo antes de selecionar os arquivos',
        variant: 'destructive',
      });
      return;
    }
    setShowSourceDialog(true);
  };

  const handleChooseLocalFiles = () => {
    setShowSourceDialog(false);
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const handleChooseGoogleDrive = async () => {
    setShowSourceDialog(false);
    
    const isConnected = await googleDriveService.isAuthenticated();
    
    if (!isConnected) {
      toast({
        title: 'Google Drive não conectado',
        description: 'Conecte sua conta do Google Drive nas Configurações primeiro.',
        variant: 'destructive',
      });
      return;
    }

    setShowGoogleDriveModal(true);
  };

  const handleGoogleDriveImport = async (files: File[]) => {
    if (files.length === 0) return;

    try {
      setUploading(true);

      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        throw new Error('Usuário não autenticado');
      }

      // Fazer upload de cada arquivo importado do Drive com feedback
      let successCount = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          await trainingDocumentsService.createTrainingDocument(
            file,
            user.user.id,
            selectedType,
            selectedSubtype || undefined
          );
          successCount++;
          
          // Mostrar progresso para múltiplos arquivos
          if (files.length > 1) {
            toast({
              title: `Processando arquivos...`,
              description: `${successCount}/${files.length} arquivo(s) importado(s)`,
            });
          }
        } catch (err) {
          console.error(`Error uploading file ${file.name}:`, err);
          toast({
            title: `Erro ao importar ${file.name}`,
            description: err instanceof Error ? err.message : 'Erro desconhecido',
            variant: 'destructive',
          });
        }
      }

      if (successCount > 0) {
        toast({
          title: 'Documentos adicionados!',
          description: `${successCount} documento(s) importado(s) do Google Drive com sucesso`,
        });
      }

      setSelectedType('procuracao');
      setSelectedSubtype('');

      await loadDocuments();
      
      // Fechar modal do Google Drive após importar
      setShowGoogleDriveModal(false);
    } catch (error) {
      console.error('Error importing from Google Drive:', error);
      toast({
        title: 'Erro ao importar do Drive',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedType) {
      toast({
        title: 'Preencha todos os campos',
        description: 'Selecione um arquivo e o tipo de documento',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUploading(true);

      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) {
        throw new Error('Usuário não autenticado');
      }

      await trainingDocumentsService.createTrainingDocument(
        selectedFile,
        user.user.id,
        selectedType,
        selectedSubtype || undefined
      );

      toast({
        title: 'Documento adicionado!',
        description: 'O documento foi adicionado à base de treinamento',
      });

      setSelectedFile(null);
      setSelectedType('procuracao');
      setSelectedSubtype('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      await loadDocuments();
    } catch (error) {
      console.error('Error uploading training document:', error);
      toast({
        title: 'Erro ao fazer upload',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await trainingDocumentsService.deleteTrainingDocument(id);
      toast({
        title: 'Documento removido',
        description: 'O documento foi removido da base de treinamento',
      });
      await loadDocuments();
    } catch (error) {
      console.error('Error deleting training document:', error);
      toast({
        title: 'Erro ao remover documento',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    }
  };

  const getTypeLabel = (type: string) => {
    return (DOCUMENT_TRAINING_TYPES as any)[type]?.label || type;
  };

  const getSubtypeLabel = (type: string, subtype: string) => {
    return (DOCUMENT_TRAINING_TYPES as any)[type]?.subtypes?.[subtype] || subtype;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Base de Treinamento de Agentes</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Adicione documentos de exemplo para treinar os agentes especializados em cada tipo de documento
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Section */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Adicionar Novo Documento de Treinamento
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Documento</Label>
                  <Select 
                    value={selectedType} 
                    onValueChange={(value) => setSelectedType(value as DocumentTrainingType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DOCUMENT_TRAINING_TYPES).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          {value.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Subtipo</Label>
                  <Select 
                    value={selectedSubtype} 
                    onValueChange={setSelectedSubtype}
                    disabled={!selectedType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o subtipo (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedType && Object.entries(DOCUMENT_TRAINING_TYPES[selectedType].subtypes).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Selecionar Arquivos</Label>
                <div className="flex gap-2">
                  <Button
                    onClick={handleChooseSource}
                    disabled={uploading || !selectedType}
                    variant="outline"
                    className="flex-1"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Adicionando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Escolher Origem dos Arquivos
                      </>
                    )}
                  </Button>
                </div>
                
                {/* Input oculto para arquivos locais */}
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                {selectedFile && (
                  <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                      <p className="text-sm flex-1 truncate">
                        {selectedFile.name}
                      </p>
                    </div>
                    <Button
                      onClick={handleUpload}
                      disabled={uploading}
                      size="sm"
                      className="flex-shrink-0"
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  {selectedType 
                    ? 'Escolha a origem e selecione os arquivos de exemplo para treinamento' 
                    : 'Selecione o tipo de documento primeiro'}
                </p>
              </div>
            </div>
          </div>

          {/* Documents List */}
          <div>
            <h3 className="font-semibold mb-3">Documentos de Treinamento ({documents.length})</h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum documento de treinamento adicionado</p>
                <p className="text-sm mt-1">Adicione documentos para treinar os agentes especializados</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={cn(
                      "flex items-center justify-between p-3 border rounded-lg",
                      "hover:bg-muted/50 transition-colors"
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {getTypeLabel(doc.document_type)}
                          {doc.document_subtype && ` • ${getSubtypeLabel(doc.document_type, doc.document_subtype)}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(doc.id)}
                      className="flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Configurações de RAG */}
          <Separator className="my-6" />
          
          <div className="border rounded-lg p-4 bg-muted/30">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configurações de RAG (Retrieval-Augmented Generation)
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-base">Ativar RAG no Gerar</Label>
                  <p className="text-sm text-muted-foreground">
                    Incluir automaticamente documentos adicionais de contexto
                  </p>
                </div>
                <Switch
                  checked={localRagEnabled}
                  onCheckedChange={setLocalRagEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label>Quantidade de documentos adicionais (top-K)</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={localRagTopK}
                  onChange={(e) => setLocalRagTopK(parseInt(e.target.value || '5'))}
                  disabled={!localRagEnabled}
                />
                <p className="text-xs text-muted-foreground">
                  Número de documentos extras que serão incluídos automaticamente na geração
                </p>
              </div>

              <Button 
                onClick={handleSaveRagSettings}
                className="w-full"
                variant="outline"
              >
                Salvar Configurações de RAG
              </Button>
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="font-medium text-blue-900 mb-2">💡 Como funciona:</p>
            <ul className="space-y-1 text-blue-800">
              <li>• <strong>Base de Treinamento:</strong> Documentos de exemplo para treinar os agentes especializados</li>
              <li>• <strong>RAG:</strong> Sistema que inclui automaticamente documentos de contexto relevantes</li>
              <li>• Quanto mais exemplos de qualidade, melhor será a geração</li>
              <li>• Cada tipo de documento tem seu agente especializado</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Source Selection Dialog */}
      <AlertDialog open={showSourceDialog} onOpenChange={setShowSourceDialog}>
        <AlertDialogContent className="rounded-3xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl">Escolha a origem dos arquivos</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              De onde você deseja importar os documentos de treinamento?
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="grid gap-3 py-4">
            <Button
              onClick={handleChooseLocalFiles}
              variant="outline"
              className="h-20 justify-start gap-4 rounded-2xl border-2 hover:border-primary hover:bg-primary/5"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <HardDrive className="w-6 h-6 text-primary" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-base">Repositório Local</div>
                <div className="text-sm text-muted-foreground">Arquivos do seu computador</div>
              </div>
            </Button>

            <Button
              onClick={handleChooseGoogleDrive}
              variant="outline"
              className="h-20 justify-start gap-4 rounded-2xl border-2 hover:border-primary hover:bg-primary/5"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Cloud className="w-6 h-6 text-primary" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-base">Google Drive</div>
                <div className="text-sm text-muted-foreground">Importar do Drive</div>
              </div>
            </Button>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl">Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Google Drive Import Modal */}
      <GoogleDriveImportModal
        open={showGoogleDriveModal}
        onOpenChange={setShowGoogleDriveModal}
        onFilesImported={handleGoogleDriveImport}
        closeOnImport={false}
      />
    </Dialog>
  );
}

