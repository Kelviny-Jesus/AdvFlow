import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "next-themes";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { DocumentsTable } from "@/components/DocumentsTable";
import { UploadModal } from "@/components/UploadModal";
import { DocumentDetailModal } from "@/components/DocumentDetailModal";
import { mockDocuments } from "@/data/mockData";
import { Document } from "@/types/document";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon, Filter } from "lucide-react";

const Search = () => {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterClient, setFilterClient] = useState<string>("");

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setDetailModalOpen(true);
  };

  const handleEditDocument = (document: Document) => {
    toast({
      title: "Recurso em desenvolvimento",
      description: "A funcionalidade de edição será implementada em breve.",
    });
  };

  const handleDeleteDocument = (document: Document) => {
    toast({
      title: "Documento excluído",
      description: `O documento "${document.name}" foi excluído com sucesso.`,
      variant: "destructive",
    });
  };

  const filteredDocuments = mockDocuments.filter(doc => {
    const matchesSearch = !searchQuery || 
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.case.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = !filterType || doc.type === filterType;
    const matchesClient = !filterClient || doc.client === filterClient;
    
    return matchesSearch && matchesType && matchesClient;
  });

  const clients = [...new Set(mockDocuments.map(doc => doc.client))];
  const types = [...new Set(mockDocuments.map(doc => doc.type))];

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-subtle">
          <AppSidebar />
          
          <div className="flex-1 flex flex-col">
            <Header
              onNewUpload={() => setUploadModalOpen(true)}
              searchQuery=""
              onSearchChange={() => {}}
            />
            
            <main className="flex-1 p-6">
              <div className="max-w-7xl mx-auto space-y-6">
                <div className="fade-in">
                  <h1 className="text-3xl font-bold text-foreground">
                    Busca Avançada
                  </h1>
                  <p className="text-muted-foreground">
                    Encontre documentos específicos usando filtros avançados
                  </p>
                </div>

                <Card className="bg-card/50 backdrop-blur-sm slide-up">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="w-5 h-5 text-primary" />
                      Filtros de Busca
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="search">Busca Geral</Label>
                        <div className="relative">
                          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="search"
                            placeholder="Nome, cliente, caso..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Tipo de Documento</Label>
                        <Select value={filterType} onValueChange={setFilterType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos os tipos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Todos os tipos</SelectItem>
                            {types.map(type => (
                              <SelectItem key={type} value={type}>{type.toUpperCase()}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Cliente</Label>
                        <Select value={filterClient} onValueChange={setFilterClient}>
                          <SelectTrigger>
                            <SelectValue placeholder="Todos os clientes" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Todos os clientes</SelectItem>
                            {clients.map(client => (
                              <SelectItem key={client} value={client}>{client}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSearchQuery("");
                          setFilterType("");
                          setFilterClient("");
                        }}
                      >
                        Limpar Filtros
                      </Button>
                      <div className="text-sm text-muted-foreground flex items-center">
                        {filteredDocuments.length} documento(s) encontrado(s)
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="scale-up">
                  <DocumentsTable
                    documents={filteredDocuments}
                    onViewDocument={handleViewDocument}
                    onEditDocument={handleEditDocument}
                    onDeleteDocument={handleDeleteDocument}
                    globalFilter=""
                  />
                </div>
              </div>
            </main>
          </div>

          <UploadModal
            open={uploadModalOpen}
            onOpenChange={setUploadModalOpen}
          />

          <DocumentDetailModal
            document={selectedDocument}
            open={detailModalOpen}
            onOpenChange={setDetailModalOpen}
            onEditDocument={handleEditDocument}
            onDeleteDocument={handleDeleteDocument}
          />
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default Search;