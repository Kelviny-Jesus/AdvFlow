import { useState } from "react";
import { ThemeProvider } from "next-themes";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { BadgeCheck, FileText, Upload } from "lucide-react";

const Signature = () => {
  const [searchQuery] = useState("");
  const [openNewSignature, setOpenNewSignature] = useState(false);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-gradient-subtle">
          <Header searchQuery={searchQuery} onSearchChange={() => {}} showGenerateButton={false} />

          <main className="flex-1 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5" /> Assinatura Eletrônica
                </h1>
                <Button className="rounded-2xl" onClick={() => setOpenNewSignature(true)}>
                  Nova solicitação
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-base">Como funciona</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <p>1. Envie o documento (PDF/DOCX).</p>
                    <p>2. Defina signatários e ordem de assinatura.</p>
                    <p>3. Envie para assinatura e acompanhe o status.</p>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-base">Status</CardTitle>
                  </CardHeader>
                  <CardContent className="flex gap-4">
                    <div>
                      <div className="text-2xl font-semibold">0</div>
                      <div className="text-xs text-muted-foreground">Pendentes</div>
                    </div>
                    <div>
                      <div className="text-2xl font-semibold">0</div>
                      <div className="text-xs text-muted-foreground">Concluídos</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-base">Modelos</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">Procuração</Badge>
                    <Badge variant="outline">Contrato</Badge>
                    <Badge variant="outline">Termo</Badge>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base">Solicitações recentes</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Nenhuma solicitação ainda.
                </CardContent>
              </Card>
            </div>
          </main>

          <Dialog open={openNewSignature} onOpenChange={setOpenNewSignature}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova solicitação de assinatura</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Documento</Label>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" className="rounded-xl">
                      <Upload className="w-4 h-4 mr-2" /> Enviar arquivo
                    </Button>
                    <Button variant="outline" className="rounded-xl">
                      <FileText className="w-4 h-4 mr-2" /> Selecionar existente
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome completo do signatário</Label>
                    <Input placeholder="Nome" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="email@exemplo.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea placeholder="Instruções opcionais" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => { setOpenNewSignature(false); toast({ title: "Solicitação criada" }); }}>
                  Criar solicitação
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default Signature;


