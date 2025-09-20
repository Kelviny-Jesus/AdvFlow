import { useState } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ThemeProvider } from "next-themes";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Wand2, ChevronDown, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GenerateModal } from "@/components/GenerateModal";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Settings = () => {
  const navigate = useNavigate();
  const [searchQuery] = useState("");
  const [openGenerate, setOpenGenerate] = useState(false);

  // Modals
  const [openFonts, setOpenFonts] = useState(false);
  const [openSpacing, setOpenSpacing] = useState(false);
  const [openRag, setOpenRag] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [openSignature, setOpenSignature] = useState(false);
  const [openLetterhead, setOpenLetterhead] = useState(false);

  

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <SidebarProvider>
          <AppSidebar />
        <SidebarInset className="bg-gradient-subtle">
          <Header searchQuery={searchQuery} onSearchChange={() => {}} showGenerateButton={false} />
            
            <main className="flex-1 p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                <div>
                  <Button
                    onClick={() => setOpenGenerate(true)}
                    className="w-full h-12 text-lg bg-teal-600 hover:bg-teal-700 rounded-2xl"
                  >
                    GERAR
                    <Wand2 className="w-4 h-4 ml-2" />
                  </Button>
                      </div>
                      
                {/* Ações rápidas (Fontes, Espaçamento, RAG) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Fontes', onClick: () => setOpenFonts(true) },
                    { label: 'Espaçamento', onClick: () => setOpenSpacing(true) },
                    { label: 'RAG', onClick: () => setOpenRag(true) },
                  ].map((item) => (
                    <Button
                      key={item.label}
                      variant="outline"
                      className="h-16 text-lg justify-start border-2 border-teal-700/40 hover:border-teal-600 rounded-2xl"
                      onClick={item.onClick}
                    >
                      {item.label}
                    </Button>
                  ))}
                      </div>
                      
                {/* Notificações e agenda */}
                <Button
                  variant="outline"
                  className="h-20 text-left text-xl font-semibold border-2 border-teal-700/40 hover:border-teal-600 rounded-2xl"
                  onClick={() => setOpenNotifications(true)}
                >
                  Configurar notificações e agenda
                </Button>

                {/* Ações secundárias */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-16 text-lg justify-between border-2 border-teal-700/40 hover:border-teal-600 rounded-2xl"
                    onClick={() => setOpenSignature(true)}
                  >
                    <span>Assinatura</span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-16 text-lg justify-between border-2 border-teal-700/40 hover:border-teal-600 rounded-2xl"
                    onClick={() => setOpenLetterhead(true)}
                  >
                    <span>Papel Timbrado</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Modals */}
                <Dialog open={openFonts} onOpenChange={setOpenFonts}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Fontes</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Fonte primária</Label>
                        <Input placeholder="Ex: Inter, Roboto..." />
                      </div>
                      <div className="space-y-2">
                        <Label>Tamanho base</Label>
                        <Input type="number" placeholder="14" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => { setOpenFonts(false); toast({ title: 'Fontes atualizadas' }); }}>Salvar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={openSpacing} onOpenChange={setOpenSpacing}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Espaçamento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Entre linhas</Label>
                        <Input type="number" step="0.1" placeholder="1.5" />
                      </div>
                      <div className="space-y-2">
                        <Label>Margens (mm)</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input placeholder="Superior" />
                          <Input placeholder="Inferior" />
                          <Input placeholder="Esquerda" />
                          <Input placeholder="Direita" />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => { setOpenSpacing(false); toast({ title: 'Espaçamento atualizado' }); }}>Salvar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={openRag} onOpenChange={setOpenRag}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>RAG</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Ativar RAG no Gerar</Label>
                        <Switch defaultChecked />
                      </div>
                      <div className="space-y-2">
                        <Label>Fonte de conhecimento</Label>
                        <Input placeholder="Ex: Pastas do cliente" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => { setOpenRag(false); toast({ title: 'RAG atualizado' }); }}>Salvar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={openNotifications} onOpenChange={setOpenNotifications}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Notificações e Agenda</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label>Notificações por email</Label>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Lembretes de prazos</Label>
                        <Switch />
                      </div>
                      <div className="space-y-2">
                        <Label>Antecedência padrão (dias)</Label>
                        <Input type="number" placeholder="3" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => { setOpenNotifications(false); toast({ title: 'Preferências salvas' }); }}>Salvar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={openSignature} onOpenChange={setOpenSignature}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assinatura</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                      <Label>Texto da assinatura</Label>
                      <Textarea className="min-h-40" placeholder="Nome, OAB, contatos..." />
                    </div>
                    <DialogFooter>
                      <Button onClick={() => { setOpenSignature(false); toast({ title: 'Assinatura atualizada' }); }}>Salvar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={openLetterhead} onOpenChange={setOpenLetterhead}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Papel Timbrado</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>URL do logotipo</Label>
                        <Input placeholder="https://..." />
                      </div>
                      <div className="space-y-2">
                        <Label>Cabeçalho</Label>
                        <Textarea className="min-h-24" />
                      </div>
                      <div className="space-y-2">
                        <Label>Rodapé</Label>
                        <Textarea className="min-h-24" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => { setOpenLetterhead(false); toast({ title: 'Papel timbrado salvo' }); }}>Salvar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                {/* Antigas configurações removidas para novo layout */}
              </div>
            </main>
          <GenerateModal open={openGenerate} onOpenChange={setOpenGenerate} />
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default Settings;