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
  // Virtual root categories (folders)
  const VIRTUAL = {
    CLIENTS: 'vf_clients',
    PROCESSES: 'vf_processes',
    DOCUMENTS: 'vf_documents',
    PUBLICATION: 'vf_publication',
  } as const;

  const isVirtual = (id: string | null | undefined): boolean => !!id && [VIRTUAL.CLIENTS, VIRTUAL.PROCESSES, VIRTUAL.DOCUMENTS, VIRTUAL.PUBLICATION].includes(id as any);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [openGenerate, setOpenGenerate] = useState(false);

  // Hooks
  const { data: foldersData = [], isLoading, error, refetch } = useFoldersReal();
  const { data: clientsData = [] } = useClients();
  const folders: FolderItem[] = (foldersData as unknown as FolderItem[]) || [];
  const createClientMutation = useCreateClientWithFolderReal();
  // Avoid querying documents for virtual category IDs
  const effectiveFolderId = isVirtual(currentFolderId) ? undefined : currentFolderId ?? undefined;
  const { data: documentsData = [], isLoading: documentsLoading } = useDocumentsByFolder(effectiveFolderId);
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

  // Se chegar por deep link, montar breadcrumb com "Início > Nome da pasta"
  useEffect(() => {
    const initialFolder = searchParams.get('folder');
    if (!initialFolder) return;
    // Se o histórico ainda não possui a pasta atual, adiciona
    const lastId = navigationHistory[navigationHistory.length - 1]?.id || null;
    if (lastId === initialFolder) return;
    const folderName = folders.find(f => f.id === initialFolder)?.name || 'Pasta';
    setNavigationHistory([{ id: null, name: 'Início' }, { id: initialFolder, name: folderName }]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, folders]);

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
      // Na raiz, não listamos pastas reais diretamente; exibimos categorias virtuais
      return [] as FolderItem[];
    }
    if (isVirtual(currentFolderId)) {
      // Em "Clientes" virtual, listar as pastas raiz (clientes)
      if (currentFolderId === VIRTUAL.CLIENTS) {
        return folders
          .filter(folder => folder.parentId === undefined || folder.parentId === null)
          .sort((a, b) => a.name.localeCompare(b.name));
      }
      // Outras categorias virtuais não possuem subpastas reais
      return [] as FolderItem[];
    }
    // Dentro de uma pasta real, mostrar subpastas
    return folders
      .filter(folder => folder.parentId === currentFolderId)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [folders, currentFolderId]);

  // Pasta atual
  const currentFolder = currentFolderId && !isVirtual(currentFolderId) ? folders.find(f => f.id === currentFolderId) : null;

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

  // Contador de clientes na raiz (pastas principais)
  const rootClientCount = useMemo(() => {
    return folders.filter(folder => folder.parentId === undefined || folder.parentId === null).length;
  }, [folders]);

  // Ordenações de documentos
  const sortedDocuments = useMemo(() => {
    return (documents as FileItem[]).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [documents]);
  const sortedGeneratedDocs = useMemo(() => {
    return generatedDocs.slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [generatedDocs]);

  // Helpers de agrupamento A–Z
  type Group<T> = { letter: string; items: T[] };
  const normalizeName = (name: string) => (name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const getInitial = (name: string) => {
    const n = normalizeName(name).trim();
    const ch = n.charAt(0).toUpperCase();
    return ch.match(/[A-Z]/) ? ch : '#';
  };
  function groupByInitial<T>(items: T[], getName: (t: T) => string): Group<T>[] {
    const map = new Map<string, T[]>();
    for (const it of items) {
      const letter = getInitial(getName(it));
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(it);
    }
    const letters = Array.from(map.keys()).sort();
    return letters.map(letter => ({
      letter,
      items: map.get(letter)!.sort((a, b) => getName(a).localeCompare(getName(b)))
    }));
  }

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
                            {currentFolder
                              ? currentFolder.name
                              : currentFolderId === VIRTUAL.CLIENTS
                                ? 'Clientes'
                                : currentFolderId === VIRTUAL.PROCESSES
                                  ? 'Backlog de Processos'
                                  : currentFolderId === VIRTUAL.DOCUMENTS
                                    ? 'Backlog de Documentos'
                                    : currentFolderId === VIRTUAL.PUBLICATION
                                      ? 'Backlog de Publicação'
                                      : 'Pastas'}
                          </h1>
                          {currentFolder && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => renameFolder(currentFolder)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                        <p className="text-muted-foreground">
                          {currentFolder && !isVirtual(currentFolderId)
                            ? `${currentFolders.length} pasta(s) • ${documents.length} documento(s)`
                            : currentFolderId === VIRTUAL.CLIENTS
                              ? `${currentFolders.length} cliente(s)`
                              : currentFolderId === VIRTUAL.DOCUMENTS
                                ? `${generatedDocs.length} documento(s) gerado(s)`
                                : currentFolderId === VIRTUAL.PROCESSES
                                  ? 'Integração em desenvolvimento'
                                  : currentFolderId === VIRTUAL.PUBLICATION
                                    ? 'Nenhuma publicação pendente'
                                    : 'Escolha uma categoria'}
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

                {/* Categorias na raiz */}
                {!isLoading && currentFolderId === null && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-semibold mb-4">Categorias</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[{
                            id: VIRTUAL.CLIENTS,
                            name: 'Clientes',
                            icon: <User className="w-6 h-6 text-blue-600" />,
                            subtitle: `${rootClientCount} cliente(s)`
                          }, {
                            id: VIRTUAL.PROCESSES,
                            name: 'Backlog de Processos',
                            icon: <Clock className="w-6 h-6 text-amber-600" />,
                            subtitle: 'Integração em desenvolvimento'
                          }, {
                            id: VIRTUAL.DOCUMENTS,
                            name: 'Backlog de Documentos',
                            icon: <Sparkles className="w-6 h-6 text-teal-700" />,
                            subtitle: `${generatedDocs.length} documento(s) gerado(s)`
                          }, {
                            id: VIRTUAL.PUBLICATION,
                            name: 'Backlog de Publicação',
                            icon: <Download className="w-6 h-6 text-violet-600" />,
                            subtitle: 'Publicações pendentes'
                          }].map(cat => (
                            <motion.div
                              key={cat.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              whileHover={{ scale: 1.02 }}
                              transition={{ duration: 0.2 }}
                              className="min-w-[260px]"
                            >
                              <Card className="h-44 cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50" onClick={() => {
                                setCurrentFolderId(cat.id);
                                setNavigationHistory(prev => [...prev, { id: cat.id, name: cat.name }]);
                              }}>
                                <CardContent className="p-6 h-full flex flex-col justify-between">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                                        {cat.icon}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-lg truncate">{cat.name}</h3>
                                      </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-sm text-muted-foreground">{cat.subtitle}</div>
                                    <div className="text-xs text-muted-foreground">Clique para abrir</div>
                                  </div>
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Conteúdo da pasta atual - divisões */}
                {!isLoading && (currentFolderId !== null) && (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentFolderId || 'root'}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      {/* Virtual: Clientes */}
                      {currentFolderId === VIRTUAL.CLIENTS && currentFolders.length > 0 && (
                        <div>
                          <h2 className="text-xl font-semibold mb-4">Clientes</h2>
                          {(() => {
                            const groups = groupByInitial(currentFolders, f => f.name);
                            return (
                              <div className="space-y-6">
                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                  {groups.map(g => (
                                    <a key={g.letter} href={`#grp-clients-${g.letter}`} className="hover:text-foreground">{g.letter}</a>
                                  ))}
                                </div>
                                {groups.map(g => (
                                  <div key={g.letter} id={`grp-clients-${g.letter}`} className="space-y-4">
                                    <h3 className="text-sm font-semibold text-muted-foreground">{g.letter}</h3>
                                    {g.items.map((folder) => (
                                      <ContextMenu key={folder.id}>
                                        <ContextMenuTrigger>
                                          <Card className="hover:shadow-sm transition-all" onClick={() => navigateToFolder(folder)}>
                                            <CardContent className="p-6">
                                              <div className="flex items-start justify-between">
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
                                              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-2"><Calendar className="w-3 h-3" /><span>{formatDate(folder.createdAt)}</span></div>
                                                <div className="text-right">{folder.documentsCount || 0} documentos • {folder.subfolderCount || 0} subpastas</div>
                                              </div>
                                            </CardContent>
                                          </Card>
                                        </ContextMenuTrigger>
                                        <ContextMenuContent>
                                          <ContextMenuItem onClick={() => renameFolder(folder)}>Renomear</ContextMenuItem>
                                          <ContextMenuItem onClick={() => deleteFolder(folder)} className="text-destructive">Excluir</ContextMenuItem>
                                        </ContextMenuContent>
                                      </ContextMenu>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Dentro de uma pasta real: Subpastas */}
                      {!isVirtual(currentFolderId) && currentFolders.length > 0 && (
                        <div>
                          <h2 className="text-xl font-semibold mb-4">Subpastas</h2>
                          {(() => {
                            const groups = groupByInitial(currentFolders, f => f.name);
                            return (
                              <div className="space-y-6">
                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                  {groups.map(g => (
                                    <a key={g.letter} href={`#grp-subfolders-${g.letter}`} className="hover:text-foreground">{g.letter}</a>
                                  ))}
                                </div>
                                {groups.map(g => (
                                  <div key={g.letter} id={`grp-subfolders-${g.letter}`} className="space-y-4">
                                    <h3 className="text-sm font-semibold text-muted-foreground">{g.letter}</h3>
                                    {g.items.map((folder) => (
                                      <ContextMenu key={folder.id}>
                                        <ContextMenuTrigger>
                                          <Card className="hover:shadow-sm transition-all" onClick={() => navigateToFolder(folder)}>
                                            <CardContent className="p-6">
                                              <div className="flex items-start justify-between">
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
                                              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-2"><Calendar className="w-3 h-3" /><span>{formatDate(folder.createdAt)}</span></div>
                                                <div className="text-right">{folder.documentsCount || 0} documentos • {folder.subfolderCount || 0} subpastas</div>
                                              </div>
                                            </CardContent>
                                          </Card>
                                        </ContextMenuTrigger>
                                        <ContextMenuContent>
                                          <ContextMenuItem onClick={() => renameFolder(folder)}>Renomear</ContextMenuItem>
                                          <ContextMenuItem onClick={() => deleteFolder(folder)} className="text-destructive">Excluir</ContextMenuItem>
                                        </ContextMenuContent>
                                      </ContextMenu>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Virtual: Backlog de Processos */}
                      {currentFolderId === VIRTUAL.PROCESSES && (
                        <div>
                          <h2 className="text-xl font-semibold mb-4">Backlog de Processos</h2>
                          <Card>
                            <CardContent className="p-6 text-sm text-muted-foreground">
                              Integração em desenvolvimento. Em breve você verá aqui os processos em andamento, com status e atalhos rápidos.
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      {/* Documentos na pasta real atual */}
                      {!isVirtual(currentFolderId) && sortedDocuments.length > 0 && (
                        <div>
                          <h2 className="text-xl font-semibold mb-4">Documentos</h2>
                          {(() => {
                            const groups = groupByInitial(sortedDocuments, d => d.name);
                            return (
                              <div className="space-y-6">
                                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                  {groups.map(g => (
                                    <a key={g.letter} href={`#grp-docs-${g.letter}`} className="hover:text-foreground">{g.letter}</a>
                                  ))}
                                </div>
                                {groups.map((g, gi) => (
                                  <div key={g.letter} id={`grp-docs-${g.letter}`} className="space-y-4">
                                    <h3 className="text-sm font-semibold text-muted-foreground">{g.letter}</h3>
                                    {g.items.map((document, idx) => (
                                      <ContextMenu key={document.id}>
                                        <ContextMenuTrigger>
                                          <DocumentViewer document={document} siblingDocuments={sortedDocuments} initialIndex={idx}>
                                            <Card className="hover:shadow-sm transition-shadow cursor-pointer">
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
                                                <div className="space-y-1 text-xs text-muted-foreground">
                                                  <div className="flex justify-between"><span>Tamanho:</span><span>{formatFileSize(document.size)}</span></div>
                                                  <div className="flex justify-between"><span>Tipo:</span><span className="uppercase">{document.type}</span></div>
                                                  <div className="flex justify-between"><span>Criado:</span><span>{formatDate(document.createdAt)}</span></div>
                                                </div>
                                                <div className="mt-2 pt-2 border-t">
                                                  <ExtractionStatus document={document} />
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
                                    ))}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Virtual: Backlog de Documentos (gerados pelo sistema) */}
                      {currentFolderId === VIRTUAL.DOCUMENTS && (
                        <div>
                          <h2 className="text-xl font-semibold mb-4">Backlog de Documentos</h2>
                          {allDocsLoading && (
                            <div className="flex items-center justify-center h-24 text-muted-foreground">Carregando...</div>
                          )}
                          {!allDocsLoading && sortedGeneratedDocs.length === 0 && (
                            <div className="text-sm text-muted-foreground">Nenhum documento gerado encontrado.</div>
                          )}
                          {!allDocsLoading && sortedGeneratedDocs.length > 0 && (
                            (() => {
                              const groups = groupByInitial(sortedGeneratedDocs, d => d.name);
                              return (
                                <div className="space-y-6">
                                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                                    {groups.map(g => (
                                      <a key={g.letter} href={`#grp-gen-${g.letter}`} className="hover:text-foreground">{g.letter}</a>
                                    ))}
                                  </div>
                                  {groups.map(g => (
                                    <div key={g.letter} id={`#grp-gen-${g.letter}`.replace('##', '#')} className="space-y-4">
                                      <h3 className="text-sm font-semibold text-muted-foreground">{g.letter}</h3>
                                      {g.items.map((document) => (
                                        <ContextMenu key={document.id}>
                                          <ContextMenuTrigger>
                                            <DocumentViewer document={document}>
                                              <Card className="hover:shadow-sm transition-shadow cursor-pointer">
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
                                      ))}
                                    </div>
                                  ))}
                                </div>
                              );
                            })()
                          )}
                        </div>
                      )}

                      {/* Virtual: Backlog de Publicação (placeholder) */}
                      {currentFolderId === VIRTUAL.PUBLICATION && (
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
