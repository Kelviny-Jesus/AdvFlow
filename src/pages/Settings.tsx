import { useState, useEffect, useRef } from "react";
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
import { Settings as SettingsIcon, Wand2, ChevronDown, ChevronRight, UploadCloud, Image as ImageIcon, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { GenerateModal } from "@/components/GenerateModal";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getUserPrefs, setUserPrefs } from "@/lib/userPrefs";
import { cssFontStackFromFamily } from "@/lib/userPrefs";
import { getCloudUserPrefs, saveCloudUserPrefs } from "@/services/userPrefsService";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

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
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [letterheadName, setLetterheadName] = useState<string | null>(null);
  const signatureFileRef = useRef<File | null>(null);
  const letterheadFileRef = useRef<File | null>(null);
  const signatureInputRef = useRef<HTMLInputElement | null>(null);
  const letterheadInputRef = useRef<HTMLInputElement | null>(null);
  const prefs = getUserPrefs();
  const [fontFamily, setFontFamily] = useState(prefs.docFontFamily);
  const [fontSize, setFontSize] = useState<number>(prefs.docFontSize);
  const [lineSpacing, setLineSpacing] = useState<number>(prefs.docLineSpacing);
  const [ragEnabled, setRagEnabled] = useState<boolean>(prefs.ragEnabled);
  const [ragTopK, setRagTopK] = useState<number>(prefs.ragTopK);

  // Hidratar com Supabase ao abrir a tela
  useEffect(() => {
    (async () => {
      const cloud = await getCloudUserPrefs();
      if (cloud) {
        if (cloud.docFontFamily) setFontFamily(cloud.docFontFamily);
        if (cloud.docFontSize) setFontSize(cloud.docFontSize);
        if (cloud.docLineSpacing) setLineSpacing(cloud.docLineSpacing);
        if (cloud.ragEnabled !== undefined) setRagEnabled(!!cloud.ragEnabled);
        if (cloud.ragTopK) setRagTopK(cloud.ragTopK);
        setUserPrefs({
          docFontFamily: cloud.docFontFamily,
          docFontSize: cloud.docFontSize,
          docLineSpacing: cloud.docLineSpacing,
          ragEnabled: cloud.ragEnabled,
          ragTopK: cloud.ragTopK,
        });
        if ((cloud as any).signatureUrl) setSignaturePreview((cloud as any).signatureUrl);
        if ((cloud as any).letterheadPath) setLetterheadName((cloud as any).letterheadPath.split('/').pop() || null);
      }
    })();
  }, []);
  

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
                      
                {/* Notificações e agenda removido por solicitação */}

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
                        <Select value={fontFamily} onValueChange={setFontFamily}>
                          <SelectTrigger style={{ fontFamily: cssFontStackFromFamily(fontFamily) }}>
                            <SelectValue placeholder="Escolha a fonte" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Times New Roman" style={{ fontFamily: cssFontStackFromFamily('Times New Roman') }}>Times New Roman</SelectItem>
                            <SelectItem value="Arial" style={{ fontFamily: cssFontStackFromFamily('Arial') }}>Arial</SelectItem>
                            <SelectItem value="Calibri" style={{ fontFamily: cssFontStackFromFamily('Calibri') }}>Calibri</SelectItem>
                            <SelectItem value="Cambria" style={{ fontFamily: cssFontStackFromFamily('Cambria') }}>Cambria</SelectItem>
                            <SelectItem value="Garamond" style={{ fontFamily: cssFontStackFromFamily('Garamond') }}>Garamond</SelectItem>
                            <SelectItem value="Georgia" style={{ fontFamily: cssFontStackFromFamily('Georgia') }}>Georgia</SelectItem>
                            <SelectItem value="Book Antiqua" style={{ fontFamily: cssFontStackFromFamily('Book Antiqua') }}>Book Antiqua</SelectItem>
                            <SelectItem value="Palatino Linotype" style={{ fontFamily: cssFontStackFromFamily('Palatino Linotype') }}>Palatino Linotype</SelectItem>
                            <SelectItem value="Courier New" style={{ fontFamily: cssFontStackFromFamily('Courier New') }}>Courier New</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Tamanho base</Label>
                        <Input type="number" min={8} max={24} value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value || '12'))} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={async () => { 
                        setUserPrefs({ docFontFamily: fontFamily, docFontSize: fontSize });
                        await saveCloudUserPrefs({ docFontFamily: fontFamily, docFontSize: fontSize });
                        setOpenFonts(false); 
                        toast({ title: 'Fontes atualizadas' }); 
                      }}>Salvar</Button>
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
                        <Input type="number" step="0.1" min={1} max={3} value={lineSpacing} onChange={(e) => setLineSpacing(parseFloat(e.target.value || '1.5'))} />
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
                      <Button onClick={async () => { 
                        setUserPrefs({ docLineSpacing: lineSpacing }); 
                        await saveCloudUserPrefs({ docLineSpacing: lineSpacing });
                        setOpenSpacing(false); 
                        toast({ title: 'Espaçamento atualizado' }); 
                      }}>Salvar</Button>
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
                        <Switch checked={ragEnabled} onCheckedChange={(v) => setRagEnabled(!!v)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Qtd. de documentos adicionais (top‑K)</Label>
                        <Input type="number" min={1} max={50} value={ragTopK} onChange={(e) => setRagTopK(parseInt(e.target.value || '5'))} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={async () => { 
                        setUserPrefs({ ragEnabled, ragTopK }); 
                        await saveCloudUserPrefs({ ragEnabled, ragTopK });
                        setOpenRag(false); 
                        toast({ title: 'RAG atualizado' }); 
                      }}>Salvar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Modal de notificações removido */}

                <Dialog open={openSignature} onOpenChange={setOpenSignature}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Assinatura</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <Label>Imagem da assinatura (PNG/JPG com fundo transparente recomendado)</Label>
                      <div
                        className="mt-1 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer bg-card/40 hover:bg-card"
                        onClick={() => signatureInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (!file) return;
                          signatureFileRef.current = file;
                          const url = URL.createObjectURL(file);
                          setSignaturePreview(url);
                        }}
                      >
                        {signaturePreview ? (
                          <div className="flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={signaturePreview} alt="Assinatura" className="max-h-28" />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                            <ImageIcon className="w-8 h-8" />
                            <span>Arraste a imagem aqui ou clique para selecionar</span>
                          </div>
                        )}
                        <input
                          ref={signatureInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            signatureFileRef.current = file;
                            const url = URL.createObjectURL(file);
                            setSignaturePreview(url);
                          }}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={async () => {
                        const file = signatureFileRef.current || undefined;
                        if (file) {
                          const { data: user } = await supabase.auth.getUser();
                          if (!user?.user?.id) return;
                          const path = `${user.user.id}/assets/signature-${Date.now()}.${file.name.split('.').pop()}`;
                          const { error } = await supabase.storage.from('documents').upload(path, file, { cacheControl: '3600', upsert: false });
                          if (!error) {
                            const { data: pub } = supabase.storage.from('documents').getPublicUrl(path);
                            console.info('[Settings] signature uploaded', { path, url: pub.publicUrl });
                            await saveCloudUserPrefs({ signaturePath: path, signatureUrl: pub.publicUrl });
                            setUserPrefs({}); // trigger local sync noop
                          }
                        }
                        const cloudAfter = await getCloudUserPrefs();
                        console.info('[Settings] cloud prefs after signature save', cloudAfter);
                        setOpenSignature(false); toast({ title: 'Assinatura atualizada' });
                      }}>Salvar</Button>
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
                        <Label>Arquivo do papel timbrado (PDF, PNG/JPG ou DOCX)</Label>
                        <div
                          className="mt-1 border-2 border-dashed rounded-xl p-6 text-center cursor-pointer bg-card/40 hover:bg-card"
                          onClick={() => letterheadInputRef.current?.click()}
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files?.[0];
                            if (!file) return;
                            letterheadFileRef.current = file;
                            setLetterheadName(file.name);
                          }}
                        >
                          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                            <FileText className="w-8 h-8" />
                            <span>{letterheadName ? `Selecionado: ${letterheadName}` : 'Arraste o PDF aqui ou clique para selecionar'}</span>
                          </div>
                          <input
                            ref={letterheadInputRef}
                            type="file"
                            accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              letterheadFileRef.current = file;
                              setLetterheadName(file.name);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={async () => {
                        const file = letterheadFileRef.current || undefined;
                        if (file) {
                          const { data: user } = await supabase.auth.getUser();
                          if (!user?.user?.id) return;
                          const path = `${user.user.id}/assets/letterhead-${Date.now()}.pdf`;
                          const { error } = await supabase.storage.from('documents').upload(path, file, { cacheControl: '3600', upsert: false });
                          if (!error) {
                            const { data: pub } = supabase.storage.from('documents').getPublicUrl(path);
                            await saveCloudUserPrefs({ letterheadPath: path, letterheadUrl: pub.publicUrl });
                          }
                        }
                        setOpenLetterhead(false); toast({ title: 'Papel timbrado salvo' });
                      }}>Salvar</Button>
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