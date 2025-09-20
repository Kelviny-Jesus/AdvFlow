/**
 * Página para visualizar e gerenciar pastas - Interface Hierárquica estilo Google Drive
 */

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ThemeProvider } from "next-themes";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { 
  Folder, 
  FolderPlus, 
  User, 
  FileText,
  Loader2,
  AlertCircle,
  Calendar,
  Hash,
  ArrowLeft,
  ChevronRight,
  Home,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Wand2,
  Download,
  Pencil,
  Trash
} from "lucide-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from "@/components/ui/context-menu";
import { Button as UIButton } from "@/components/ui/button";
import { FolderService } from "@/services/folderService";
import { CaseService } from "@/services/caseService";
import { DocumentService } from "@/services/documentService";
import { FolderDownloadService } from "@/services/folderDownloadService";
import { useNavigate } from "react-router-dom";
import { GenerateModal } from "@/components/GenerateModal";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useFoldersReal, useCreateFolderReal, useCreateClientWithFolderReal } from "@/hooks/useFoldersReal";
import { useClients } from "@/hooks/useClients";
import { useDocumentsByFolder } from "@/hooks/useDocumentsByFolder";
import { formatFileSize } from "@/utils/fileUtils";
import { DocumentViewer } from "@/components/DocumentViewer";
import type { FolderItem, FileItem, Case } from "@/types";

