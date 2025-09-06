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
  FileCheck,
  Wand2,
  FileText,
  Save,
  Download,
  RefreshCw,
  Sparkles,
  Search,
  FolderOpen,
  Plus,
  Clock,
  CheckCircle2,
  Folder
} from "lucide-react";
import { motion } from "framer-motion";
import type { FileItem, FolderItem, Case, Fact } from "@/types";
import { mockFiles, mockFolders, mockCases, mockFacts, getMockData } from "@/data/mocks";
import { getFileIcon } from "@/utils/fileUtils";
import { toast } from "@/hooks/use-toast";

const Petitions = () => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [selectedCase, setSelectedCase] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [petitionContent, setPetitionContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Buscar pastas (clientes)
  const clientFolders = mockFolders.filter(f => f.kind === 'client');
  
  // Buscar subpastas do cliente selecionado  
  const availableSubfolders = selectedFolderId 
    ? mockFolders.filter(f => f.parentId === selectedFolderId)
    : [];
    
  // Buscar casos do cliente selecionado
  const selectedFolder = mockFolders.find(f => f.id === selectedFolderId);
  const cases = selectedFolder 
    ? mockCases.filter(c => c.clientId === selectedFolder.clientId)
    : [];

  // Buscar arquivos da pasta/caso selecionado
  const files = selectedCase 
    ? mockFiles.filter(f => f.caseId === selectedCase)
    : selectedFolderId
    ? mockFiles.filter(f => f.appProperties?.folderId === selectedFolderId)
    : [];

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

    setIsGenerating(true);

    try {
      // Simular geração
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const generatedFacts = mockFacts.filter(f => 
        f.documentRefs?.some(ref => selectedFiles.includes(ref))
      );
      
      setFacts(generatedFacts);
      
      const folder = clientFolders.find(f => f.id === selectedFolderId);
      const case_ = cases.find(c => c.id === selectedCase);
      
      const generatedContent = `# PETIÇÃO INICIAL - ${folder?.name.toUpperCase()}

**Referência do Caso:** ${case_?.reference || 'A ser preenchida'}
**Data:** ${new Date().toLocaleDateString('pt-BR')}

## I. QUALIFICAÇÃO DAS PARTES

**REQUERENTE:** ${folder?.name}
**REQUERIDO:** (A ser preenchido)

## II. DOS FATOS

${generatedFacts.map((fact, index) => 
  `${index + 1}. ${fact.text} (Ref: ${fact.documentRefs?.map(ref => {
    const file = files.find(f => f.id === ref);
    return file?.docNumber || 'DOC';
  }).join(', ')})`
).join('\n\n')}

## III. DOCUMENTOS ANEXOS

${selectedFiles.map((fileId, index) => {
  const file = files.find(f => f.id === fileId);
  return `${file?.docNumber || `DOC n. ${String(index + 1).padStart(3, '0')}`} - ${file?.name}`;
}).join('\n')}

## IV. DO DIREITO

(Fundamentação jurídica a ser desenvolvida)

## V. DOS PEDIDOS

Diante do exposto, requer-se:

a) (Pedido principal)
b) (Pedidos subsidiários)

Termos em que pede deferimento.

Local, ${new Date().toLocaleDateString('pt-BR')}.

_____________________
Advogado(a)
OAB/XX nº XXXXX`;

      setPetitionContent(generatedContent);
      
      toast({
        title: "Petição gerada com sucesso!",
        description: `${generatedFacts.length} fatos extraídos automaticamente.`,
      });
    } catch (error) {
      toast({
        title: "Erro na geração",
        description: "Não foi possível gerar a petição.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    toast({
      title: "Minuta salva",
      description: "A petição foi salva nos rascunhos.",
    });
  };

  const handleExport = (format: 'docx' | 'pdf') => {
    toast({
      title: `Exportando para ${format.toUpperCase()}`,
      description: "O download será iniciado em instantes.",
    });
  };

  const insertFact = (fact: Fact) => {
    const insertion = `\n\n${fact.text} (Ref: DOC n. xxx)\n`;
    setPetitionContent(prev => prev + insertion);
  };

  const resetCaseSelection = () => {
    setSelectedCase("");
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
                  <h1 className="text-3xl font-bold text-foreground">Gerador de Petições</h1>
                  <p className="text-muted-foreground">
                    Crie petições automaticamente baseadas nos documentos das suas pastas
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
                                <SelectItem value="">Todos os documentos</SelectItem>
                                {cases.map(case_ => (
                                  <SelectItem key={case_.id} value={case_.id}>
                                    {case_.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {/* Mostrar subpastas disponSilentes */}
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
                                          {file.docNumber || file.name}
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
                            Editor de Petição
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
                          placeholder="O conteúdo da petição aparecerá aqui após a geração..."
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
                              Gerar Petição
                            </>
                          )}
                        </Button>

                        <Separator />

                        {/* Fatos Extraídos */}
                        <div className="space-y-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            Fatos Extraídos ({facts.length})
                          </h4>
                          
                          {facts.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Selecione uma pasta e documentos, depois gere a petição para ver os fatos extraídos.
                            </p>
                          ) : (
                            <ScrollArea className="h-64">
                              <div className="space-y-3">
                                {facts.map(fact => (
                                  <motion.div
                                    key={fact.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-3 bg-muted/30 rounded-2xl space-y-2"
                                  >
                                    <div className="flex items-start justify-between">
                                      <Badge variant="outline" className="text-xs capitalize">
                                        {fact.type}
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => insertFact(fact)}
                                        className="h-6 px-2 text-xs rounded-xl"
                                      >
                                        <Plus className="w-3 h-3 mr-1" />
                                        Inserir
                                      </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                      {fact.text}
                                    </p>
                                    {fact.confidence && (
                                      <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-muted rounded-full h-1">
                                          <div 
                                            className="bg-primary h-1 rounded-full" 
                                            style={{ width: `${fact.confidence * 100}%` }}
                                          />
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                          {Math.round(fact.confidence * 100)}%
                                        </span>
                                      </div>
                                    )}
                                  </motion.div>
                                ))}
                              </div>
                            </ScrollArea>
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

const Petitions = () => {
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [selectedCase, setSelectedCase] = useState<string>("");
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [petitionContent, setPetitionContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const clients = mockClients;
  const cases = selectedClient ? mockCases.filter(c => c.clientId === selectedClient) : [];
  const files = selectedCase ? mockFiles.filter(f => f.caseId === selectedCase) : [];

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
    if (!selectedClient || !selectedCase || selectedFiles.length === 0) {
      toast({
        title: "Seleção incompleta",
        description: "Selecione cliente, caso e pelo menos um documento.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Simular geração
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const generatedFacts = mockFacts.filter(f => 
        f.documentRefs?.some(ref => selectedFiles.includes(ref))
      );
      
      setFacts(generatedFacts);
      
      const client = clients.find(c => c.id === selectedClient);
      const case_ = cases.find(c => c.id === selectedCase);
      
      const generatedContent = `# PETIÇÃO INICIAL - ${client?.name.toUpperCase()}

**Referência do Caso:** ${case_?.reference}
**Data:** ${new Date().toLocaleDateString('pt-BR')}

## I. QUALIFICAÇÃO DAS PARTES

**REQUERENTE:** ${client?.name}
**REQUERIDO:** (A ser preenchido)

## II. DOS FATOS

${generatedFacts.map((fact, index) => 
  `${index + 1}. ${fact.text} (Ref: ${fact.documentRefs?.map(ref => {
    const file = files.find(f => f.id === ref);
    return file?.docNumber || 'DOC';
  }).join(', ')})`
).join('\n\n')}

## III. DOCUMENTOS ANEXOS

${selectedFiles.map((fileId, index) => {
  const file = files.find(f => f.id === fileId);
  return `${file?.docNumber || `DOC n. ${String(index + 1).padStart(3, '0')}`} - ${file?.name}`;
}).join('\n')}

## IV. DO DIREITO

(Fundamentação jurídica a ser desenvolvida)

## V. DOS PEDIDOS

Diante do exposto, requer-se:

a) (Pedido principal)
b) (Pedidos subsidiários)

Termos em que pede deferimento.

Local, ${new Date().toLocaleDateString('pt-BR')}.

_____________________
Advogado(a)
OAB/XX nº XXXXX`;

      setPetitionContent(generatedContent);
      
      toast({
        title: "Petição gerada com sucesso!",
        description: `${generatedFacts.length} fatos extraídos automaticamente.`,
      });
    } catch (error) {
      toast({
        title: "Erro na geração",
        description: "Não foi possível gerar a petição.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    toast({
      title: "Minuta salva",
      description: "A petição foi salva nos rascunhos.",
    });
  };

  const handleExport = (format: 'docx' | 'pdf') => {
    toast({
      title: `Exportando para ${format.toUpperCase()}`,
      description: "O download será iniciado em instantes.",
    });
  };

  const insertFact = (fact: Fact) => {
    const insertion = `\n\n${fact.text} (Ref: DOC n. xxx)\n`;
    setPetitionContent(prev => prev + insertion);
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
                  <h1 className="text-3xl font-bold text-foreground">Gerador de Petições</h1>
                  <p className="text-muted-foreground">
                    Crie petições automaticamente baseadas nos seus documentos
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
                        {/* Seletor de Cliente */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Cliente</label>
                          <Select value={selectedClient} onValueChange={setSelectedClient}>
                            <SelectTrigger className="rounded-2xl">
                              <SelectValue placeholder="Selecionar cliente..." />
                            </SelectTrigger>
                            <SelectContent>
                              {clients.map(client => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Seletor de Caso */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Caso</label>
                          <Select 
                            value={selectedCase} 
                            onValueChange={setSelectedCase}
                            disabled={!selectedClient}
                          >
                            <SelectTrigger className="rounded-2xl">
                              <SelectValue placeholder="Selecionar caso..." />
                            </SelectTrigger>
                            <SelectContent>
                              {cases.map(case_ => (
                                <SelectItem key={case_.id} value={case_.id}>
                                  {case_.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Busca de Arquivos */}
                        {selectedCase && (
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
                        {selectedCase && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium">Arquivos ({selectedFiles.length} selecionados)</label>
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
                                          {file.docNumber || file.name}
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
                            Editor de Petição
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
                          placeholder="O conteúdo da petição aparecerá aqui após a geração..."
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
                          disabled={isGenerating || !selectedCase || selectedFiles.length === 0}
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
                              Gerar Petição
                            </>
                          )}
                        </Button>

                        <Separator />

                        {/* Fatos Extraídos */}
                        <div className="space-y-3">
                          <h4 className="font-medium flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-success" />
                            Fatos Extraídos ({facts.length})
                          </h4>
                          
                          {facts.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              Selecione documentos e gere a petição para ver os fatos extraídos.
                            </p>
                          ) : (
                            <ScrollArea className="h-64">
                              <div className="space-y-3">
                                {facts.map(fact => (
                                  <motion.div
                                    key={fact.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-3 bg-muted/30 rounded-2xl group cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => insertFact(fact)}
                                  >
                                    <div className="flex items-start justify-between mb-2">
                                      <Badge 
                                        variant="secondary" 
                                        className="text-xs capitalize"
                                      >
                                        {fact.type}
                                      </Badge>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          insertFact(fact);
                                        }}
                                      >
                                        <Plus className="w-3 h-3" />
                                      </Button>
                                    </div>
                                    <p className="text-xs text-foreground">
                                      {fact.text}
                                    </p>
                                    {fact.confidence && (
                                      <div className="mt-2 text-xs text-muted-foreground">
                                        Confiança: {Math.round(fact.confidence * 100)}%
                                      </div>
                                    )}
                                  </motion.div>
                                ))}
                              </div>
                            </ScrollArea>
                          )}
                        </div>

                        <Separator />

                        {/* Histórico */}
                        <div className="space-y-2">
                          <h4 className="font-medium flex items-center gap-2">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            Histórico
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            Nenhuma versão salva ainda.
                          </p>
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