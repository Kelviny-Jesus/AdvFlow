import { useState, useCallback, useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ThemeProvider } from "next-themes";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Upload as UploadIcon, 
  X, 
  FileText, 
  Check, 
  AlertCircle,
  Trash2,
  Send,
  FolderPlus,
  UserPlus,
  Folder,
  Loader2,
  Wand2,
  FolderOpen
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { UploadFile, FolderItem, UploadDestination } from "@/types";
import { detectFileType, formatFileSize, getFileIcon } from "@/utils/fileUtils";
import { toast } from "@/hooks/use-toast";
import { useFoldersReal } from "@/hooks/useFoldersReal";
import { useSmartUploadReal } from "@/hooks/useSmartUploadReal";
import { useNavigate } from "react-router-dom";
import { GenerateModal } from "@/components/GenerateModal";

const Uploads = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [panel, setPanel] = useState<'context' | 'docs'>('context');
  const navigate = useNavigate();
  const [openGenerate, setOpenGenerate] = useState(false);
  
  // Real Supabase data hooks
  const { data: folders = [], isLoading: foldersLoading, error: foldersError } = useFoldersReal();
  const { 
    uploadFiles, 
    addFiles: addUploadFiles, 
    removeFile: removeUploadFile, 
    processUploads, 
    clearAll: clearAllUploads,
    completedCount,
    errorCount,
    totalProgress,
    isUploading,
    canUpload,
    lastTargetFolder
  } = useSmartUploadReal();
  
  // Configurações de destino
  const [destinationType, setDestinationType] = useState<'existing_folder' | 'new_client' | 'new_subfolder'>('existing_folder');
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [newClientName, setNewClientName] = useState("");
  const [newSubfolderName, setNewSubfolderName] = useState("");
  const [selectedParentFolder, setSelectedParentFolder] = useState<string>("");

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const addFiles = (newFiles: File[]) => {
    const destination: UploadDestination = {
      type: destinationType,
      folderId: destinationType === 'existing_folder' ? (selectedFolderId || undefined) : undefined,
      clientName: destinationType === 'new_client' ? newClientName.trim() : undefined,
      subfolderName: destinationType === 'new_subfolder' ? newSubfolderName.trim() : undefined,
      parentFolderId: destinationType === 'new_subfolder' ? (selectedParentFolder || undefined) : undefined,
      isContext: panel === 'context',
    };
    
    console.log('Upload destination:', destination); // Debug log
    addUploadFiles(newFiles, destination);
  };

  const removeFile = (id: string) => {
    removeUploadFile(id);
  };

  const handleUploadAll = async () => {
    if (uploadFiles.length === 0) {
      toast({
        title: "Nenhum arquivo para enviar",
        description: "Adicione arquivos antes de fazer upload.",
        variant: "destructive",
      });
      return;
    }

    // Validar destino
    if (destinationType === 'existing_folder' && (!selectedFolderId || selectedFolderId.trim() === '')) {
      toast({
        title: "Selecione uma pasta",
        description: "Escolha a pasta de destino para os arquivos.",
        variant: "destructive",
      });
      return;
    }

    if (destinationType === 'new_client' && !newClientName.trim()) {
      toast({
        title: "Nome do cliente obrigatório",
        description: "Digite o nome do novo cliente.",
        variant: "destructive",
      });
      return;
    }

    if (destinationType === 'new_subfolder' && (!newSubfolderName.trim() || !selectedParentFolder)) {
      toast({
        title: "Dados da subpasta incompletos",
        description: "Digite o nome da subpasta e selecione a pasta pai.",
        variant: "destructive",
      });
      return;
    }

    const pendingFiles = uploadFiles.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) {
      toast({
        title: "Todos os arquivos já foram processados",
        description: "Adicione novos arquivos para fazer upload.",
        variant: "destructive",
      });
      return;
    }

    try {
      const results = await processUploads();
      const successWord = results.success === 1 ? 'arquivo' : 'arquivos';
      const errorWord = results.errors === 1 ? 'arquivo' : 'arquivos';

      toast({
        title: "Upload concluído!",
        description: `${results.success} ${successWord} enviado(s) com sucesso.`,
      });
      
      if (results.errors > 0) {
        toast({
          title: "Alguns arquivos falharam",
          description: `${results.errors} ${errorWord} não puderam ser enviados.`,
          variant: "destructive",
        });
      }
      // Após concluir, limpar a lista de arquivos para evitar reenvio automático,
      // mantendo o destino selecionado intacto
      clearAllUploads();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erro no upload",
        description: "Falha ao processar os arquivos.",
        variant: "destructive",
      });
    }
  };

  const clearAll = () => {
    clearAllUploads();
  };

  const completedFiles = uploadFiles.filter(f => f.status === 'completed').length;

  // Preparar opções para os SearchableSelect
  const allFolderOptions: SearchableSelectOption[] = folders.map(folder => ({
    value: folder.id,
    label: folder.path
  }));

  const clientFolderOptions: SearchableSelectOption[] = folders
    .filter(f => f.kind === 'client')
    .map(folder => ({
      value: folder.id,
      label: folder.name
    }));

  // Handle errors
  if (foldersError) {
    console.error('Error loading folders:', foldersError);
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-gradient-subtle">
          <Header searchQuery="" onSearchChange={() => {}} showGenerateButton={false} />
          
          <main className="flex-1 p-6">
              <div className="max-w-5xl mx-auto space-y-6">
                <div>
                  <Button
                    onClick={() => setOpenGenerate(true)}
                    className="w-full h-12 text-lg bg-teal-600 hover:bg-teal-700 rounded-2xl"
                  >
                    GERAR
                    <Wand2 className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1 className="text-3xl font-bold text-foreground">Uploads</h1>
                  <p className="text-muted-foreground">
                    Envie e organize seus documentos jurídicos
                  </p>
                </motion.div>

                {/* Seletor de painel (Contexto x Docs) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setPanel('context')}
                    className={cn(
                      "rounded-2xl border-2 p-6 text-left transition-all",
                      panel === 'context' ? 'border-teal-600 bg-teal-600/5' : 'border-teal-700/40 hover:border-teal-600'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-teal-600/20 text-teal-600 flex items-center justify-center">
                        <FolderOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-xl font-bold tracking-wide">CONTEXTO</div>
                        <div className="text-sm text-muted-foreground">Áudios, textos e notas para enriquecer o caso</div>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setPanel('docs')}
                    className={cn(
                      "rounded-2xl border-2 p-6 text-left transition-all",
                      panel === 'docs' ? 'border-teal-600 bg-teal-600/5' : 'border-teal-700/40 hover:border-teal-600'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-teal-600/20 text-teal-600 flex items-center justify-center">
                        <FolderOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="text-xl font-bold tracking-wide">Docs</div>
                        <div className="text-sm text-muted-foreground">Fluxo atual com renomeação por IA</div>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Configuração de Destino */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <Card className="bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FolderPlus className="w-5 h-5 text-primary" />
                        {panel === 'context' ? 'Destino do Contexto' : 'Destino dos Arquivos'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <RadioGroup value={destinationType} onValueChange={(value: any) => setDestinationType(value)}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="existing_folder" id="existing" />
                          <Label htmlFor="existing" className="flex items-center gap-2">
                            <Folder className="w-4 h-4" />
                            Pasta existente
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="new_client" id="new_client" />
                          <Label htmlFor="new_client" className="flex items-center gap-2">
                            <UserPlus className="w-4 h-4" />
                            Criar nova pasta de cliente
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="new_subfolder" id="new_subfolder" />
                          <Label htmlFor="new_subfolder" className="flex items-center gap-2">
                            <FolderPlus className="w-4 h-4" />
                            Criar subpasta
                          </Label>
                        </div>
                      </RadioGroup>

                      {destinationType === 'existing_folder' && (
                        <div className="space-y-2">
                          <Label>Selecionar pasta</Label>
                          <SearchableSelect
                            options={allFolderOptions}
                            value={selectedFolderId}
                            onValueChange={setSelectedFolderId}
                            placeholder={foldersLoading ? "Carregando pastas..." : "Escolha uma pasta..."}
                            searchPlaceholder="Buscar pasta..."
                            emptyText={foldersLoading ? "Carregando..." : "Nenhuma pasta encontrada"}
                            disabled={foldersLoading}
                          />
                          {foldersError && (
                            <p className="text-sm text-destructive">Erro ao carregar pastas</p>
                          )}
                        </div>
                      )}

                      {destinationType === 'new_client' && (
                        <div className="space-y-2">
                          <Label>Nome do novo cliente</Label>
                          <Input
                            placeholder="Ex: João Silva"
                            value={newClientName}
                            onChange={(e) => setNewClientName(e.target.value)}
                            className="rounded-2xl"
                          />
                        </div>
                      )}

                      {destinationType === 'new_subfolder' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Pasta pai</Label>
                            <SearchableSelect
                              options={clientFolderOptions}
                              value={selectedParentFolder}
                              onValueChange={setSelectedParentFolder}
                              placeholder={foldersLoading ? "Carregando clientes..." : "Selecione a pasta pai..."}
                              searchPlaceholder="Buscar cliente..."
                              emptyText={foldersLoading ? "Carregando..." : "Nenhum cliente encontrado"}
                              disabled={foldersLoading}
                            />
                            {foldersError && (
                              <p className="text-sm text-destructive">Erro ao carregar clientes</p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>Nome da subpasta</Label>
                            <Input
                              placeholder="Ex: Contratos"
                              value={newSubfolderName}
                              onChange={(e) => setNewSubfolderName(e.target.value)}
                              className="rounded-2xl"
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Drop Zone */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <Card className="bg-card/50 backdrop-blur-sm border-2 border-dashed transition-colors">
                    <CardContent
                      className={cn(
                        "p-8 text-center cursor-pointer transition-all duration-200",
                        isDragging && "border-primary bg-primary/5"
                      )}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('file-input')?.click()}
                    >
                      <motion.div
                        animate={{ scale: isDragging ? 1.05 : 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <UploadIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                          {isDragging ? "Solte os arquivos aqui" : panel === 'context' ? 'Contexto: arraste áudios, textos, PDFs...' : 'Arraste arquivos ou clique para selecionar'}
                        </h3>
                        <p className="text-muted-foreground">
                          PDF, DOCX, Imagens, Áudio e mais
                        </p>
                        <input
                          id="file-input"
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files) {
                              addFiles(Array.from(e.target.files));
                              e.target.value = '';
                            }
                          }}
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp3,.wav,.ogg,.opus,.mp4,.zip,.txt,.md"
                        />
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Files List */}
                <AnimatePresence>
                  {uploadFiles.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="bg-card/50 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" />
                            {panel === 'context' ? 'Itens de Contexto' : 'Arquivos para Upload'} ({uploadFiles.length})
                          </CardTitle>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={clearAll}
                              disabled={totalProgress > 0 && totalProgress < 100}
                              className="rounded-2xl"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Limpar
                            </Button>
                            <Button
                              onClick={handleUploadAll}
                              disabled={totalProgress > 0 && totalProgress < 100 || uploadFiles.every(f => f.status === 'completed')}
                              className="bg-gradient-primary rounded-2xl"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              {totalProgress > 0 && totalProgress < 100 ? "Enviando..." : panel === 'context' ? 'Salvar Contexto' : 'Enviar Tudo'}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Progress Bar */}
                          {totalProgress > 0 && totalProgress < 100 && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span>Progresso Geral</span>
                                <span>{Math.round(totalProgress)}%</span>
                              </div>
                              <Progress value={totalProgress} className="h-2" />
                            </div>
                          )}

                          {/* Files */}
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {uploadFiles.map((file, index) => (
                              <motion.div
                                key={file.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                                className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl"
                              >
                                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                                  {file.status === 'completed' ? (
                                    <Check className="w-6 h-6 text-success" />
                                  ) : file.status === 'error' ? (
                                    <AlertCircle className="w-6 h-6 text-destructive" />
                                  ) : (
                                    <span className="text-xl">{getFileIcon(detectFileType(file.file.name))}</span>
                                  )}
                                </div>
                                
                                <div className="flex-1 min-w-0 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-foreground truncate">{file.file.name}</h4>
                                    {file.status === 'pending' && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeFile(file.id)}
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span>{formatFileSize(file.file.size)}</span>
                                    <span>•</span>
                                    <span className="capitalize">{detectFileType(file.file.name)}</span>
                                  </div>

                                  {file.status === 'uploading' && (
                                    <Progress value={file.progress} className="h-1" />
                                  )}
                                </div>
                              </motion.div>
                            ))}
                          </div>

                          {/* Summary */}
                          {completedFiles > 0 && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="mt-4 p-3 bg-success/10 border border-success/20 rounded-2xl"
                            >
                              <p className="text-sm text-success font-medium">
                                ✓ {completedFiles} de {uploadFiles.length} arquivo(s) enviado(s) com sucesso
                              </p>
                            </motion.div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Botão Ir para Pasta */}
                <div className="flex justify-center pt-2">
                  <Button
                    disabled={!lastTargetFolder}
                    onClick={() => lastTargetFolder && navigate(`/folders?folder=${lastTargetFolder.id}`)}
                    className="bg-teal-600 hover:bg-teal-700 rounded-2xl"
                  >
                    IR PARA PASTA
                  </Button>
                </div>
              </div>
          </main>
          <GenerateModal open={openGenerate} onOpenChange={setOpenGenerate} />
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default Uploads;
