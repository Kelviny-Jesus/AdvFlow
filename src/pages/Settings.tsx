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
import { Settings as SettingsIcon, Wand2, ChevronDown, ChevronRight, UploadCloud, Image as ImageIcon, FileText, Cloud, CheckCircle2, XCircle, User, CreditCard, Shield, Bell, Palette, LogOut } from "lucide-react";
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
import { googleDriveService } from "@/services/googleDriveService";
import { TrainingDocumentsModal } from "@/components/TrainingDocumentsModal";

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
  const [openGoogleDrive, setOpenGoogleDrive] = useState(false);
  const [openAccount, setOpenAccount] = useState(false);
  const [openPlan, setOpenPlan] = useState(false);
  const [openSecurity, setOpenSecurity] = useState(false);
  const [openPreferences, setOpenPreferences] = useState(false);
  const [openTraining, setOpenTraining] = useState(false);
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
  const [googleDriveConnected, setGoogleDriveConnected] = useState(false);
  const [googleDriveLoading, setGoogleDriveLoading] = useState(false);

  // Account data
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

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
      
      // Carregar dados do usuário
      const { data: user } = await supabase.auth.getUser();
      if (user?.user) {
        setUserEmail(user.user.email || '');
        setUserName(user.user.user_metadata?.full_name || '');
      }
      
      // Verificar status do Google Drive (com delay para garantir que scripts carreguem)
      setTimeout(() => {
        if (googleDriveService.isConfigured()) {
          setGoogleDriveConnected(googleDriveService.isAuthenticated());
        }
      }, 500);
    })();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
      toast({ title: 'Sessão encerrada com sucesso' });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast({ title: 'Erro ao sair', variant: 'destructive' });
    }
  };

  const handleRagSettingsChange = async (enabled: boolean, topK: number) => {
    try {
      setRagEnabled(enabled);
      setRagTopK(topK);
      setUserPrefs({ ragEnabled: enabled, ragTopK: topK });
      await saveCloudUserPrefs({ ragEnabled: enabled, ragTopK: topK });
    } catch (error) {
      console.error('Erro ao salvar configurações de RAG:', error);
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar as configurações de RAG',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: userName }
      });

      if (error) throw error;

      toast({ title: 'Perfil atualizado com sucesso' });
      setOpenAccount(false);
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast({ 
        title: 'Erro ao atualizar perfil', 
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive' 
      });
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ 
        title: 'As senhas não coincidem', 
        variant: 'destructive' 
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({ 
        title: 'Senha muito curta', 
        description: 'A senha deve ter pelo menos 6 caracteres',
        variant: 'destructive' 
      });
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'Senha alterada com sucesso' });
      setOpenSecurity(false);
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      toast({ 
        title: 'Erro ao alterar senha', 
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive' 
      });
    }
  };
  
  const handleConnectGoogleDrive = async () => {
    setGoogleDriveLoading(true);
    try {
      const success = await googleDriveService.authenticate();
      setGoogleDriveConnected(success);
      toast({ title: 'Google Drive conectado com sucesso!' });
    } catch (error) {
      console.error('Erro ao conectar Google Drive:', error);
      toast({ title: 'Erro ao conectar', description: error instanceof Error ? error.message : 'Erro desconhecido', variant: 'destructive' });
    } finally {
      setGoogleDriveLoading(false);
    }
  };

  const handleDisconnectGoogleDrive = () => {
    try {
      googleDriveService.disconnect();
      setGoogleDriveConnected(false);
      toast({ title: 'Google Drive desconectado' });
    } catch (error) {
      console.error('Erro ao desconectar:', error);
      // Mesmo com erro, atualizar o estado
      setGoogleDriveConnected(false);
      toast({ 
        title: 'Desconectado com avisos', 
        description: 'A sessão foi limpa localmente'
      });
    }
  };
  

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

                {/* Título da página */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1 className="text-3xl font-bold">Configurações</h1>
                  <p className="text-muted-foreground mt-1">
                    Gerencie sua conta e preferências do sistema
                  </p>
                </motion.div>

                {/* Configurações de Conta */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Conta</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="h-16 text-lg justify-between border-2 border-teal-700/40 hover:border-teal-600 rounded-2xl"
                      onClick={() => setOpenAccount(true)}
                    >
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5" />
                        <span>Perfil</span>
                      </div>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="h-16 text-lg justify-between border-2 border-teal-700/40 hover:border-teal-600 rounded-2xl"
                      onClick={() => setOpenPlan(true)}
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-5 h-5" />
                        <span>Plano</span>
                      </div>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="h-16 text-lg justify-between border-2 border-teal-700/40 hover:border-teal-600 rounded-2xl"
                      onClick={() => setOpenSecurity(true)}
                    >
                      <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5" />
                        <span>Segurança</span>
                      </div>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="h-16 text-lg justify-between border-2 border-teal-700/40 hover:border-teal-600 rounded-2xl"
                      onClick={() => setOpenPreferences(true)}
                    >
                      <div className="flex items-center gap-3">
                        <Bell className="w-5 h-5" />
                        <span>Notificações</span>
                      </div>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Separator className="my-6" />
                      
                {/* Configurações de Documentos */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Documentos</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Fontes', onClick: () => setOpenFonts(true) },
                    { label: 'Espaçamento', onClick: () => setOpenSpacing(true) },
                    { label: 'RAG', onClick: () => setOpenTraining(true) },
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

                {/* Integrações */}
                <Separator className="my-6" />
                <div>
                  <h3 className="text-lg font-semibold mb-4">Integrações</h3>
                  <Button
                    variant="outline"
                    className={`h-16 text-lg justify-between border-2 ${googleDriveConnected ? 'border-green-600/40 hover:border-green-500' : 'border-blue-700/40 hover:border-blue-600'} rounded-2xl w-full`}
                    onClick={() => setOpenGoogleDrive(true)}
                  >
                    <div className="flex items-center gap-3">
                      <Cloud className="w-5 h-5" />
                      <span>Google Drive</span>
                      {googleDriveConnected ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Sair */}
                <Separator className="my-6" />
                <Button
                  variant="outline"
                  className="h-14 text-lg justify-start border-2 border-red-700/40 hover:border-red-600 hover:bg-red-50 rounded-2xl w-full"
                  onClick={handleLogout}
                >
                  <LogOut className="w-5 h-5 mr-3 text-red-600" />
                  <span className="text-red-600">Sair da Conta</span>
                </Button>

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

                {/* Modal de Conta/Perfil */}
                <Dialog open={openAccount} onOpenChange={setOpenAccount}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Perfil
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Nome completo</Label>
                        <Input
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          placeholder="Seu nome"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          value={userEmail}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                          O email não pode ser alterado
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleUpdateProfile}>
                        Salvar alterações
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Modal de Plano */}
                <Dialog open={openPlan} onOpenChange={setOpenPlan}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Plano de Assinatura
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="p-4 bg-muted/30 border border-border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-lg">Plano Gratuito</h4>
                          <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-full">
                            Atual
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Você está usando o plano gratuito do AdvFlow
                        </p>
                        <ul className="text-sm space-y-1">
                          <li className="flex items-start gap-2">
                            <span className="text-primary">✓</span>
                            <span>Upload ilimitado de documentos</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary">✓</span>
                            <span>OCR de imagens</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary">✓</span>
                            <span>Geração de sínteses com IA</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="text-primary">✓</span>
                            <span>Integração com Google Drive</span>
                          </li>
                        </ul>
                      </div>
                      <p className="text-xs text-center text-muted-foreground">
                        Em breve: planos Pro com recursos avançados
                      </p>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setOpenPlan(false)}>
                        Fechar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Modal de Segurança */}
                <Dialog open={openSecurity} onOpenChange={setOpenSecurity}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Segurança
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-3">Alterar senha</h4>
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label>Senha atual</Label>
                            <Input
                              type="password"
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="Digite sua senha atual"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Nova senha</Label>
                            <Input
                              type="password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Digite a nova senha"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Confirmar senha</Label>
                            <Input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="Confirme a nova senha"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            A senha deve ter pelo menos 6 caracteres
                          </p>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => {
                          setOpenSecurity(false);
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={handleChangePassword}>
                        Alterar senha
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Modal de Preferências/Notificações */}
                <Dialog open={openPreferences} onOpenChange={setOpenPreferences}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5" />
                        Notificações
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Notificações no sistema</Label>
                          <p className="text-sm text-muted-foreground">
                            Receber notificações enquanto usa o AdvFlow
                          </p>
                        </div>
                        <Switch
                          checked={notificationsEnabled}
                          onCheckedChange={setNotificationsEnabled}
                        />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-base">Notificações por email</Label>
                          <p className="text-sm text-muted-foreground">
                            Receber atualizações importantes por email
                          </p>
                        </div>
                        <Switch
                          checked={emailNotifications}
                          onCheckedChange={setEmailNotifications}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => {
                        toast({ title: 'Preferências salvas' });
                        setOpenPreferences(false);
                      }}>
                        Salvar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={openGoogleDrive} onOpenChange={setOpenGoogleDrive}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Cloud className="w-5 h-5" />
                        Google Drive
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">Status da Conexão</p>
                          <p className="text-sm text-muted-foreground">
                            {googleDriveConnected ? 'Conectado e pronto para usar' : 'Não conectado'}
                          </p>
                        </div>
                        {googleDriveConnected ? (
                          <CheckCircle2 className="w-6 h-6 text-green-600" />
                        ) : (
                          <XCircle className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>

                      {!googleDriveConnected ? (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Conecte sua conta do Google Drive para:
                          </p>
                          <ul className="text-sm space-y-2 ml-4">
                            <li className="flex items-start gap-2">
                              <span className="text-teal-600">•</span>
                              <span>Fazer backup dos documentos automaticamente</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-teal-600">•</span>
                              <span>Salvar sínteses geradas no Drive</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-teal-600">•</span>
                              <span>Importar arquivos do Drive sem baixar</span>
                            </li>
                          </ul>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Sua conta está conectada! Você pode:
                          </p>
                          <div className="flex flex-col gap-2">
                            <Button
                              variant="outline"
                              className="justify-start"
                              onClick={() => {
                                setOpenGoogleDrive(false);
                                // Navegar para página de upload com Drive habilitado
                                navigate('/upload?source=drive');
                              }}
                            >
                              <UploadCloud className="w-4 h-4 mr-2" />
                              Importar do Google Drive
                            </Button>
                            <p className="text-xs text-muted-foreground ml-1">
                              (Sínteses podem ser salvas no Drive através do botão "Salvar" na página de geração)
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2">
                      {googleDriveConnected ? (
                        <Button 
                          variant="destructive" 
                          onClick={handleDisconnectGoogleDrive}
                          className="w-full sm:w-auto"
                        >
                          Desconectar
                        </Button>
                      ) : (
                        <Button 
                          onClick={handleConnectGoogleDrive}
                          disabled={googleDriveLoading || !googleDriveService.isConfigured()}
                          className="w-full sm:w-auto"
                        >
                          {googleDriveLoading ? (
                            <>
                              <UploadCloud className="w-4 h-4 mr-2 animate-pulse" />
                              Conectando...
                            </>
                          ) : (
                            <>
                              <Cloud className="w-4 h-4 mr-2" />
                              Conectar Google Drive
                            </>
                          )}
                        </Button>
                      )}
                      {!googleDriveService.isConfigured() && !googleDriveConnected && (
                        <p className="text-xs text-amber-600 w-full">
                          ⚠️ Configure CLIENT_ID e API_KEY do Google Drive nas variáveis de ambiente
                        </p>
                      )}
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                {/* Antigas configurações removidas para novo layout */}
              </div>
            </main>
          <GenerateModal open={openGenerate} onOpenChange={setOpenGenerate} />
          <TrainingDocumentsModal 
            open={openTraining} 
            onOpenChange={setOpenTraining}
            ragEnabled={ragEnabled}
            ragTopK={ragTopK}
            onRagSettingsChange={handleRagSettingsChange}
          />
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default Settings;