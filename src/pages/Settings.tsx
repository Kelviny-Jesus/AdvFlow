import { useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ThemeProvider } from "next-themes";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings as SettingsIcon, Save, RotateCcw, FileType, Wand2 } from "lucide-react";
import { motion } from "framer-motion";
import { defaultSettings } from "@/data/mocks";
import { toast } from "@/hooks/use-toast";

const Settings = () => {
  const [settings, setSettings] = useState(defaultSettings);
  const [searchQuery] = useState("");

  const handleSave = () => {
    toast({
      title: "Configurações salvas",
      description: "Suas preferências foram atualizadas com sucesso.",
    });
  };

  const handleReset = () => {
    setSettings(defaultSettings);
    toast({
      title: "Configurações restauradas",
      description: "Valores padrão foram restaurados.",
    });
  };

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-subtle">
          <AppSidebar />
          
          <div className="flex-1 flex flex-col">
            <Header searchQuery={searchQuery} onSearchChange={() => {}} />
            
            <main className="flex-1 p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
                  <p className="text-muted-foreground">
                    Personalize a nomenclatura e templates de petições
                  </p>
                </motion.div>

                {/* Convenção de Nomes */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <Card className="bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileType className="w-5 h-5 text-primary" />
                        Convenção de Nomes
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Padrão de Nomenclatura</Label>
                          <Input
                            value={settings.naming.pattern}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              naming: { ...prev.naming, pattern: e.target.value }
                            }))}
                            className="rounded-2xl"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Formato de Data</Label>
                          <Input
                            value={settings.naming.dateFormat}
                            onChange={(e) => setSettings(prev => ({
                              ...prev,
                              naming: { ...prev.naming, dateFormat: e.target.value }
                            }))}
                            className="rounded-2xl"
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-6">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={settings.naming.uppercaseClient}
                            onCheckedChange={(checked) => setSettings(prev => ({
                              ...prev,
                              naming: { ...prev.naming, uppercaseClient: checked }
                            }))}
                          />
                          <Label>Cliente em maiúsculas</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={settings.naming.useUnderscores}
                            onCheckedChange={(checked) => setSettings(prev => ({
                              ...prev,
                              naming: { ...prev.naming, useUnderscores: checked }
                            }))}
                          />
                          <Label>Usar underscores</Label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Templates de Petição */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <Card className="bg-card/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-primary" />
                        Template de Petição
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Template Base</Label>
                        <Textarea
                          value={settings.petition.template}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            petition: { ...prev.petition, template: e.target.value }
                          }))}
                          className="min-h-64 font-mono text-sm rounded-2xl"
                          placeholder="Digite seu template..."
                        />
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={settings.petition.autoExtractFacts}
                          onCheckedChange={(checked) => setSettings(prev => ({
                            ...prev,
                            petition: { ...prev.petition, autoExtractFacts: checked }
                          }))}
                        />
                        <Label>Extração automática de fatos</Label>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Ações */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="flex gap-4 justify-end"
                >
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="rounded-2xl"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Restaurar Padrão
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="bg-gradient-primary rounded-2xl"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Configurações
                  </Button>
                </motion.div>
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default Settings;