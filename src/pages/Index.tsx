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

const Index = () => {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

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

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-subtle">
          <AppSidebar />
          
          <div className="flex-1 flex flex-col">
            <Header
              onNewUpload={() => setUploadModalOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
            
            <main className="flex-1 p-6">
              <div className="max-w-7xl mx-auto space-y-6">
                <div className="fade-in">
                  <h1 className="text-3xl font-bold text-foreground">
                    Documentos
                  </h1>
                  <p className="text-muted-foreground">
                    Gerencie seus documentos jurídicos e corporativos
                  </p>
                </div>

                <div className="slide-up">
                  <DocumentsTable
                    documents={mockDocuments}
                    onViewDocument={handleViewDocument}
                    onEditDocument={handleEditDocument}
                    onDeleteDocument={handleDeleteDocument}
                    globalFilter={searchQuery}
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

export default Index;
