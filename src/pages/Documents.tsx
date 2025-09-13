import { useState, useEffect } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Grid3X3,
  List,
  Search,
  Filter,
  FolderOpen,
  Folder,
  MoreVertical,
  Eye,
  Download,
  Edit,
  Trash,
  ArrowLeft,
  Plus,
  Home
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { FileItem, FolderItem, ViewMode } from "@/types";
import { mockFiles, mockFolders, getMockData } from "@/data/mocks";
import { formatFileSize, formatDate, getFileIcon, getFileIconClass } from "@/utils/fileUtils";
import { toast } from "@/hooks/use-toast";
import { useDocumentsByFolder } from "@/hooks/useDocumentsByFolder";
const Documents = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [breadcrumbs, setBreadcrumbs] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    loadFolderContents(currentFolderId);
  }, [currentFolderId]);

  const loadFolderContents = async (folderId: string | null) => {
    try {
      if (folderId) {
        // Carregar arquivos da pasta
        const filesResponse = await getMockData.files(folderId);
        setFiles(filesResponse.data);
        
        // Carregar subpastas
        const foldersResponse = await getMockData.folders(folderId);
        setFolders(foldersResponse.data);
        
        // Atualizar breadcrumbs
        const currentFolder = mockFolders.find(f => f.id === folderId);
        if (currentFolder) {
          const pathParts = currentFolder.path.split('/');
          const newBreadcrumbs = pathParts.map((part, index) => {
            const fullPath = pathParts.slice(0, index + 1).join('/');
            const folder = mockFolders.find(f => f.path === fullPath);
            return {
              id: folder?.id || '',
              name: part
            };
          });
          setBreadcrumbs(newBreadcrumbs);
        }
      } else {
        // Carregar pastas raiz (clientes)
        const foldersResponse = await getMockData.folders();
        setFolders(foldersResponse.data);
        setFiles([]);
        setBreadcrumbs([]);
      }
    } catch (error) {
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar o conteúdo da pasta.",
        variant: "destructive",
      });
    }
  };

  const navigateToFolder = (folderId: string) => {
    setCurrentFolderId(folderId);
  };

  const navigateBack = () => {
    if (breadcrumbs.length > 1) {
      const parentBreadcrumb = breadcrumbs[breadcrumbs.length - 2];
      setCurrentFolderId(parentBreadcrumb.id);
    } else {
      setCurrentFolderId(null);
    }
  };

  const navigateToRoot = () => {
    setCurrentFolderId(null);
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === 0 && breadcrumbs.length > 0) {
      setCurrentFolderId(breadcrumbs[0].id);
    } else if (index < breadcrumbs.length - 1) {
      setCurrentFolderId(breadcrumbs[index].id);
    }
  };

  // Filter files and folders based on search
  const filteredItems = [...folders, ...files].filter(item => {
    if (!searchQuery) return true;
    const name = 'kind' in item ? item.name : (item.docNumber ?? item.name);
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredFolders = filteredItems.filter(item => 'kind' in item) as FolderItem[];
  const filteredFiles = filteredItems.filter(item => !('kind' in item)) as FileItem[];

  const handleViewFile = (file: FileItem) => {
    toast({
      title: "Visualizando documento",
      description: `Abrindo ${file.name}...`,
    });
  };

  const handleDownloadFile = (file: FileItem) => {
    toast({
      title: "Download iniciado",
      description: `Baixando ${file.name}...`,
    });
  };

  const handleCreateSubfolder = () => {
    toast({
      title: "Recurso em desenvolvimento",
      description: "A criação de subpastas será implementada em breve.",
    });
  };

  const handleDeleteItem = (item: FileItem | FolderItem) => {
    if ('kind' in item) {
      setFolders(prev => prev.filter(f => f.id !== item.id));
      toast({
        title: "Pasta excluída",
        description: `${item.name} foi removida.`,
        variant: "destructive",
      });
    } else {
      setFiles(prev => prev.filter(f => f.id !== item.id));
      toast({
        title: "Documento excluído",
        description: `${item.name} foi removido.`,
        variant: "destructive",
      });
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-gradient-subtle">
          <Header
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
          
          <main className="flex-1 p-6">
              <div className="max-w-7xl mx-auto space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center justify-between"
                >
                  <div>
                    <h1 className="text-3xl font-bold text-foreground">Documentos</h1>
                    <p className="text-muted-foreground">
                      Navegue pelas pastas organizadas hierarquicamente
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {currentFolderId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCreateSubfolder}
                        className="rounded-2xl"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Nova Subpasta
                      </Button>
                    )}
                    <div className="flex border rounded-2xl bg-muted/30 p-1">
                      <Button
                        variant={viewMode === "grid" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("grid")}
                        className="rounded-xl"
                      >
                        <Grid3X3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={viewMode === "list" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setViewMode("list")}
                        className="rounded-xl"
                      >
                        <List className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>

                {/* Navigation & Search */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <Card className="bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        {/* Breadcrumb Navigation */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={navigateToRoot}
                            className="rounded-xl"
                          >
                            <Home className="w-4 h-4" />
                          </Button>
                          
                          {breadcrumbs.length > 0 && (
                            <Breadcrumb>
                              <BreadcrumbList>
                                {breadcrumbs.map((crumb, index) => (
                                  <div key={crumb.id} className="flex items-center">
                                    <BreadcrumbItem>
                                      {index === breadcrumbs.length - 1 ? (
                                        <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                                      ) : (
                                        <BreadcrumbLink
                                          onClick={() => navigateToBreadcrumb(index)}
                                          className="cursor-pointer hover:text-primary"
                                        >
                                          {crumb.name}
                                        </BreadcrumbLink>
                                      )}
                                    </BreadcrumbItem>
                                    {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                                  </div>
                                ))}
                              </BreadcrumbList>
                            </Breadcrumb>
                          )}
                          
                          {currentFolderId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={navigateBack}
                              className="rounded-xl"
                            >
                              <ArrowLeft className="w-4 h-4 mr-2" />
                              Voltar
                            </Button>
                          )}
                        </div>

                        {/* Search */}
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder="Buscar arquivos e pastas..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-10 w-64 rounded-2xl"
                            />
                          </div>
                          {searchQuery && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={clearSearch}
                              className="rounded-2xl"
                            >
                              Limpar
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        {filteredFolders.length + filteredFiles.length} item(s) encontrado(s)
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Content Grid/List */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  {filteredFolders.length === 0 && filteredFiles.length === 0 ? (
                    <Card className="bg-card/50 backdrop-blur-sm">
                      <CardContent className="p-12 text-center">
                        <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          {searchQuery ? "Nenhum item encontrado" : "Pasta vazia"}
                        </h3>
                        <p className="text-muted-foreground">
                          {searchQuery 
                            ? "Tente ajustar sua busca ou navegar para outras pastas."
                            : "Esta pasta não contém arquivos ou subpastas."}
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className={cn(
                      "grid gap-4",
                      viewMode === "grid" 
                        ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                        : "grid-cols-1"
                    )}>
                      <AnimatePresence>
                        {/* Render Folders First */}
                        {filteredFolders.map((folder, index) => (
                          <motion.div
                            key={folder.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2, delay: index * 0.02 }}
                          >
                            <Card 
                              className="group bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer border-2 border-primary/20"
                              onClick={() => navigateToFolder(folder.id)}
                            >
                              <CardContent className="p-4">
                                {viewMode === "grid" ? (
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                      <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
                                        <Folder className="w-6 h-6" />
                                      </div>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                                          >
                                            <MoreVertical className="w-4 h-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-2xl">
                                          <DropdownMenuItem onClick={() => navigateToFolder(folder.id)}>
                                            <FolderOpen className="w-4 h-4 mr-2" />
                                            Abrir
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={() => handleDeleteItem(folder)} className="text-destructive">
                                            <Trash className="w-4 h-4 mr-2" />
                                            Excluir
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                    
                                    <div>
                                      <h4 className="font-medium text-foreground text-sm mb-1">
                                        {folder.name}
                                      </h4>
                                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>{folder.documentsCount} docs</span>
                                        <span>•</span>
                                        <span>{folder.subfolderCount} pastas</span>
                                      </div>
                                    </div>

                                    <Badge variant="outline" className="text-xs capitalize">
                                      {folder.kind === 'client' ? 'Cliente' : folder.kind === 'case' ? 'Caso' : 'Subpasta'}
                                    </Badge>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                                      <Folder className="w-5 h-5" />
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-foreground mb-1 truncate">
                                        {folder.name}
                                      </h4>
                                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <span>{folder.documentsCount} documentos</span>
                                        <span>•</span>
                                        <span>{folder.subfolderCount} subpastas</span>
                                        <span>•</span>
                                        <span className="capitalize">{folder.kind === 'client' ? 'Cliente' : folder.kind === 'case' ? 'Caso' : 'Subpasta'}</span>
                                      </div>
                                    </div>

                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                                        >
                                          <MoreVertical className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="rounded-2xl">
                                        <DropdownMenuItem onClick={() => navigateToFolder(folder.id)}>
                                          <FolderOpen className="w-4 h-4 mr-2" />
                                          Abrir
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleDeleteItem(folder)} className="text-destructive">
                                          <Trash className="w-4 h-4 mr-2" />
                                          Excluir
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}

                        {/* Render Files */}
                        {filteredFiles.map((file, index) => (
                          <motion.div
                            key={file.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2, delay: (filteredFolders.length + index) * 0.02 }}
                          >
                            <Card className="group bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer">
                              <CardContent className="p-4">
                                {viewMode === "grid" ? (
                                  <div className="space-y-3" onClick={() => handleViewFile(file)}>
                                    <div className="flex items-start justify-between">
                                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center text-lg", getFileIconClass(file.type))}>
                                        {getFileIcon(file.type)}
                                      </div>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                                          >
                                            <MoreVertical className="w-4 h-4" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="rounded-2xl">
                                          <DropdownMenuItem onClick={() => handleViewFile(file)}>
                                            <Eye className="w-4 h-4 mr-2" />
                                            Visualizar
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => handleDownloadFile(file)}>
                                            <Download className="w-4 h-4 mr-2" />
                                            Baixar
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={() => handleDeleteItem(file)} className="text-destructive">
                                            <Trash className="w-4 h-4 mr-2" />
                                            Excluir
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                    
                                    <div>
                                      <h4 className="font-medium text-foreground text-sm mb-1 line-clamp-2">
                                        {file.docNumber || file.name}
                                      </h4>
                                      <p className="text-xs text-muted-foreground mb-2">
                                        {formatFileSize(file.size)}
                                      </p>
                                    </div>

                                    <p className="text-xs text-muted-foreground">
                                      {formatDate(file.createdAt)}
                                    </p>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-4" onClick={() => handleViewFile(file)}>
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", getFileIconClass(file.type))}>
                                      {getFileIcon(file.type)}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-foreground mb-1 truncate">
                                        {file.docNumber || file.name}
                                      </h4>
                                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <span>{formatFileSize(file.size)}</span>
                                        <span>•</span>
                                        <span>{formatDate(file.createdAt)}</span>
                                      </div>
                                    </div>

                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                                        >
                                          <MoreVertical className="w-4 h-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="rounded-2xl">
                                        <DropdownMenuItem onClick={() => handleViewFile(file)}>
                                          <Eye className="w-4 h-4 mr-2" />
                                          Visualizar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDownloadFile(file)}>
                                          <Download className="w-4 h-4 mr-2" />
                                          Baixar
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleDeleteItem(file)} className="text-destructive">
                                          <Trash className="w-4 h-4 mr-2" />
                                          Excluir
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </motion.div>
              </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default Documents;