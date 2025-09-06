import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "next-themes";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Wand2,
  FileText,
  Save,
  Download,
  RefreshCw,
  Sparkles,
  Search,
  FolderOpen,
  Plus,
  CheckCircle2,
  Folder,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import type { FileItem, Case, Fact } from "@/types";
import { getFileIcon } from "@/utils/fileUtils";
import { toast } from "@/hooks/use-toast";
import { useFactsData } from "@/hooks/useFactsData";
import { factsAIService } from "@/services/factsAIService";
import { PetitionService } from "@/services/petitionService";

const Petitions = () => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [selectedCase, setSelectedCase] = useState<string>("all");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [petitionContent, setPetitionContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Usar dados reais do Supabase
  const {
    clientFolders,
    availableSubfolders,
    selectedFolder,
    documents,
    cases,
    isLoading
  } = useFactsData(selectedFolderId);

  // Filtrar documentos por caso se selecionado
  const files: FileItem[] = selectedCase && selectedCase !== 'all'
    ? (documents as FileItem[]).filter(f => f.caseId === selectedCase)
    : (documents as FileItem[]);

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileSelection = (fileId: string, checked: boolean) => {
    setSelectedFiles(prev => 
      checked 
        ? [...prev, fileId]
        : prev.filter(id => id !== fileId)
    );
  };

  const handleGeneratePetition = async () => {
    if (!selectedFolderId || selectedFiles.length === 0) {
      toast({
        title: "Seleção incompleta",
        description: "Selecione uma pasta/cliente e pelo menos um documento.",
        variant: "destructive",
      });
      return;
    }

    if (!factsAIService.isConfigured()) {
      toast({
        title: "IA não configurada",
        description: "Chave da OpenAI não configurada. Verifique as configurações.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      console.log('🤖 Iniciando geração de fatos...');
      console.log('📁 Pasta selecionada:', selectedFolder?.name);
      console.log('📄 Documentos selecionados:', selectedFiles.length);

      // Preparar dados dos documentos selecionados
      const selectedDocuments = files.filter(f => selectedFiles.includes(f.id));
      
      // Buscar caso selecionado
      const selectedCaseData = cases.find(c => c.id === selectedCase);
      
      // Gerar fatos usando IA
      const generatedFacts = await factsAIService.generateFacts({
        clientId: selectedFolder?.clientId || '',
        clientName: selectedFolder?.name || '',
        caseReference: selectedCaseData?.reference,
        documentIds: selectedFiles,
        documents: selectedDocuments.map(doc => ({
          id: doc.id,
          name: doc.name,
          docNumber: doc.docNumber,
          extractedData: doc.extractedData,
          type: doc.type,
          createdAt: doc.createdAt
        }))
      });

      setPetitionContent(generatedFacts);
      
      toast({
        title: "Fatos gerados com sucesso!",
        description: `Relatório de fatos gerado com base em ${selectedFiles.length} documentos.`,
      });
    } catch (error) {
      console.error('Erro na geração de fatos:', error);
      toast({
        title: "Erro na geração",
        description: error instanceof Error ? error.message : "Não foi possível gerar os fatos.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!petitionContent || !selectedFolderId) {
      toast({
        title: "Nada para salvar",
        description: "Gere os fatos primeiro antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    try {
      const selectedCaseData = cases.find(c => c.id === selectedCase);
      
      await PetitionService.createPetition({
        title: `Fatos - ${selectedFolder?.name} - ${new Date().toLocaleDateString('pt-BR')}`,
        clientId: selectedFolder?.clientId || '',
        caseId: selectedCaseData?.id || '',
        content: petitionContent,
        documentIds: selectedFiles,
        status: 'draft'
      });

      toast({
        title: "Fatos salvos com sucesso!",
        description: "Os fatos foram salvos nos rascunhos.",
      });
    } catch (error) {
      console.error('Erro ao salvar fatos:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar os fatos.",
        variant: "destructive",
      });
    }
  };

  const handleExport = async (format: 'docx' | 'pdf') => {
    if (!petitionContent) {
      toast({
        title: "Nada para exportar",
        description: "Gere os fatos primeiro antes de exportar.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Criar um blob com o conteúdo
      const blob = new Blob([petitionContent], { 
        type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      
      // Criar link de download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Fatos_${selectedFolder?.name}_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: `Exportado para ${format.toUpperCase()}`,
        description: "O download foi iniciado.",
      });
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar o arquivo.",
        variant: "destructive",
      });
    }
  };

  const resetCaseSelection = () => {
    setSelectedCase("all");
    setSelectedFiles([]);
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-subtle">
          <AppSidebar />
          
          <div className="flex-1 flex flex-col">
            <Header searchQuery="" onSearchChange={() => {}} />
            
            <main className="flex-1 p-6">
              <div className="max-w-7xl mx-auto">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mb-6"
                >
                  <h1 className="text-3xl font-bold text-foreground">Gerador de Fatos</h1>
                  <p className="text-muted-foreground">
                    Crie Fatos automaticamente baseadas nos documentos das suas pastas
                  </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
                  {/* Coluna Esquerda - Seletor de Fontes */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="lg:col-span-1"
                  >
                    <Card className="bg-card/50 backdrop-blur-sm h-full">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <FolderOpen className="w-5 h-5 text-primary" />
                          Documentos
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Seletor de Pasta/Cliente */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Pasta do Cliente</label>
                          <Select value={selectedFolderId} onValueChange={(value) => {
                            setSelectedFolderId(value);
                            resetCaseSelection();
                          }}>
                            <SelectTrigger className="rounded-2xl">
                              <SelectValue placeholder="Selecionar pasta..." />
                            </SelectTrigger>
                            <SelectContent>
                              {clientFolders.map(folder => (
                                <SelectItem key={folder.id} value={folder.id}>
                                  <div className="flex items-center gap-2">
                                    <Folder className="w-4 h-4 text-primary" />
                                    {folder.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Seletor de Caso (opcional) */}
                        {selectedFolderId && cases.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Caso (Opcional)</label>
                            <Select value={selectedCase} onValueChange={setSelectedCase}>
                              <SelectTrigger className="rounded-2xl">
                                <SelectValue placeholder="Todos os documentos" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos os documentos</SelectItem>
                                {cases.map(case_ => (
                                  <SelectItem key={case_.id} value={case_.id}>
                                    {case_.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Subpastas disponíveis */}
                        {selectedFolderId && availableSubfolders.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-muted-foreground">
                              Subpastas Disponíveis ({availableSubfolders.length})
                            </label>
                            <div className="space-y-1">
                              {availableSubfolders.map(subfolder => (
                                <div key={subfolder.id} className="text-xs text-muted-foreground flex items-center gap-2 p-2 bg-muted/30 rounded-xl">
                                  <Folder className="w-3 h-3" />
                                  {subfolder.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Busca de Arquivos */}
                        {selectedFolderId && files.length > 0 && (
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Buscar Documentos</label>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                placeholder="Filtrar arquivos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 rounded-2xl"
                              />
                            </div>
                          </div>
                        )}

                        {/* Lista de Arquivos */}
                        {selectedFolderId && filteredFiles.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium">Arquivos ({selectedFiles.length} selecionados)</label>
                              <div className="flex gap-2">
                                {filteredFiles.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (selectedFiles.length === filteredFiles.length) {
                                        setSelectedFiles([]);
                                      } else {
                                        setSelectedFiles(filteredFiles.map(f => f.id));
                                      }
                                    }}
                                    className="text-xs"
                                  >
                                    {selectedFiles.length === filteredFiles.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                                  </Button>
                                )}
                                {selectedFiles.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedFiles([])}
                                    className="text-xs"
                                  >
                                    Limpar
                                  </Button>
                                )}
                              </div>
                            </div>
                            <ScrollArea className="h-64">
                              <div className="space-y-2">
                                {filteredFiles.map(file => (
                                  <div
                                    key={file.id}
                                    className="flex items-center space-x-2 p-2 rounded-xl hover:bg-muted/50 transition-colors"
                                  >
                                    <Checkbox
                                      id={file.id}
                                      checked={selectedFiles.includes(file.id)}
                                      onCheckedChange={(checked) => 
                                        handleFileSelection(file.id, checked as boolean)
                                      }
                                    />
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <span className="text-sm">{getFileIcon(file.type)}</span>
                                      <div className="min-w-0">
                                        <p className="text-xs font-medium truncate">
                                          {file.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {file.type.toUpperCase()}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}

                        {/* Estado vazio */}
                        {selectedFolderId && files.length === 0 && (
                          <div className="text-center p-4">
                            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                              Nenhum documento encontrado nesta pasta.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Coluna Central - Editor */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="lg:col-span-2"
                  >
                    <Card className="bg-card/50 backdrop-blur-sm h-full flex flex-col">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <FileText className="w-5 h-5 text-primary" />
                            Editor de Fatos
                          </CardTitle>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleSave}
                              disabled={!petitionContent}
                              className="rounded-2xl"
                            >
                              <Save className="w-4 h-4 mr-2" />
                              Salvar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExport('docx')}
                              disabled={!petitionContent}
                              className="rounded-2xl"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              DOCX
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleExport('pdf')}
                              disabled={!petitionContent}
                              className="rounded-2xl"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              PDF
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        <Textarea
                          placeholder="O conteúdo dos fatos aparecerá aqui após a geração..."
                          value={petitionContent}
                          onChange={(e) => setPetitionContent(e.target.value)}
                          className="flex-1 min-h-0 font-mono text-sm rounded-2xl"
                        />
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Coluna Direita - Painel IA */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                    className="lg:col-span-1"
                  >
                    <Card className="bg-card/50 backdrop-blur-sm h-full flex flex-col">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Sparkles className="w-5 h-5 text-primary" />
                          Assistente IA
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 flex-1">
                        {/* Botão de Geração */}
                        <Button
                          onClick={handleGeneratePetition}
                          disabled={isGenerating || !selectedFolderId || selectedFiles.length === 0}
                          className="w-full bg-gradient-primary rounded-2xl"
                        >
                          {isGenerating ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Gerando...
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-4 h-4 mr-2" />
                              Gerar Fatos
                            </>
                          )}
                        </Button>

                        <Separator />

                        {/* Status da Geração */}
                        <div className="space-y-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            Status da Geração
                          </h4>
                          
                          {isLoading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Carregando dados...
                            </div>
                          ) : !selectedFolderId ? (
                            <p className="text-sm text-muted-foreground">
                              Selecione uma pasta/cliente para começar.
                            </p>
                          ) : selectedFiles.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Selecione pelo menos um documento para gerar os fatos.
                            </p>
                          ) : !factsAIService.isConfigured() ? (
                            <p className="text-sm text-muted-foreground">
                              ⚠️ IA não configurada. Verifique a chave da OpenAI.
                            </p>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-sm text-muted-foreground">
                                ✅ Pronto para gerar fatos
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {selectedFiles.length} documento(s) selecionado(s)
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {files.filter(f => f.extractedData).length} com dados extraídos
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default Petitions;
