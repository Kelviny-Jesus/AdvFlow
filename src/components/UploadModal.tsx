import { useState, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  X,
  FileText,
  Plus,
  Check,
  AlertCircle,
} from "lucide-react";
import { mockClients, mockCases } from "@/data/mockData";
import { Client, Case, UploadProgress } from "@/types/document";
import { detectFileType, formatFileSize, generateFileName } from "@/utils/documentUtils";
import { toast } from "@/hooks/use-toast";

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FileWithProgress {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  finalName?: string;
}

export function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedCase, setSelectedCase] = useState<string>("");
  const [newClientName, setNewClientName] = useState("");
  const [newCaseName, setNewCaseName] = useState("");
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clients = [...mockClients];
  const cases = selectedClient 
    ? mockCases.filter(c => c.clientId === selectedClient)
    : mockCases;

  const resetForm = () => {
    setSelectedClient("");
    setSelectedCase("");
    setNewClientName("");
    setNewCaseName("");
    setFiles([]);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const addFiles = (newFiles: File[]) => {
    const filesWithProgress: FileWithProgress[] = newFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      progress: 0,
      status: 'pending' as const,
    }));
    
    setFiles(prev => [...prev, ...filesWithProgress]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const simulateUpload = async (fileWithProgress: FileWithProgress) => {
    const clientName = selectedClient 
      ? clients.find(c => c.id === selectedClient)?.name || "Cliente"
      : newClientName || "Cliente";
    
    const caseName = selectedCase 
      ? cases.find(c => c.id === selectedCase)?.name || "Caso"
      : newCaseName || "Caso";

    const finalName = generateFileName(fileWithProgress.file.name, clientName, caseName);
    
    // Update status to uploading
    setFiles(prev => prev.map(f => 
      f.id === fileWithProgress.id 
        ? { ...f, status: 'uploading' as const, finalName }
        : f
    ));

    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += Math.random() * 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      setFiles(prev => prev.map(f => 
        f.id === fileWithProgress.id 
          ? { ...f, progress: Math.min(progress, 100) }
          : f
      ));
    }

    // Complete upload
    setFiles(prev => prev.map(f => 
      f.id === fileWithProgress.id 
        ? { ...f, progress: 100, status: 'completed' as const }
        : f
    ));
  };

  const handleUpload = async () => {
    if (!selectedClient && !newClientName) {
      toast({
        title: "Cliente obrigatório",
        description: "Selecione um cliente existente ou crie um novo.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedCase && !newCaseName) {
      toast({
        title: "Caso obrigatório", 
        description: "Selecione um caso existente ou crie um novo.",
        variant: "destructive",
      });
      return;
    }

    if (files.length === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Adicione pelo menos um arquivo para fazer upload.",
        variant: "destructive",
      });
      return;
    }

    // Start uploading all files
    const uploadPromises = files.map(file => simulateUpload(file));
    
    try {
      await Promise.all(uploadPromises);
      
      toast({
        title: "Upload concluído!",
        description: `${files.length} arquivo(s) enviado(s) com sucesso.`,
      });

      setTimeout(() => {
        onOpenChange(false);
        resetForm();
      }, 1500);
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: "Alguns arquivos falharam no upload.",
        variant: "destructive",
      });
    }
  };

  const allFilesCompleted = files.length > 0 && files.every(f => f.status === 'completed');
  const hasUploadingFiles = files.some(f => f.status === 'uploading');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-sm">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Novo Upload</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Client and Case Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client">Cliente</Label>
              <Select
                value={selectedClient}
                onValueChange={(value) => {
                  setSelectedClient(value);
                  setNewClientName("");
                  setSelectedCase("");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2">
                <div className="h-px bg-border flex-1" />
                <span className="text-xs text-muted-foreground">ou</span>
                <div className="h-px bg-border flex-1" />
              </div>
              
              <Input
                placeholder="Nome do novo cliente"
                value={newClientName}
                onChange={(e) => {
                  setNewClientName(e.target.value);
                  setSelectedClient("");
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="case">Caso</Label>
              <Select
                value={selectedCase}
                onValueChange={(value) => {
                  setSelectedCase(value);
                  setNewCaseName("");
                }}
                disabled={!selectedClient && !newClientName}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar caso..." />
                </SelectTrigger>
                <SelectContent>
                  {cases.map((case_) => (
                    <SelectItem key={case_.id} value={case_.id}>
                      {case_.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="flex items-center gap-2">
                <div className="h-px bg-border flex-1" />
                <span className="text-xs text-muted-foreground">ou</span>
                <div className="h-px bg-border flex-1" />
              </div>
              
              <Input
                placeholder="Nome do novo caso"
                value={newCaseName}
                onChange={(e) => {
                  setNewCaseName(e.target.value);
                  setSelectedCase("");
                }}
              />
            </div>
          </div>

          {/* File Upload Area */}
          <div className="space-y-4">
            <Label>Arquivos</Label>
            
            <div
              className={`drop-zone ${isDragging ? 'drop-zone-active' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">
                Arraste arquivos aqui ou clique para selecionar
              </p>
              <p className="text-sm text-muted-foreground">
                Suporte para PDF, Word, Excel, imagens e áudio
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    addFiles(Array.from(e.target.files));
                  }
                }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.mp3,.wav,.ogg"
              />
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {files.map((fileWithProgress) => (
                  <div
                    key={fileWithProgress.id}
                    className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      {fileWithProgress.status === 'completed' ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : fileWithProgress.status === 'error' ? (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      ) : (
                        <FileText className="w-4 h-4 text-primary" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {fileWithProgress.finalName || fileWithProgress.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(fileWithProgress.file.size)}
                      </p>
                      
                      {fileWithProgress.status === 'uploading' && (
                        <Progress 
                          value={fileWithProgress.progress} 
                          className="mt-2 h-1"
                        />
                      )}
                    </div>
                    
                    {fileWithProgress.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFile(fileWithProgress.id)}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={hasUploadingFiles}
            >
              {allFilesCompleted ? "Fechar" : "Cancelar"}
            </Button>
            
            {!allFilesCompleted && (
              <Button
                onClick={handleUpload}
                disabled={hasUploadingFiles}
                className="bg-gradient-primary hover:shadow-medium transition-all"
              >
                {hasUploadingFiles ? (
                  <>
                    <Upload className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Enviar Arquivos
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}