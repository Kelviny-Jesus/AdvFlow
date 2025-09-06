import { useState, useCallback } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "next-themes";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Folder
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { UploadFile, FolderItem } from "@/types";
import { mockFolders } from "@/data/mocks";
import { detectFileType, formatFileSize, getFileIcon } from "@/utils/fileUtils";
import { toast } from "@/hooks/use-toast";

const Uploads = () => {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [folders] = useState<FolderItem[]>(mockFolders);
  const [searchQuery, setSearchQuery] = useState("");
  
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
    const uploadFiles: UploadFile[] = newFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      status: 'pending',
      progress: 0,
      processingDate: new Date(),
      destination: {
        type: destinationType,
        folderId: selectedFolderId || undefined,
        clientName: newClientName || undefined,
        subfolderName: newSubfolderName || undefined,
        parentFolderId: selectedParentFolder || undefined,
      }
    }));
    
    setFiles(prev => [...prev, ...uploadFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFile = (id: string, updates: Partial<UploadFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleUploadAll = async () => {
    if (files.length === 0) {
      toast({
        title: "Nenhum arquivo para enviar",
        description: "Adicione arquivos antes de fazer upload.",
        variant: "destructive",
      });
      return;
    }

    // Validar destino
    if (destinationType === 'existing_folder' && !selectedFolderId) {
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

    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) {
      toast({
        title: "Todos os arquivos já foram processados",
        description: "Adicione novos arquivos para fazer upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      for (const file of pendingFiles) {
        updateFile(file.id, { status: 'uploading', progress: 0 });

        // Simular upload com progresso
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += Math.random() * 15;
          if (progress >= 90) {
            clearInterval(progressInterval);
            progress = 90;
          }
          updateFile(file.id, { progress });
        }, 200);

        // Simular criação de pasta se necessário
        if (destinationType === 'new_client') {
          await new Promise(resolve => setTimeout(resolve, 500));
        } else if (destinationType === 'new_subfolder') {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Simulate upload delay
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 1000));
        
        clearInterval(progressInterval);
        updateFile(file.id, { progress: 100, status: 'completed' });
      }

      const destinationText = destinationType === 'existing_folder' 
        ? folders.find(f => f.id === selectedFolderId)?.name
        : destinationType === 'new_client'
        ? `Nova pasta: ${newClientName}`
        : `Nova subpasta: ${newSubfolderName}`;

      toast({
        title: "Upload concluído!",
        description: `${pendingFiles.length} arquivo(s) enviado(s) para ${destinationText}.`,
      });
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: "Alguns arquivos falharam no upload.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const clearAll = () => {
    setFiles([]);
  };

  const totalProgress = files.length > 0 
    ? files.reduce((acc, file) => acc + file.progress, 0) / files.length 
    : 0;

  const completedFiles = files.filter(f => f.status === 'completed').length;

  // Filtrar pastas baseado na busca
  const filteredFolders = searchQuery.trim() 
    ? folders.filter(folder => 
        folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        folder.path.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : folders;

  const clientFolders = filteredFolders.filter(f => f.kind === 'client');
  const allFolders = filteredFolders.filter(f => f.kind !== 'client');

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-subtle">
          <AppSidebar />
          
          <div className="flex-1 flex flex-col">
            <Header
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
            
            <main className="flex-1 p-6">
              <div className="max-w-5xl mx-auto space-y-6">
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
                        Destino dos Arquivos
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
                          <Select value={selectedFolderId} onValueChange={setSelectedFolderId}>
                            <SelectTrigger className="rounded-2xl">
                              <SelectValue placeholder="Escolha uma pasta..." />
                            </SelectTrigger>
                            <SelectContent>
                              {filteredFolders.length > 0 ? (
                                filteredFolders.map(folder => (
                                  <SelectItem key={folder.id} value={folder.id}>
                                    {folder.path}
                                  </SelectItem>
                                ))
                              ) : (
                                <div className="p-2 text-sm text-muted-foreground text-center">
                                  Nenhuma pasta encontrada
                                </div>
                              )}
                            </SelectContent>
                          </Select>
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
                            <Select value={selectedParentFolder} onValueChange={setSelectedParentFolder}>
                              <SelectTrigger className="rounded-2xl">
                                <SelectValue placeholder="Selecione a pasta pai..." />
                              </SelectTrigger>
                              <SelectContent>
                                {clientFolders.length > 0 ? (
                                  clientFolders.map(folder => (
                                    <SelectItem key={folder.id} value={folder.id}>
                                      {folder.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <div className="p-2 text-sm text-muted-foreground text-center">
                                    Nenhuma pasta de cliente encontrada
                                  </div>
                                )}
                              </SelectContent>
                            </Select>
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
                          {isDragging ? "Solte os arquivos aqui" : "Arraste arquivos ou clique para selecionar"}
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
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp3,.wav,.mp4,.zip"
                        />
                      </motion.div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Files List */}
                <AnimatePresence>
                  {files.length > 0 && (
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
                            Arquivos para Upload ({files.length})
                          </CardTitle>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={clearAll}
                              disabled={isUploading}
                              className="rounded-2xl"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Limpar
                            </Button>
                            <Button
                              onClick={handleUploadAll}
                              disabled={isUploading || files.every(f => f.status === 'completed')}
                              className="bg-gradient-primary rounded-2xl"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              {isUploading ? "Enviando..." : "Enviar Tudo"}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Progress Bar */}
                          {isUploading && (
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
                            {files.map((file, index) => (
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
                                ✓ {completedFiles} de {files.length} arquivo(s) enviado(s) com sucesso
                              </p>
                            </motion.div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default Uploads;
