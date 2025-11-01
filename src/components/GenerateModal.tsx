import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PenLine, FileText, Handshake, ScrollText, ArrowLeft, Sparkles, Wand2, Folder as FolderIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useMemo, useRef, useState, useEffect } from "react";
import { useFoldersReal } from "@/hooks/useFoldersReal";
import { useDocumentsByFolder } from "@/hooks/useDocumentsByFolder";
import { factsAIService } from "@/services/factsAIService";
import { DocumentFolderService } from "@/services/documentFolderService";
import { FactStoreService } from "@/services/factStoreService";
import jsPDF from "jspdf";
import { renderPdfFirstPageToPng } from "@/lib/pdfUtils";
import { getUserPrefs, mapJsPdfFontFamily, getDocxFontFamily, pointsToHalfPoints, lineSpacingToTwips, cssFontStackFromFamily } from "@/lib/userPrefs";
import { playActionSfx } from "@/lib/sfx";
import { getCloudUserPrefs } from "@/services/userPrefsService";
 

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
  const [progress, setProgress] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [estimatedTimeSeconds, setEstimatedTimeSeconds] = useState(0);

  const { data: folders = [] } = useFoldersReal();
  const { data: docs = [] } = useDocumentsByFolder(selectedFolderId || null);

  // Preferências (carregar do Supabase ao abrir)
  const prefsRef = useRef(getUserPrefs());
  useEffect(() => {
    if (!open) return;
    (async () => {
      const cloud = await getCloudUserPrefs();
      if (cloud) {
        prefsRef.current = { ...prefsRef.current, ...cloud } as any;
      }
    })();
  }, [open]);

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
          "Ad Judicia",
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
        mode: active || 'resumo',
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
    setProgress(0);
    setCurrentChunk(0);
    setTotalChunks(0);
    setEstimatedTimeSeconds(0);

    try {
      const prefs = getUserPrefs();
      const selected = (docs as any[]).filter((d) => selectedDocIds.includes(d.id));
      let extraContextDocs: any[] = [];
      if (prefs.ragEnabled) {
        const contexts = contextDocs;
        const remaining = Math.max(0, (prefs.ragTopK || 0) - contexts.length);
        const others = regularDocs
          .filter((d: any) => !selectedDocIds.includes(d.id))
          .sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''))
          .slice(0, remaining);
        extraContextDocs = [...contexts, ...others];
      }
      const text = await factsAIService.generateFacts({
        clientId: selected[0]?.clientId || "",
        clientName: (folders as any[]).find((f) => f.id === selectedFolderId)?.name || "",
        caseReference: "",
        documentIds: selectedDocIds,
        documents: [
          ...selected.map((doc: any) => ({
          id: doc.id,
          name: doc.name,
          docNumber: doc.docNumber,
          extractedData: doc.extractedData,
          type: doc.type,
          createdAt: doc.createdAt,
            isContext: !!(doc.appProperties && (doc.appProperties as any).category === 'context'),
          })),
          ...extraContextDocs.map((doc: any) => ({
            id: doc.id,
            name: doc.name,
            docNumber: doc.docNumber,
            extractedData: doc.extractedData,
            type: doc.type,
            createdAt: doc.createdAt,
            isContext: true,
          })),
        ],
        mode: active,
        subType: subtype,
        userPrompt: prompt,
        onProgress: (chunk, total, estimatedSeconds) => {
          setCurrentChunk(chunk);
          setTotalChunks(total);
          setProgress(Math.floor((chunk / total) * 100));
          setEstimatedTimeSeconds(estimatedSeconds);
        },
      });
      setResult(text);
      setProgress(100);
      try { playActionSfx(); } catch {}
    } catch (e) {
      setResult("Erro ao gerar. Tente novamente.");
    } finally {
      setGenerating(false);
      setProgress(0);
      setCurrentChunk(0);
      setTotalChunks(0);
      setEstimatedTimeSeconds(0);
    }
  };

  const safeFileName = (base: string, ext: string) =>
    `${base.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-${new Date().toISOString().slice(0,10)}.${ext}`;

  const downloadPdf = async () => {
    const prefs = prefsRef.current || getUserPrefs();
    const jsFont = mapJsPdfFontFamily(prefs.docFontFamily);
    const fontSize = Math.max(8, Math.min(24, prefs.docFontSize));
    const spacingMult = prefs.docLineSpacing || 1.5;

    // Tentar via pdf-lib para suportar template PDF e assinatura com mais confiabilidade
    try {
      // @ts-ignore - dynamic ESM import from CDN for client-side usage
      const pdfLib = await import(/* @vite-ignore */ 'https://esm.sh/pdf-lib@1.17.1');
      const { PDFDocument, StandardFonts, rgb } = pdfLib as any;
      console.info('[PDF] Using pdf-lib path');
      const pdfDoc = await PDFDocument.create();
      const fontMap: Record<string, string> = { times: 'TimesRoman', helvetica: 'Helvetica', courier: 'Courier' };
      const selected = jsFont; // times | helvetica | courier
      const font = await pdfDoc.embedFont((StandardFonts as any)[fontMap[selected]]);
      const mmToPt = (mm: number) => (mm * 72) / 25.4;
      // Zonas seguras (ajustáveis)
      const leftMarginPt = mmToPt(20);
      const rightMarginPt = mmToPt(20);
      const headerHeightPt = mmToPt(35); // reserva para logo/cabeçalho
      const footerHeightPt = mmToPt(30); // reserva para rodapé
      const topPaddingPt = mmToPt(4);
      const contentStartYPt = (height: number) => height - headerHeightPt - topPaddingPt;
      const contentBottomYPt = footerHeightPt + mmToPt(6);
      const fontSizePt = fontSize; // já está em pt
      const lineHeightPt = fontSizePt * spacingMult * 1.1;

      // Recursos do usuário
      const cloud = await getCloudUserPrefs();
      console.info('[PDF] user prefs assets', { hasLetterhead: !!(cloud as any)?.letterheadUrl, hasSignature: !!(cloud as any)?.signatureUrl });
      let templateDoc: any = null;
      if ((cloud as any)?.letterheadUrl) {
        try {
          const arr = await (await fetch((cloud as any).letterheadUrl, { cache: 'no-store' })).arrayBuffer();
          console.info('[PDF] fetched letterhead bytes', (arr as ArrayBuffer).byteLength);
          templateDoc = await PDFDocument.load(arr);
        } catch (err) {
          console.warn('[PDF] failed to load letterhead', err);
        }
      }
      let signatureImg: any = null;
      if ((cloud as any)?.signatureUrl) {
        try {
          const sigRes = await fetch((cloud as any).signatureUrl, { cache: 'no-store' });
          const buf = await sigRes.arrayBuffer();
          const mime = sigRes.headers.get('content-type') || '';
          const urlLower = ((cloud as any).signatureUrl as string).toLowerCase();
          if (mime.includes('png') || urlLower.endsWith('.png')) {
            signatureImg = await pdfDoc.embedPng(buf);
            console.info('[PDF] embedded signature (png)');
          } else if (mime.includes('jpg') || mime.includes('jpeg') || urlLower.endsWith('.jpg') || urlLower.endsWith('.jpeg')) {
            signatureImg = await pdfDoc.embedJpg(buf);
            console.info('[PDF] embedded signature (jpg)');
          } else {
            // tentar png por padrão
            try {
              signatureImg = await pdfDoc.embedPng(buf);
              console.info('[PDF] embedded signature (png fallback)');
            } catch (err2) {
              signatureImg = await pdfDoc.embedJpg(buf);
              console.info('[PDF] embedded signature (jpg fallback)');
            }
          }
        } catch (err) {
          console.warn('[PDF] failed to load signature', err);
        }
      }

      // Helpers
      const addTemplatePage = async () => {
        if (templateDoc) {
          const [tpl] = await pdfDoc.copyPages(templateDoc, [0]);
          pdfDoc.addPage(tpl);
          return pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
        }
        return pdfDoc.addPage([mmToPt(210), mmToPt(297)]);
      };

      let page = await addTemplatePage();
      let { width, height } = page.getSize();
      let cursorY = contentStartYPt(height);

      const writeLine = async (text: string) => {
        if (!text) return;
        if (cursorY - lineHeightPt < contentBottomYPt) {
          page = await addTemplatePage();
          ({ width, height } = page.getSize());
          cursorY = contentStartYPt(height);
        }
        page.drawText(text, { x: leftMarginPt, y: cursorY - lineHeightPt, size: fontSizePt, font, color: rgb(0, 0, 0) });
        cursorY -= lineHeightPt;
      };

      const paragraphs = result.split('\n');
      for (const para of paragraphs) {
        const maxWidth = width - (leftMarginPt + rightMarginPt);
        let line = '';
        for (const word of para.split(' ')) {
          const test = line ? `${line} ${word}` : word;
          const testWidth = font.widthOfTextAtSize(test, fontSizePt);
          if (testWidth <= maxWidth) {
            line = test;
          } else {
            await writeLine(line);
            line = word;
          }
        }
        await writeLine(line);
      }

      // Assinatura
      if (signatureImg) {
        const wPt = mmToPt(45);
        const hPt = (signatureImg.height / signatureImg.width) * wPt;
        const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];
        // posiciona a assinatura dentro da área do rodapé
        lastPage.drawImage(signatureImg, { x: leftMarginPt, y: mmToPt(18), width: wPt, height: hPt });
      }

      const bytes = await pdfDoc.save();
      console.info('[PDF] pdf-lib generated bytes', bytes.byteLength);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = safeFileName(`gerar-${modeLabel || 'documento'}`, 'pdf');
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      return;
    } catch (e) {
      console.warn('[PDF] pdf-lib path failed, falling back to jsPDF', e);
    }

    // Fallback: jsPDF (mantém comportamento anterior)
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const marginMm = 12;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const baseLine = (6 / 11) * fontSize;
    const lineHeight = baseLine * spacingMult;
    doc.setFont(jsFont, 'normal');
    doc.setFontSize(fontSize);
    let y = marginMm;
    const lines = result.split('\n');
    lines.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, pageWidth - marginMm * 2);
      wrapped.forEach((w: string) => {
        if (y + lineHeight > pageHeight - marginMm) { doc.addPage(); y = marginMm; }
        doc.text(w, marginMm, y); y += lineHeight;
      });
    });
    doc.save(safeFileName(`gerar-${modeLabel || 'documento'}`, 'pdf'));
  };

  const downloadDocx = async () => {
    const prefs = prefsRef.current || getUserPrefs();
    const font = getDocxFontFamily(prefs.docFontFamily);
    const fontHalfPoints = pointsToHalfPoints(Math.max(8, Math.min(24, prefs.docFontSize)));
    const lineTwips = lineSpacingToTwips(prefs.docLineSpacing);
    // Carregar assets do usuário (timbrado e assinatura)
    const cloud = await getCloudUserPrefs();
    console.info('[DOCX] user prefs assets', { hasLetterhead: !!(cloud as any)?.letterheadUrl, hasSignature: !!(cloud as any)?.signatureUrl });
    const fetchAsUint8 = async (url: string) => new Uint8Array(await (await fetch(url)).arrayBuffer());
    const dataUrlToUint8 = (dataUrl: string) => {
      const b64 = dataUrl.split(',')[1];
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    };
    let letterheadImg: Uint8Array | null = null;
    let letterheadExt: 'png' | 'jpg' = 'png';
    let templateDocxBytes: Uint8Array | null = null;
    if ((cloud as any)?.letterheadUrl) {
      try {
        const pngDataUrl = await renderPdfFirstPageToPng((cloud as any).letterheadUrl, 2);
        letterheadImg = dataUrlToUint8(pngDataUrl);
        letterheadExt = 'png';
        console.info('[DOCX] rendered letterhead from PDF');
      } catch (err) {
        console.warn('[DOCX] failed to render letterhead to PNG', err);
        // fallback: se URL for imagem direta, usa bytes
        try {
          const res = await fetch((cloud as any).letterheadUrl, { cache: 'no-store' });
          const ct = res.headers.get('content-type') || '';
          const buf = new Uint8Array(await res.arrayBuffer());
          if (ct.includes('vnd.openxmlformats-officedocument.wordprocessingml.document') || (cloud as any).letterheadUrl.toLowerCase().endsWith('.docx')) {
            templateDocxBytes = buf; // usar DOCX como template base
            console.info('[DOCX] using DOCX template as letterhead');
          } else if (ct.includes('jpeg') || ct.includes('jpg') || (cloud as any).letterheadUrl.toLowerCase().endsWith('.jpg') || (cloud as any).letterheadUrl.toLowerCase().endsWith('.jpeg')) {
            letterheadImg = buf; letterheadExt = 'jpg';
          } else if (ct.includes('png') || (cloud as any).letterheadUrl.toLowerCase().endsWith('.png')) {
            letterheadImg = buf; letterheadExt = 'png';
          }
          if (letterheadImg) console.info('[DOCX] using letterhead image from URL ext', letterheadExt);
        } catch (err2) { console.warn('[DOCX] failed to fetch letterhead as image', err2); }
      }
    }
    let signatureImg: Uint8Array | null = null;
    let signatureExt: 'png' | 'jpg' = 'png';
    if ((cloud as any)?.signatureUrl) {
      try {
        const res = await fetch((cloud as any).signatureUrl, { cache: 'no-store' });
        const ct = res.headers.get('content-type') || '';
        const buf = new Uint8Array(await res.arrayBuffer());
        signatureImg = buf;
        if (ct.includes('jpeg') || ct.includes('jpg') || (cloud as any).signatureUrl.toLowerCase().endsWith('.jpg') || (cloud as any).signatureUrl.toLowerCase().endsWith('.jpeg')) signatureExt = 'jpg';
        else signatureExt = 'png';
        console.info('[DOCX] fetched signature bytes', signatureImg?.byteLength, 'ext', signatureExt);
      } catch (err) { console.warn('[DOCX] failed to fetch signature', err); }
    }

    // Geração de DOCX manual (OpenXML) usando fflate para zipar
    // Importa fflate dinamicamente (ESM) — já usamos em outro serviço
    // @ts-ignore - dynamic import from CDN at runtime (no types)
    const fflate = await import(/* @vite-ignore */ "https://esm.sh/fflate@0.8.1");
    const { zipSync, unzipSync, strToU8 } = fflate as any;

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
      `<Default Extension="png" ContentType="image/png"/>` +
      `<Default Extension="jpg" ContentType="image/jpeg"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>` +
      `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>` +
      `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>` +
      (letterheadImg ? `<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>` : '') +
      (signatureImg ? `<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>` : '') +
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
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
      `<w:body>${paragraphs}<w:sectPr>` +
      `<w:pgMar w:top="1134" w:bottom="1134" w:left="1134" w:right="1134"/>` +
      (letterheadImg ? `<w:headerReference w:type="default" r:id="rHdr1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>` : '') +
      (signatureImg ? `<w:footerReference w:type="default" r:id="rFtr1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>` : '') +
      `</w:sectPr></w:body>` +
      `</w:document>`;

    const styles =
      `<?xml version=\"1.0\" encoding=\"UTF-8\"?>` +
      `<w:styles xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\">` +
      `<w:docDefaults>` +
      `<w:rPrDefault><w:rPr>` +
      `<w:rFonts w:ascii=\"${font}\" w:hAnsi=\"${font}\" w:cs=\"${font}\"/>` +
      `<w:sz w:val=\"${fontHalfPoints}\"/><w:szCs w:val=\"${fontHalfPoints}\"/>` +
      `</w:rPr></w:rPrDefault>` +
      `<w:pPrDefault><w:pPr><w:spacing w:line=\"${lineTwips}\" w:lineRule=\"auto\"/></w:pPr></w:pPrDefault>` +
      `</w:docDefaults>` +
      `<w:style w:type=\"paragraph\" w:default=\"1\" w:styleId=\"Normal\">` +
      `<w:name w:val=\"Normal\"/>` +
      `<w:rPr><w:rFonts w:ascii=\"${font}\" w:hAnsi=\"${font}\" w:cs=\"${font}\"/><w:sz w:val=\"${fontHalfPoints}\"/><w:szCs w:val=\"${fontHalfPoints}\"/></w:rPr>` +
      `<w:pPr><w:spacing w:lineRule=\"auto\" w:line=\"${lineTwips}\"/></w:pPr>` +
      `</w:style>` +
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

    const headerXml = letterheadImg ? `<?xml version=\"1.0\" encoding=\"UTF-8\"?><w:hdr xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" xmlns:wp=\"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing\" xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" xmlns:pic=\"http://schemas.openxmlformats.org/drawingml/2006/picture\"><w:p><w:r><w:drawing><wp:inline distT=\"0\" distB=\"0\" distL=\"0\" distR=\"0\"><wp:extent cx=\"11906000\" cy=\"1800000\"/><wp:effectExtent l=\"0\" t=\"0\" r=\"0\" b=\"0\"/><wp:docPr id=\"1\" name=\"Letterhead\"/><a:graphic><a:graphicData uri=\"http://schemas.openxmlformats.org/drawingml/2006/picture\"><pic:pic><pic:nvPicPr><pic:cNvPr id=\"0\" name=\"header\"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed=\"rIdImageHeader\"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm/><a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p></w:hdr>` : '';
    const footerXml = signatureImg ? `<?xml version=\"1.0\" encoding=\"UTF-8\"?><w:ftr xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\" xmlns:r=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships\" xmlns:wp=\"http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing\" xmlns:a=\"http://schemas.openxmlformats.org/drawingml/2006/main\" xmlns:pic=\"http://schemas.openxmlformats.org/drawingml/2006/picture\"><w:p><w:r><w:drawing><wp:inline distT=\"0\" distB=\"0\" distL=\"0\" distR=\"0\"><wp:extent cx=\"2400000\" cy=\"800000\"/><wp:effectExtent l=\"0\" t=\"0\" r=\"0\" b=\"0\"/><wp:docPr id=\"2\" name=\"Signature\"/><a:graphic><a:graphicData uri=\"http://schemas.openxmlformats.org/drawingml/2006/picture\"><pic:pic><pic:nvPicPr><pic:cNvPr id=\"0\" name=\"signature\"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed=\"rIdImageSignature\"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm/><a:prstGeom prst=\"rect\"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p></w:ftr>` : '';

    // Se o template for um DOCX, usamos como base e substituímos document.xml e styles.xml
    if (templateDocxBytes) {
      const templateZip = unzipSync(templateDocxBytes);
      // sobrescrever document.xml e styles.xml
      templateZip['word/document.xml'] = strToU8(documentXml);
      templateZip['word/styles.xml'] = strToU8(styles);
      const zipped = zipSync(templateZip, { level: 6 });
      const blob = new Blob([zipped], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = safeFileName(`gerar-${modeLabel || 'documento'}`, 'docx');
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      return;
    }

    const files: Record<string, Uint8Array> = {
      "[Content_Types].xml": strToU8(contentTypes),
      "_rels/.rels": strToU8(rels),
      "word/document.xml": strToU8(documentXml),
      "word/styles.xml": strToU8(styles),
      // document rels (styles, header/footer)
      "word/_rels/document.xml.rels": strToU8(
        `<?xml version="1.0" encoding="UTF-8"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
        (letterheadImg ? `<Relationship Id="rHdr1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>` : '') +
        (signatureImg ? `<Relationship Id="rFtr1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>` : '') +
        `</Relationships>`
      ),
      ...(letterheadImg ? { "word/header1.xml": strToU8(headerXml) } : {}),
      ...(signatureImg ? { "word/footer1.xml": strToU8(footerXml) } : {}),
      "docProps/core.xml": strToU8(core),
      "docProps/app.xml": strToU8(app),
    };

    // header/footer rels e mídia
    if (letterheadImg) {
      (files as any)["word/_rels/header1.xml.rels"] = strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdImageHeader" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/letterhead.${letterheadExt}"/></Relationships>`);
      (files as any)["word/media/letterhead." + letterheadExt] = letterheadImg;
    }
    if (signatureImg) {
      (files as any)["word/_rels/footer1.xml.rels"] = strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdImageSignature" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/signature.${signatureExt}"/></Relationships>`);
      (files as any)["word/media/signature." + signatureExt] = signatureImg;
    }

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
    const prefs = prefsRef.current || getUserPrefs();
    const font = getDocxFontFamily(prefs.docFontFamily);
    const fontHalfPoints = pointsToHalfPoints(Math.max(8, Math.min(24, prefs.docFontSize)));
    const lineTwips = lineSpacingToTwips(prefs.docLineSpacing);
    // reutiliza a geração OpenXML
    // @ts-ignore
    const fflate = await import(/* @vite-ignore */ "https://esm.sh/fflate@0.8.1");
    const { zipSync, strToU8 } = fflate as any;
    const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const paragraphs = result.split("\n").map((line) => `<w:p><w:r><w:t xml:space=\"preserve\">${esc(line)}</w:t></w:r></w:p>`).join("");
    const stylesXml = `<?xml version=\"1.0\" encoding=\"UTF-8\"?><w:styles xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii=\"${font}\" w:hAnsi=\"${font}\" w:cs=\"${font}\"/><w:sz w:val=\"${fontHalfPoints}\"/><w:szCs w:val=\"${fontHalfPoints}\"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:line=\"${lineTwips}\" w:lineRule=\"auto\"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type=\"paragraph\" w:default=\"1\" w:styleId=\"Normal\"><w:name w:val=\"Normal\"/><w:rPr><w:rFonts w:ascii=\"${font}\" w:hAnsi=\"${font}\" w:cs=\"${font}\"/><w:sz w:val=\"${fontHalfPoints}\"/><w:szCs w:val=\"${fontHalfPoints}\"/></w:rPr><w:pPr><w:spacing w:lineRule=\"auto\" w:line=\"${lineTwips}\"/></w:pPr></w:style></w:styles>`;

    const files: Record<string, Uint8Array> = {
      "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`),
      "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`),
      "word/document.xml": strToU8(`<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr/></w:body></w:document>`),
      "word/styles.xml": strToU8(stylesXml),
      "word/_rels/document.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`),
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
              <Textarea 
                value={result}
                onChange={(e) => setResult(e.target.value)}
                className="min-h-[420px] mt-2"
                style={{
                  fontFamily: cssFontStackFromFamily((prefsRef.current?.docFontFamily) || 'Times New Roman'),
                  lineHeight: String((prefsRef.current?.docLineSpacing) || 1.5),
                  fontSize: `${Math.max(8, Math.min(24, prefsRef.current?.docFontSize || 12))}pt`,
                }}
              />
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
                <div className="flex justify-end">
                  <Button variant="outline" onClick={analyzeDocsAndSuggestPrompt} disabled={!selectedFolderId || selectedDocIds.length === 0}>
                    <Sparkles className="w-4 h-4 mr-2" /> Melhore seu prompt
                  </Button>
                </div>
              </div>
            </div>

            {generating && totalChunks > 0 && (
              <div className="space-y-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Processando... isso pode levar alguns minutos
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-end text-xs text-blue-700 dark:text-blue-300">
                    <span>
                      {progress}% concluído
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-4">
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


