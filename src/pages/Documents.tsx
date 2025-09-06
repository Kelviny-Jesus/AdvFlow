import { useState, useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "next-themes";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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
  MoreVertical,
  Eye,
  Download,
  Edit,
  Trash,
  ExternalLink,
  Calendar
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { FileItem, Client, Case, ViewMode } from "@/types";
import { mockFiles, mockClients, mockCases } from "@/data/mocks";
import { formatFileSize, formatDate, getFileIcon, getFileIconClass } from "@/utils/fileUtils";
import { toast } from "@/hooks/use-toast";

const Documents = () => {
  const [files, setFiles] = useState<FileItem[]>(mockFiles);
  const [clients] = useState<Client[]>(mockClients);
  const [cases] = useState<Case[]>(mockCases);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedCase, setSelectedCase] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  // Filter files based on criteria
  const filteredFiles = files.filter(file => {
    const matchesSearch = !searchQuery || 
      file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesClient = selectedClient === "all" || file.clientId === selectedClient;
    const matchesCase = selectedCase === "all" || file.caseId === selectedCase;
    const matchesType = selectedType === "all" || file.type === selectedType;
    
    return matchesSearch && matchesClient && matchesCase && matchesType;
  });

  // Get available cases for selected client
  const availableCases = selectedClient === "all" 
    ? cases 
    : cases.filter(c => c.clientId === selectedClient);

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

  const handleEditFile = (file: FileItem) => {
    toast({
      title: "Recurso em desenvolvimento",
      description: "A edição será implementada em breve.",
    });
  };

  const handleDeleteFile = (file: FileItem) => {
    setFiles(prev => prev.filter(f => f.id !== file.id));
    toast({
      title: "Documento excluído",
      description: `${file.name} foi removido.`,
      variant: "destructive",
    });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedClient("all");
    setSelectedCase("all");
    setSelectedType("all");
  };

  const getClientName = (clientId: string) => {
    return clients.find(c => c.id === clientId)?.name || "Cliente não encontrado";
  };

  const getCaseName = (caseId: string) => {
    return cases.find(c => c.id === caseId)?.name || "Caso não encontrado";
  };

  const fileTypes = [...new Set(files.map(f => f.type))];

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
              <div className="max-w-7xl mx-auto space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1 className="text-3xl font-bold text-foreground">Documentos</h1>
                  <p className="text-muted-foreground">
                    Galeria de documentos organizados por cliente e caso
                  </p>
                </motion.div>

                {/* Filters */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <Card className="bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold flex items-center gap-2">
                          <Filter className="w-4 h-4 text-primary" />
                          Filtros
                        </h3>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearFilters}
                            className="rounded-2xl"
                          >
                            Limpar
                          </Button>
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
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>Cliente</Label>
                          <Select value={selectedClient} onValueChange={setSelectedClient}>
                            <SelectTrigger className="rounded-2xl">
                              <SelectValue placeholder="Todos os clientes" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos os clientes</SelectItem>
                              {clients.map(client => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Caso</Label>
                          <Select 
                            value={selectedCase} 
                            onValueChange={setSelectedCase}
                            disabled={selectedClient === "all"}
                          >
                            <SelectTrigger className="rounded-2xl">
                              <SelectValue placeholder="Todos os casos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos os casos</SelectItem>
                              {availableCases.map(case_ => (
                                <SelectItem key={case_.id} value={case_.id}>
                                  {case_.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Select value={selectedType} onValueChange={setSelectedType}>
                            <SelectTrigger className="rounded-2xl">
                              <SelectValue placeholder="Todos os tipos" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">Todos os tipos</SelectItem>
                              {fileTypes.map(type => (
                                <SelectItem key={type} value={type}>
                                  {type.toUpperCase()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Resultado</Label>
                          <p className="text-sm text-muted-foreground py-2">
                            {filteredFiles.length} documento(s) encontrado(s)
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Documents Grid/List */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  {filteredFiles.length === 0 ? (
                    <Card className="bg-card/50 backdrop-blur-sm">
                      <CardContent className="p-12 text-center">
                        <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          Nenhum documento encontrado
                        </h3>
                        <p className="text-muted-foreground">
                          Tente ajustar os filtros ou fazer upload de novos documentos.
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
                        {filteredFiles.map((file, index) => (
                          <motion.div
                            key={file.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2, delay: index * 0.02 }}
                          >
                            <Card className="group bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer">
                              <CardContent className="p-4">
                                {viewMode === "grid" ? (
                                  // Grid View
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
                                          <DropdownMenuItem onClick={() => handleEditFile(file)}>
                                            <Edit className="w-4 h-4 mr-2" />
                                            Editar
                                          </DropdownMenuItem>
                                          <DropdownMenuItem 
                                            onClick={() => handleDeleteFile(file)}
                                            className="text-destructive"
                                          >
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

                                    <div className="space-y-1">
                                      <Badge variant="secondary" className="text-xs">
                                        {getClientName(file.clientId)}
                                      </Badge>
                                      <p className="text-xs text-muted-foreground">
                                        {getCaseName(file.caseId)}
                                      </p>
                                    </div>

                                    <p className="text-xs text-muted-foreground">
                                      {formatDate(file.createdAt)}
                                    </p>
                                  </div>
                                ) : (
                                  // List View
                                  <div className="flex items-center gap-4" onClick={() => handleViewFile(file)}>
                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", getFileIconClass(file.type))}>
                                      {getFileIcon(file.type)}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-medium text-foreground mb-1 truncate">
                                        {file.docNumber || file.name}
                                      </h4>
                                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <span>{getClientName(file.clientId)}</span>
                                        <span>•</span>
                                        <span>{getCaseName(file.caseId)}</span>
                                        <span>•</span>
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
                                        <DropdownMenuItem onClick={() => handleEditFile(file)}>
                                          <Edit className="w-4 h-4 mr-2" />
                                          Editar
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => handleDeleteFile(file)}
                                          className="text-destructive"
                                        >
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
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default Documents;