const Folders = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [navigationHistory, setNavigationHistory] = useState<Array<{id: string | null, name: string}>>([
    { id: null, name: "Início" }
  ]);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [openGenerate, setOpenGenerate] = useState(false);

  // Hooks
  const { data: foldersData = [], isLoading, error, refetch } = useFoldersReal();
  const { data: clientsData = [] } = useClients();
  const folders: FolderItem[] = (foldersData as unknown as FolderItem[]) || [];
  const createClientMutation = useCreateClientWithFolderReal();
  const { data: documentsData = [], isLoading: documentsLoading } = useDocumentsByFolder(currentFolderId);
  const [allDocsLoading, setAllDocsLoading] = useState(false);
  const [generatedDocs, setGeneratedDocs] = useState<FileItem[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [cases, setCases] = useState<Case[]>([]);
  const documents: FileItem[] = (documentsData as unknown as FileItem[]) || [];

  // Mapa de nomes de clientes por ID (a partir da tabela clients)
  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clientsData as any[]) {
      if (c?.id && c?.name) map.set(c.id, c.name);
    }
    return map;
  }, [clientsData]);

  // Permitir deep link para pasta específica (?folder=ID)
  useEffect(() => {
    const initialFolder = searchParams.get('folder');
    if (initialFolder) {
      setCurrentFolderId(initialFolder);
    }
  }, [searchParams]);

  // Carregar backlog global (documentos gerados) quando na raiz
  useEffect(() => {
    async function loadGenerated() {
      if (currentFolderId !== null) {
        setGeneratedDocs([]);
        return;
      }
      try {
        setAllDocsLoading(true);
        const all = await DocumentService.getDocuments();
        const gen = (all as FileItem[]).filter((d) => d.appProperties && (d.appProperties as any).category === 'generated');
        // ordenar por data desc
        gen.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setGeneratedDocs(gen);
      } catch (e) {
        console.error(e);
      } finally {
        setAllDocsLoading(false);
      }
    }
    loadGenerated();
  }, [currentFolderId]);

  // Carregar backlog de processos (cases) na raiz
  useEffect(() => {
    async function loadCases() {
      if (currentFolderId !== null) {
        setCases([]);
        return;
      }
      try {
        setCasesLoading(true);
        const list = await CaseService.getCases();
        setCases(list as Case[]);
      } catch (e) {
        console.error(e);
      } finally {
        setCasesLoading(false);
      }
    }
    loadCases();
  }, [currentFolderId]);

  // Filtrar pastas baseado na pasta atual
  const currentFolders = useMemo(() => {
    if (currentFolderId === null) {
      // Na raiz, mostrar apenas pastas principais (clientes)
      return folders.filter(folder => folder.parentId === undefined || folder.parentId === null);
    } else {
      // Dentro de uma pasta, mostrar suas subpastas
      return folders.filter(folder => folder.parentId === currentFolderId);
    }
  }, [folders, currentFolderId]);

  // Pasta atual
  const currentFolder = currentFolderId ? folders.find(f => f.id === currentFolderId) : null;

  // Ações de pasta/documento
  const renameFolder = async (folder: FolderItem) => {
    const newName = prompt('Novo nome da pasta', folder.name);
    if (!newName || newName.trim() === '' || newName === folder.name) return;
    try {
      await FolderService.updateFolder(folder.id, { name: newName.trim(), path: folder.path.replace(folder.name, newName.trim()) });
      refetch();
    } catch (e) { console.error(e); }
  };

  const deleteFolder = async (folder: FolderItem) => {
    if (!confirm(`Excluir pasta "${folder.name}"?`)) return;
    try {
      await FolderService.deleteFolder(folder.id);
      setCurrentFolderId(null);
      setNavigationHistory([{ id: null, name: 'Início' }]);
      refetch();
    } catch (e) { console.error(e); }
  };

  const renameDocument = async (doc: FileItem) => {
    const newName = prompt('Novo nome do documento', doc.name);
    if (!newName || newName.trim() === '' || newName === doc.name) return;
    try { await DocumentService.updateDocument(doc.id, { name: newName.trim() }); refetch(); } catch (e) { console.error(e); }
  };

  const deleteDocument = async (doc: FileItem) => {
    if (!confirm(`Excluir documento "${doc.name}"?`)) return;
    try { await DocumentService.deleteDocument(doc.id); refetch(); } catch (e) { console.error(e); }
  };

  // Funções de navegação
  const navigateToFolder = (folder: FolderItem) => {
    setCurrentFolderId(folder.id);
    setNavigationHistory(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const navigateBack = () => {
    if (navigationHistory.length > 1) {
      const newHistory = navigationHistory.slice(0, -1);
      const previousFolder = newHistory[newHistory.length - 1];
      setNavigationHistory(newHistory);
      setCurrentFolderId(previousFolder.id);
    }
  };

  const navigateToLevel = (index: number) => {
    const newHistory = navigationHistory.slice(0, index + 1);
    const targetFolder = newHistory[newHistory.length - 1];
    setNavigationHistory(newHistory);
    setCurrentFolderId(targetFolder.id);
  };

  const handleCreateClient = async () => {
    if (!newClientName.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Digite o nome do cliente.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createClientMutation.mutateAsync(newClientName.trim());
      setNewClientName("");
      setShowCreateForm(false);
      refetch();
    } catch (error) {
      console.error('Error creating client:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Componente para indicador de status de extração e renomeação
  const ExtractionStatus = ({ document }: { document: any }) => {
    const extractionStatus = document.extractionStatus || 'pending';
    const hasExtractedData = !!document.extractedData;
    const isAIRenamed = document.name && document.name.startsWith('DOC n.');
    const isGenerated = document.appProperties && (document.appProperties as any).category === 'generated';
    
    // Se tem dados extraídos e foi renomeado pela IA
    if (hasExtractedData && isAIRenamed) {
      return (
        <div className="flex items-center gap-1 text-purple-600">
          <Sparkles className="w-3 h-3" />
          <span className="text-xs">Renomeado por IA</span>
        </div>
      );
    }
    
    // Documento gerado pelo sistema: não mostrar fila de extração
    if (isGenerated) {
      return (
        <div className="flex items-center gap-1 text-teal-600">
          <CheckCircle className="w-3 h-3" />
          <span className="text-xs">Documento gerado pelo AdvFlow</span>
        </div>
      );
    }

    // Status de extração
    switch (extractionStatus) {
      case 'completed':
        return (
          <div className="flex items-center gap-1 text-green-600">
            <CheckCircle className="w-3 h-3" />
            <span className="text-xs">Dados extraídos</span>
          </div>
        );
      case 'processing':
        return (
          <div className="flex items-center gap-1 text-blue-600">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="text-xs">Processando...</span>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-1 text-red-600">
            <XCircle className="w-3 h-3" />
            <span className="text-xs">Falha na extração</span>
          </div>
        );
      case 'not_supported':
        return (
          <div className="flex items-center gap-1 text-gray-500">
            <AlertCircle className="w-3 h-3" />
            <span className="text-xs">Tipo não suportado</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1 text-yellow-600">
            <Clock className="w-3 h-3" />
            <span className="text-xs">Aguardando extração</span>
          </div>
        );
    }
  };

  const getKindIcon = (kind: FolderItem['kind']) => {
    switch (kind) {
      case 'client':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'case':
        return <FileText className="w-4 h-4 text-green-500" />;
      case 'subfolder':
        return <Folder className="w-4 h-4 text-amber-500" />;
      default:
        return <Folder className="w-4 h-4 text-gray-500" />;
    }
  };

  const getKindLabel = (kind: FolderItem['kind']) => {
    switch (kind) {
      case 'client':
        return 'Cliente';
      case 'case':
        return 'Caso';
      case 'subfolder':
        return 'Subpasta';
      default:
        return 'Pasta';
    }
  };

  if (error) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SidebarProvider>
          <div className="min-h-screen flex w-full bg-background">
            <AppSidebar />
            <div className="flex-1 flex flex-col">
              <Header />
              <main className="flex-1 p-6">
                <div className="flex items-center justify-center h-full">
                  <Card className="w-full max-w-md">
                    <CardContent className="p-6 text-center">
                      <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Erro ao carregar pastas</h3>
                      <p className="text-muted-foreground mb-4">
                        {error instanceof Error ? error.message : 'Erro desconhecido'}
                      </p>
                      <Button onClick={() => refetch()}>
                        Tentar novamente
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background">
          <Header showGenerateButton={false} />
          <main className="flex-1 p-6">
              <div className="max-w-7xl mx-auto space-y-6">
                <div>
                  <Button
                    onClick={() => setOpenGenerate(true)}
                    className="w-full h-12 text-lg bg-teal-600 hover:bg-teal-700 rounded-2xl"
                  >
                    GERAR
                    <Wand2 className="w-4 h-4 ml-2" />
                  </Button>
                </div>
                {/* Header com Breadcrumb */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {navigationHistory.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={navigateBack}
                          className="flex items-center gap-2"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Voltar
                        </Button>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h1 className="text-3xl font-bold tracking-tight">
                            {currentFolder ? currentFolder.name : "Pastas"}
                          </h1>
                          {currentFolder && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => renameFolder(currentFolder)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <p className="text-muted-foreground">
                          {currentFolder 
                            ? `${currentFolders.length} pasta(s) • ${documents.length} documento(s)`
                            : "Gerencie suas pastas de clientes e casos"
                          }
                        </p>
                      </div>
                    </div>
                    {currentFolderId === null && (
                      <Button 
                        onClick={() => setShowCreateForm(!showCreateForm)}
                        className="flex items-center gap-2"
                      >
                        <FolderPlus className="w-4 h-4" />
                        Novo Cliente
                      </Button>
                    )}
                    {currentFolder && (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => FolderDownloadService.downloadFolderAsZip(currentFolder)} className="flex items-center gap-2">
                          <Download className="w-4 h-4" /> Baixar Pasta
                        </Button>
                        <Button variant="destructive" onClick={() => deleteFolder(currentFolder)} className="flex items-center gap-2">
                          <Trash className="w-4 h-4" /> Excluir Pasta
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Breadcrumb Navigation */}
                  <Breadcrumb>
                    <BreadcrumbList>
                      {navigationHistory.map((item, index) => (
                        <div key={index} className="flex items-center">
                          {index > 0 && <BreadcrumbSeparator />}
                          <BreadcrumbItem>
                            {index === navigationHistory.length - 1 ? (
                              <BreadcrumbPage className="flex items-center gap-2">
                                {index === 0 ? <Home className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                                {item.name}
                              </BreadcrumbPage>
                            ) : (
                              <BreadcrumbLink 
                                onClick={() => navigateToLevel(index)}
                                className="flex items-center gap-2 cursor-pointer hover:text-foreground"
                              >
                                {index === 0 ? <Home className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
                                {item.name}
                              </BreadcrumbLink>
                            )}
                          </BreadcrumbItem>
                        </div>
                      ))}
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>

                {/* Create Form */}
                {showCreateForm && (
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>Criar Novo Cliente</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-4 items-end">
                          <div className="flex-1">
                            <Label htmlFor="clientName">Nome do Cliente</Label>
                            <Input
                              id="clientName"
                              value={newClientName}
                              onChange={(e) => setNewClientName(e.target.value)}
                              placeholder="Digite o nome do cliente..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleCreateClient();
                                }
                              }}
                            />
                          </div>
                          <Button 
                            onClick={handleCreateClient}
                            disabled={createClientMutation.isPending || !newClientName.trim()}
                          >
                            {createClientMutation.isPending && (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            )}
                            Criar
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              setShowCreateForm(false);
                              setNewClientName("");
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Loading */}
                {isLoading && (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                      <p className="text-muted-foreground">Carregando pastas...</p>
                    </div>
                  </div>
                )}

                {/* Folders Grid / Divisões */}
                {!isLoading && currentFolders.length === 0 && documents.length === 0 && (
                  <div className="text-center py-12">
                    <Folder className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {currentFolderId === null ? "Nenhuma pasta encontrada" : "Esta pasta está vazia"}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {currentFolderId === null 
                        ? "Crie sua primeira pasta de cliente para começar."
                        : "Esta pasta não contém subpastas ou documentos."
                      }
                    </p>
                    {currentFolderId === null && (
                      <Button onClick={() => setShowCreateForm(true)}>
                        <FolderPlus className="w-4 h-4 mr-2" />
                        Criar Pasta
                      </Button>
                    )}
                  </div>
                )}

                {/* Conteúdo da pasta atual - divisões */}
                {!isLoading && (currentFolders.length > 0 || documents.length > 0) && (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentFolderId || 'root'}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {/* Se na raiz: Divisão Clientes (pastas principais) */}
                      {currentFolderId === null && currentFolders.length > 0 && (
                        <div>
                          <h2 className="text-xl font-semibold mb-4">Clientes</h2>
                          <ScrollArea className="w-full">
                            <div className="flex gap-6 pb-2 w-max">
                              {currentFolders.map((folder) => (
                                <motion.div
                                  key={folder.id}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  whileHover={{ scale: 1.02 }}
                                  transition={{ duration: 0.2 }}
                                  className="min-w-[320px] max-w-[340px]"
                                >
                                  <ContextMenu>
                                    <ContextMenuTrigger>
                                      <Card className="h-full cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50" onClick={() => navigateToFolder(folder)}>
                                        <CardContent className="p-6">
                                          <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                              {getKindIcon(folder.kind)}
                                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                                <h3 className="font-semibold text-lg truncate">{folder.name}</h3>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); renameFolder(folder); }}>
                                                  <Pencil className="w-4 h-4" />
                                                </Button>
                                              </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                          </div>

                                          <div className="space-y-2 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                              <Calendar className="w-3 h-3" />
                                              <span>{formatDate(folder.createdAt)}</span>
                                            </div>

                                            {folder.path && (
                                              <div className="text-xs bg-muted p-2 rounded font-mono truncate">
                                                {folder.path}
                                              </div>
                                            )}
                                          </div>

                                          <div className="flex justify-between items-center mt-4 pt-4 border-t">
                                            <div className="text-xs text-muted-foreground">
                                              {folder.documentsCount || 0} documentos
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              {folder.subfolderCount || 0} subpastas
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                      <ContextMenuItem onClick={() => renameFolder(folder)}>Renomear</ContextMenuItem>
                                      <ContextMenuItem onClick={() => deleteFolder(folder)} className="text-destructive">Excluir</ContextMenuItem>
                                    </ContextMenuContent>
                                  </ContextMenu>
                                </motion.div>
                              ))}
                            </div>
                            <ScrollBar orientation="horizontal" />
                          </ScrollArea>
                        </div>
                      )}

                      {/* Se dentro de uma pasta: manter seção de Subpastas */}
                      {currentFolderId !== null && currentFolders.length > 0 && (
                        <div>
                          <h2 className="text-xl font-semibold mb-4">Subpastas</h2>
                          <ScrollArea className="w-full">
                            <div className="flex gap-6 pb-2 w-max">
                              {currentFolders.map((folder) => (
                                <motion.div key={folder.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="min-w-[320px] max-w-[340px]">
                                  <ContextMenu>
                                    <ContextMenuTrigger>
                                      <Card className="h-full cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50" onClick={() => navigateToFolder(folder)}>
                                        <CardContent className="p-6">
                                          <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                              {getKindIcon(folder.kind)}
                                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                                <h3 className="font-semibold text-lg truncate">{folder.name}</h3>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); renameFolder(folder); }}>
                                                  <Pencil className="w-4 h-4" />
                                                </Button>
                                              </div>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                          </div>
                                          <div className="space-y-2 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2"><Calendar className="w-3 h-3" /><span>{formatDate(folder.createdAt)}</span></div>
                                            {folder.path && (<div className="text-xs bg-muted p-2 rounded font-mono truncate">{folder.path}</div>)}
                                          </div>
                                          <div className="flex justify-between items-center mt-4 pt-4 border-t">
                                            <div className="text-xs text-muted-foreground">{folder.documentsCount || 0} documentos</div>
                                            <div className="text-xs text-muted-foreground">{folder.subfolderCount || 0} subpastas</div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                      <ContextMenuItem onClick={() => renameFolder(folder)}>Renomear</ContextMenuItem>
                                      <ContextMenuItem onClick={() => deleteFolder(folder)} className="text-destructive">Excluir</ContextMenuItem>
                                    </ContextMenuContent>
                                  </ContextMenu>
                                </motion.div>
                              ))}
                            </div>
                            <ScrollBar orientation="horizontal" />
                          </ScrollArea>
                        </div>
                      )}

                      {/* Backlog de Processos - placeholder (integração futura) */}
                      {currentFolderId === null && (
                        <div>
                          <h2 className="text-xl font-semibold mb-4">Backlog de Processos</h2>
                          <Card>
                            <CardContent className="p-6 text-sm text-muted-foreground">
                              Integração em desenvolvimento. Em breve você verá aqui os processos em andamento, com status e atalhos rápidos.
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      {/* Documentos na pasta atual */}
                      {documents.length > 0 && (
                        <div>
                          <h2 className="text-xl font-semibold mb-4">Documentos</h2>
                          <ScrollArea className="w-full">
                            <div className="flex gap-4 pb-2 w-max">
                              {documents.map((document, idx) => (
                                <motion.div
                                  key={document.id}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  whileHover={{ scale: 1.02 }}
                                  transition={{ duration: 0.2 }}
                                  className="min-w-[300px] max-w-[320px]"
                                >
                                  <ContextMenu>
                                    <ContextMenuTrigger>
                                      <DocumentViewer document={document} siblingDocuments={documents} initialIndex={idx}>
                                        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                                          <CardContent className="p-4">
                                            <div className="flex items-start gap-3 mb-3">
                                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                                <FileText className="w-4 h-4 text-blue-600" />
                                              </div>
                                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                                <h3 className="font-medium text-sm truncate">{document.name}</h3>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); renameDocument(document); }}>
                                                  <Pencil className="w-3 h-3" />
                                                </Button>
                                              </div>
                                            </div>
                                            
                                            {document.appProperties && (document.appProperties as any).category === 'generated' && (
                                              <div className="mb-2">
                                                <Badge variant="outline" className="text-[10px]">Documento Gerado pelo AdvFlow</Badge>
                                              </div>
                                            )}

                                            <div className="space-y-1 text-xs text-muted-foreground">
                                              <div className="flex justify-between">
                                                <span>Tamanho:</span>
                                                <span>{formatFileSize(document.size)}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Tipo:</span>
                                                <span className="uppercase">{document.type}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Criado:</span>
                                                <span>{formatDate(document.createdAt)}</span>
                                              </div>
                                            </div>

                                            <div className="mt-2 pt-2 border-t">
                                              <ExtractionStatus document={document} />
                                            </div>

                                            <div className="mt-2 pt-2 border-t flex items-center justify-center">
                                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <FileText className="w-3 h-3" />
                                                Clique para visualizar
                                              </span>
                                            </div>
                                          </CardContent>
                                        </Card>
                                      </DocumentViewer>
                                    </ContextMenuTrigger>
                                    <ContextMenuContent>
                                      <ContextMenuItem onClick={() => renameDocument(document)}>Renomear</ContextMenuItem>
                                      <ContextMenuItem onClick={() => deleteDocument(document)} className="text-destructive">Excluir</ContextMenuItem>
                                    </ContextMenuContent>
                                  </ContextMenu>
                                </motion.div>
                              ))}
                            </div>
                            <ScrollBar orientation="horizontal" />
                          </ScrollArea>
                        </div>
                      )}

                      {/* Backlog de Documentos (gerados pelo sistema) - catálogo horizontal */}
                      {currentFolderId === null && (
                        <div>
                          <h2 className="text-xl font-semibold mb-4">Backlog de Documentos</h2>
                          {allDocsLoading && (
                            <div className="flex items-center justify-center h-24 text-muted-foreground">Carregando...</div>
                          )}
                          {!allDocsLoading && generatedDocs.length === 0 && (
                            <div className="text-sm text-muted-foreground">Nenhum documento gerado encontrado.</div>
                          )}
                          {!allDocsLoading && generatedDocs.length > 0 && (
                            <ScrollArea className="w-full">
                              <div className="flex gap-4 pb-2 w-max">
                                {generatedDocs.map((document) => (
                                  <motion.div key={document.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }} className="min-w-[320px] max-w-[340px]">
                                    <ContextMenu>
                                      <ContextMenuTrigger>
                                        <DocumentViewer document={document}>
                                          <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                                            <CardContent className="p-4">
                                              <div className="flex items-start gap-3 mb-3">
                                                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                                                  <Sparkles className="w-4 h-4 text-teal-700" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                  <h3 className="font-medium text-sm truncate">{document.name}</h3>
                                                  <Badge variant="outline" className="text-[10px] mt-1">Documento Gerado pelo AdvFlow</Badge>
                                                </div>
                                              </div>
                                              <div className="space-y-1 text-xs text-muted-foreground">
                                                <div className="flex justify-between"><span>Cliente</span><span>{clientNameById.get(document.clientId) || document.clientId}</span></div>
                                                <div className="flex justify-between"><span>Criado</span><span>{formatDate(document.createdAt)}</span></div>
                                              </div>
                                            </CardContent>
                                          </Card>
                                        </DocumentViewer>
                                      </ContextMenuTrigger>
                                      <ContextMenuContent>
                                        <ContextMenuItem onClick={() => renameDocument(document)}>Renomear</ContextMenuItem>
                                        <ContextMenuItem onClick={() => deleteDocument(document)} className="text-destructive">Excluir</ContextMenuItem>
                                      </ContextMenuContent>
                                    </ContextMenu>
                                  </motion.div>
                                ))}
                              </div>
                              <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                          )}
                        </div>
                      )}

                      {/* Backlog de Publicação (placeholder) */}
                      {currentFolderId === null && (
                        <div>
                          <h2 className="text-xl font-semibold mb-4">Backlog de Publicação</h2>
                          <div className="text-sm text-muted-foreground">Nenhuma publicação pendente.</div>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </div>
          </main>
          <GenerateModal open={openGenerate} onOpenChange={setOpenGenerate} />
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default Folders;
