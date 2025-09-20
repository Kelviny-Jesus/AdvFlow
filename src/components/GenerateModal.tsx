import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PenLine, FileText, Handshake, ScrollText, ArrowLeft, Sparkles, Wand2, Folder as FolderIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useFoldersReal } from "@/hooks/useFoldersReal";
import { useDocumentsByFolder } from "@/hooks/useDocumentsByFolder";
import { factsAIService } from "@/services/factsAIService";
import { DocumentFolderService } from "@/services/documentFolderService";
import { FactStoreService } from "@/services/factStoreService";
import jsPDF from "jspdf";
import { playActionSfx } from "@/lib/sfx";

interface GenerateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateModal({ open, onOpenChange }: GenerateModalProps) {
  const navigate = useNavigate();
  const [active, setActive] = useState<"procuracao" | "resumo" | "contratos" | "peticoes" | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [subtype, setSubtype] = useState<string>("");
  const [prompt, setPrompt] = useState<string>("");
  const [docSearch, setDocSearch] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string>("");

  const { data: folders = [] } = useFoldersReal();
  const { data: docs = [] } = useDocumentsByFolder(selectedFolderId || null);

  const modeLabel = useMemo(() => {
    if (!active) return "";
    return active === "procuracao" ? "Procuração" : active === "resumo" ? "Síntese" : active === "contratos" ? "Contratos" : "Petições";
  }, [active]);

  const filteredDocs = useMemo(() => {
    return (docs as any[]).filter((d) => d.name.toLowerCase().includes(docSearch.toLowerCase()));
  }, [docs, docSearch]);

  const contextDocs = useMemo(() => {
    return filteredDocs.filter((d: any) => (d.appProperties && (d.appProperties as any).category) === 'context');
  }, [filteredDocs]);

  const regularDocs = useMemo(() => {
    return filteredDocs.filter((d: any) => !((d.appProperties && (d.appProperties as any).category) === 'context'));
  }, [filteredDocs]);

  const subtypeOptions = useMemo(() => {
    switch (active) {
      case "procuracao":
        return [
          "Ad Judicia (com reserva)",
          "Ad Judicia (sem reserva)",
          "Ad Negociate",
          "INPI",
          "INSS",
          "Custom",
        ];
      case "resumo":
        return ["Resumo completo detalhado", "Resumo executivo"];
      case "contratos":
        return ["Societário", "Imobiliário", "Prestação de serviços", "Contrato de honorários"];
      case "peticoes":
        return ["Petição inicial", "Recurso", "Contrarrazões", "Notificação extrajudicial"];
      default:
        return [];
    }
  }, [active]);

