import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "next-themes";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { UploadModal } from "@/components/UploadModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload as UploadIcon, FileText, Users, FolderOpen } from "lucide-react";

const Upload = () => {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const stats = [
    { title: "Total de Documentos", value: "1,247", icon: FileText },
    { title: "Clientes Ativos", value: "89", icon: Users },
    { title: "Casos em Andamento", value: "156", icon: FolderOpen },
    { title: "Uploads Hoje", value: "23", icon: UploadIcon },
  ];

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
                    Centro de Upload
                  </h1>
                  <p className="text-muted-foreground">
                    Gerencie o envio de novos documentos
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 slide-up">
                  {stats.map((stat, index) => (
                    <Card key={index} className="bg-card/50 backdrop-blur-sm hover:shadow-medium transition-all">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {stat.title}
                        </CardTitle>
                        <stat.icon className="w-4 h-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="bg-card/50 backdrop-blur-sm scale-up">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UploadIcon className="w-5 h-5 text-primary" />
                      Upload Rápido
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                      Envie documentos de forma rápida e organizadas automaticamente por cliente e caso.
                    </p>
                    <Button
                      onClick={() => setUploadModalOpen(true)}
                      className="bg-gradient-primary hover:shadow-medium transition-all w-full"
                      size="lg"
                    >
                      <UploadIcon className="w-5 h-5 mr-2" />
                      Iniciar Upload
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </main>
          </div>

          <UploadModal
            open={uploadModalOpen}
            onOpenChange={setUploadModalOpen}
          />
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default Upload;