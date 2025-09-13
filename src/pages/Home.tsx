import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { ThemeProvider } from "next-themes";
import { AppSidebar } from "@/components/AppSidebar";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wand2, Folder, FileText, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { GenerateModal } from "@/components/GenerateModal";
import { useFoldersReal } from "@/hooks/useFoldersReal";
import { useDocuments } from "@/hooks/useDocuments";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { PetitionService } from "@/services/petitionService";

const Home = () => {
  const [openGenerate, setOpenGenerate] = useState(false);
  const { data: foldersData = [] } = useFoldersReal();
  const { data: documentsData = [] } = useDocuments();
  const folders: any[] = (foldersData as any[]) || [];
  const documents: any[] = (documentsData as any[]) || [];
  const { data: petitions = [] } = useQuery({ queryKey: ['petitions-home'], queryFn: () => PetitionService.getPetitions() });

  const clientsCount = useMemo(() => folders.filter((f: any) => f.kind === 'client').length, [folders]);
  const documentsCount = useMemo(() => documents.length, [documents]);
  const generatedCount = useMemo(() => (petitions as any[]).length, [petitions]);

  const docsPerClient = useMemo(() => {
    const map = new Map<string, number>();
    documents.forEach((d: any) => {
      const key = d.clientId || 'sem-cliente';
      map.set(key, (map.get(key) || 0) + 1);
    });
    // map clientId to name and folderId (client folder)
    const clientInfoById = new Map<string, { name: string; folderId?: string }>();
    folders.filter((f: any) => f.kind === 'client').forEach((f: any) => {
      if (f.clientId) clientInfoById.set(f.clientId, { name: f.name, folderId: f.id });
    });
    const data = Array.from(map.entries()).map(([clientId, count]) => ({
      client: clientInfoById.get(clientId)?.name || 'Desconhecido',
      folderId: clientInfoById.get(clientId)?.folderId,
      count,
    }));
    // sort desc; mostrar todos
    data.sort((a, b) => b.count - a.count);
    return data;
  }, [documents, folders]);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-gradient-subtle">
          <Header searchQuery="" onSearchChange={() => {}} showGenerateButton={false} />

          <main className="flex-1 p-6">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-3">
                <Button
                  onClick={() => setOpenGenerate(true)}
                  className="w-full h-14 text-lg bg-teal-600 hover:bg-teal-700 rounded-2xl"
                >
                  GERAR
                  <Wand2 className="w-5 h-5 ml-2" />
                </Button>
              </div>

              {/* Notificações + Agenda (topo, conjunto) */}
              <Card className="bg-card/50 backdrop-blur-sm lg:col-span-3">
                <CardHeader>
                  <CardTitle>Notificações e Agenda</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium mb-2">Notificações</h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-2">
                          <div className="h-2 w-2 mt-2 rounded-full bg-teal-600" />
                          <div>
                            <div className="font-medium">Upload concluído</div>
                            <div className="text-sm text-muted-foreground">3 documentos processados com sucesso.</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="h-2 w-2 mt-2 rounded-full bg-yellow-500" />
                          <div>
                            <div className="font-medium">Aguardando extração</div>
                            <div className="text-sm text-muted-foreground">2 arquivos em processamento.</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="h-2 w-2 mt-2 rounded-full bg-red-500" />
                          <div>
                            <div className="font-medium">Erro no upload</div>
                            <div className="text-sm text-muted-foreground">1 arquivo falhou, tente novamente.</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium mb-2">Agenda</h4>
                      <div className="space-y-4">
                        <div>
                          <div className="text-teal-500 font-semibold">14 de mai.</div>
                          <div className="text-foreground">Revisar contrato</div>
                        </div>
                        <div>
                          <div className="text-teal-500 font-semibold">20 de mai.</div>
                          <div className="text-foreground">Audiência</div>
                        </div>
                        <div>
                          <div className="text-teal-500 font-semibold">30 de mai.</div>
                          <div className="text-foreground">Enviar relatório</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Folder className="w-4 h-4 text-teal-600" /> Clientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{clientsCount}</div>
                  <p className="text-sm text-muted-foreground mt-1">Total de clientes (pastas principais)</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><FileText className="w-4 h-4 text-teal-600" /> Documentos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{documentsCount}</div>
                  <p className="text-sm text-muted-foreground mt-1">Documentos cadastrados</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-teal-600" /> Gerados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold">{generatedCount}</div>
                  <p className="text-sm text-muted-foreground mt-1">Sínteses, procurações, contratos e petições</p>
                </CardContent>
              </Card>

              <Card className="bg-card/50 backdrop-blur-sm lg:col-span-3">
                <CardHeader>
                  <CardTitle>Documentos por cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{ count: { label: 'Docs', color: 'hsl(var(--primary))' } }}
                    className="h-80 w-full"
                  >
                    <BarChart data={docsPerClient} margin={{ top: 10, right: 10, left: 10, bottom: 50 }} barCategoryGap={"30%"}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis
                        dataKey="client"
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={-30}
                        textAnchor="end"
                        height={80}
                        tickMargin={12}
                        tickFormatter={(value) => (value.length > 14 ? value.slice(0, 14) + '…' : value)}
                      />
                      <YAxis allowDecimals={false} width={40} tickMargin={8} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="count"
                        fill="var(--color-count)"
                        radius={[8,8,0,0]}
                        barSize={28}
                        onClick={(_, index) => {
                          const item = docsPerClient[index];
                          if (item?.folderId) {
                            window.location.href = `/folders?folder=${item.folderId}`;
                          }
                        }}
                        cursor="pointer"
                      />
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            </div>
          </main>
          <GenerateModal open={openGenerate} onOpenChange={setOpenGenerate} />
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default Home;