  const analyzeDocsAndSuggestPrompt = async () => {
    if (!selectedFolderId || selectedDocIds.length === 0) return;
    try {
      const selected = (docs as any[]).filter((d) => selectedDocIds.includes(d.id));
      const xml = await factsAIService.generatePromptSuggestion({
        mode: modeLabel || 'Synthesis',
        subType: subtype,
        userPrompt: prompt,
        clientId: selected[0]?.clientId || "",
        clientName: (folders as any[]).find((f) => f.id === selectedFolderId)?.name || "",
        caseReference: "",
        documentIds: selectedDocIds,
        documents: selected.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          docNumber: doc.docNumber,
          extractedData: doc.extractedData,
          type: doc.type,
          createdAt: doc.createdAt,
          isContext: !!(doc.appProperties && (doc.appProperties as any).category === 'context'),
        })),
      });
      setPrompt(xml);
    } catch (e) {
      setPrompt((prev) => prev || "Descreva aqui os detalhes para a geração.");
    }
  };

  const handleGenerate = async () => {
    if (!selectedFolderId || selectedDocIds.length === 0 || !active) return;
    setGenerating(true);
    try {
      const selected = (docs as any[]).filter((d) => selectedDocIds.includes(d.id));
      const text = await factsAIService.generateFacts({
        clientId: selected[0]?.clientId || "",
        clientName: (folders as any[]).find((f) => f.id === selectedFolderId)?.name || "",
        caseReference: "",
        documentIds: selectedDocIds,
        documents: selected.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          docNumber: doc.docNumber,
          extractedData: doc.extractedData,
          type: doc.type,
          createdAt: doc.createdAt,
          isContext: !!(doc.appProperties && (doc.appProperties as any).category === 'context'),
        })),
        userPrompt: prompt,
      });
      setResult(text);
      try { playActionSfx(); } catch {}
    } catch (e) {
      setResult("Erro ao gerar. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  };

  const safeFileName = (base: string, ext: string) =>
    `${base.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-${new Date().toISOString().slice(0,10)}.${ext}`;

  const downloadPdf = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 12;
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = margin;
    const lineHeight = 6;
    doc.setFont("courier", "normal");
    doc.setFontSize(11);
    const lines = result.split("\n");
    lines.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, doc.internal.pageSize.getWidth() - margin * 2);
      wrapped.forEach((w: string) => {
        if (y + lineHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(w, margin, y);
        y += lineHeight;
      });
    });
    doc.save(safeFileName(`gerar-${modeLabel || "documento"}`, "pdf"));
  };

  const downloadDocx = async () => {
    // Geração de DOCX manual (OpenXML) usando fflate para zipar
    // Importa fflate dinamicamente (ESM) — já usamos em outro serviço
    // @ts-ignore - dynamic import from CDN at runtime (no types)
    const fflate = await import(/* @vite-ignore */ "https://esm.sh/fflate@0.8.1");
    const { zipSync, strToU8 } = fflate as any;

    const esc = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const paragraphs = result
      .split("\n")
      .map(
        (line) =>
          `<w:p><w:r><w:t xml:space="preserve">${esc(line)}</w:t></w:r></w:p>`
      )
      .join("");

    const contentTypes =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
      `<Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
      `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>` +
      `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>` +
      `</Types>`;

    const rels =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>` +
      `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
      `<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>` +
      `</Relationships>`;

    const documentXml =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
      `<w:body>${paragraphs}<w:sectPr/></w:body>` +
      `</w:document>`;

    const styles =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
      `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>` +
      `</w:styles>`;

    const core =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/">` +
      `<dc:title>${esc(`Gerar ${modeLabel || 'Documento'}`)}</dc:title>` +
      `<dc:creator>AdvFlow</dc:creator>` +
      `</cp:coreProperties>`;

    const app =
      `<?xml version="1.0" encoding="UTF-8"?>` +
      `<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">` +
      `<Application>AdvFlow</Application>` +
      `</Properties>`;

    const files: Record<string, Uint8Array> = {
      "[Content_Types].xml": strToU8(contentTypes),
      "_rels/.rels": strToU8(rels),
      "word/document.xml": strToU8(documentXml),
      "word/styles.xml": strToU8(styles),
      "docProps/core.xml": strToU8(core),
      "docProps/app.xml": strToU8(app),
    };

    const zipped = zipSync(files, { level: 6 });
    const blob = new Blob([zipped], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = safeFileName(`gerar-${modeLabel || "documento"}`, "docx");
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const buildDocxBlob = async (): Promise<Blob> => {
    // reutiliza a geração OpenXML
    // @ts-ignore
    const fflate = await import(/* @vite-ignore */ "https://esm.sh/fflate@0.8.1");
    const { zipSync, strToU8 } = fflate as any;
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const paragraphs = result.split("\n").map((line) => `<w:p><w:r><w:t xml:space=\"preserve\">${esc(line)}</w:t></w:r></w:p>`).join("");
    const files: Record<string, Uint8Array> = {
      "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`),
      "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`),
      "word/document.xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr/></w:body></w:document>`),
      "word/styles.xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>`),
      "docProps/core.xml": strToU8(`<?xml version=\"1.0\" encoding=\"UTF-8\"?><cp:coreProperties xmlns:cp=\"http://schemas.openxmlformats.org/package/2006/metadata/core-properties\" xmlns:dc=\"http://purl.org/dc/elements/1.1/\"><dc:title>${esc(`Gerar ${modeLabel || 'Documento'}`)}</dc:title><dc:creator>AdvFlow</dc:creator></cp:coreProperties>`),
      "docProps/app.xml": strToU8(`<?xml version=\"1.0\" encoding=\"UTF-8\"?><Properties xmlns=\"http://schemas.openxmlformats.org/officeDocument/2006/extended-properties\"><Application>AdvFlow</Application></Properties>`),
    };
    const zipped = zipSync(files, { level: 6 });
    return new Blob([zipped], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  };

  const handleSave = async () => {
    if (!result || !selectedFolderId) return;
    try {
      const folder = (folders as any[]).find((f) => f.id === selectedFolderId);
      if (!folder) return;
      const blob = await buildDocxBlob();
      const today = new Date().toISOString().slice(0,10);
      const clientName = folder.name || 'Cliente';
      const display = `${modeLabel || 'Documento'} - ${clientName} - ${today}.docx`;
      const storageName = safeFileName(`${modeLabel || 'documento'}-gerado`, 'docx');
      const saved = await DocumentFolderService.saveGeneratedDocxToFolder(folder, blob, storageName, display);
      const allDocIds = [saved.id, ...selectedDocIds];
      await FactStoreService.saveSynthesisFact(result, allDocIds);
    } catch (e) {
      console.error(e);
    }
  };

  const Card = ({
    icon: Icon,
    label,
    onClick,
  }: {
    icon: any;
    label: string;
    onClick: () => void;
  }) => (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn(
        "h-[16.8rem] w-full flex flex-col items-center justify-center gap-5",
        "rounded-2xl border-2 border-teal-700/40 hover:border-teal-600"
      )}
    >
      <Icon className="w-[7.5rem] h-[7.5rem] text-teal-600" strokeWidth={2.75} />
      <span className="text-2xl font-semibold">{label}</span>
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl">
        <DialogHeader>
          <div className="relative">
            {active && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { if (result) { setResult(""); return; } setActive(null); }}
                className="absolute left-0 top-1/2 -translate-y-1/2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <DialogTitle className="text-center uppercase tracking-wide">
              {active ? `Gerar ${modeLabel}` : "ESCOLHA O QUE DESEJA GERAR"}
            </DialogTitle>
          </div>
        </DialogHeader>

        {!active ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card icon={PenLine} label="PROCURAÇÃO" onClick={() => setActive("procuracao")} />
            <Card icon={FileText} label="SÍNTESE" onClick={() => setActive("resumo")} />
            <Card icon={Handshake} label="CONTRATOS" onClick={() => setActive("contratos")} />
            <Card icon={ScrollText} label="PETIÇÕES" onClick={() => setActive("peticoes")} />
          </div>
        ) : result ? (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card/50 p-3">
              <Label>{`Resultado da ${modeLabel}`}</Label>
              <Textarea value={result} onChange={(e) => setResult(e.target.value)} className="min-h-[420px] mt-2" />
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => { navigator.clipboard.writeText(result); }}>Copiar</Button>
              <Button variant="outline" onClick={downloadDocx}>DOCX</Button>
              <Button variant="outline" onClick={downloadPdf}>PDF</Button>
              <Button onClick={handleSave}>Salvar</Button>
              <Button onClick={() => onOpenChange(false)}>Fechar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-3 rounded-2xl border bg-card/50 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FolderIcon className="w-4 h-4 text-teal-600" />
                    <Label>Escolha a pasta</Label>
                  </div>
                  {selectedDocIds.length > 0 && (
                    <Badge variant="secondary" className="rounded-full">{selectedDocIds.length} docs</Badge>
                  )}
                </div>
                <Select value={selectedFolderId} onValueChange={(v) => { setSelectedFolderId(v); setSelectedDocIds([]); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma pasta" />
                  </SelectTrigger>
                  <SelectContent>
                    {(folders as any[]).map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedFolderId && (
                  <div className="space-y-2">
                    <Input value={docSearch} onChange={(e) => setDocSearch(e.target.value)} placeholder="Buscar documentos..." className="h-8" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Selecione os documentos</span>
                      <button
                        className="underline hover:text-foreground"
                        onClick={() =>
                          setSelectedDocIds((prev) => {
                            const allIds = (docs as any[]).map((d) => d.id);
                            const isAll = prev.length === allIds.length;
                            return isAll ? [] : allIds;
                          })
                        }
                      >
                        {selectedDocIds.length === (docs as any[]).length ? "Limpar" : "Selecionar todos"}
                      </button>
                    </div>
                    <div className="mt-1 space-y-3 max-h-56 overflow-auto border rounded-md p-2">
                      {/* Contextos */}
                      <div>
                        <div className="text-[11px] uppercase text-muted-foreground mb-1">Contextos</div>
                        <div className="space-y-1">
                          {contextDocs.length === 0 ? (
                            <div className="text-xs text-muted-foreground">Nenhum contexto nesta pasta</div>
                          ) : (
                            contextDocs.map((d: any) => (
                              <label key={d.id} className="flex items-center gap-2 text-sm">
                                <Checkbox
                                  checked={selectedDocIds.includes(d.id)}
                                  onCheckedChange={(c) => {
                                    setSelectedDocIds((prev) => (c ? [...prev, d.id] : prev.filter((x) => x !== d.id)));
                                  }}
                                />
                                <span className="truncate">{d.name}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                      {/* Documentos */}
                      <div>
                        <div className="text-[11px] uppercase text-muted-foreground mb-1">Documentos</div>
                        <div className="space-y-1">
                          {regularDocs.length === 0 ? (
                            <div className="text-xs text-muted-foreground">Nenhum documento nesta pasta</div>
                          ) : (
                            regularDocs.map((d: any) => (
                              <label key={d.id} className="flex items-center gap-2 text-sm">
                                <Checkbox
                                  checked={selectedDocIds.includes(d.id)}
                                  onCheckedChange={(c) => {
                                    setSelectedDocIds((prev) => (c ? [...prev, d.id] : prev.filter((x) => x !== d.id)));
                                  }}
                                />
                                <span className="truncate">{d.name}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-2xl border bg-card/50 p-3">
                <Label>{active === "peticoes" ? "Tipo de petição" : active === "resumo" ? "Tipo de resumo" : active === "contratos" ? "Tipo de contrato" : "Tipo de procuração"}</Label>
                <Select value={subtype} onValueChange={setSubtype}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {subtypeOptions.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Defina o formato alvo para a geração.</p>
              </div>

              <div className="space-y-3 rounded-2xl border bg-card/50 p-3">
                <div className="flex items-center justify-between">
                  <Label>Prompt</Label>
                  <Badge variant="outline" className="cursor-default">Dica</Badge>
                </div>
                <Textarea
                  placeholder="Detalhe o que deseja gerar, restrições e formato do output..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-36"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <Button variant="outline" onClick={analyzeDocsAndSuggestPrompt} disabled={!selectedFolderId || selectedDocIds.length === 0}>
                <Sparkles className="w-4 h-4 mr-2" /> ANALISAR DOCS e Sugerir prompt
              </Button>
              <Button onClick={handleGenerate} disabled={generating || !selectedFolderId || selectedDocIds.length === 0}>
                {generating ? "GERANDO..." : "GERAR"} <Wand2 className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


