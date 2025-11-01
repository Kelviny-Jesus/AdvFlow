import express from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PDFDocument, rgb } from 'pdf-lib';
import vision from '@google-cloud/vision';
import { Storage } from '@google-cloud/storage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Garantir GOOGLE_APPLICATION_CREDENTIALS apontando para a chave local por padrão
try {
  const defaultSaPath = path.resolve(__dirname, '../keys/vision-sa.json');
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS || !existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)) {
    if (existsSync(defaultSaPath)) {
      process.env.GOOGLE_APPLICATION_CREDENTIALS = defaultSaPath;
      // eslint-disable-next-line no-console
      console.log('[OCR] Using default service account at', defaultSaPath);
    }
  }
} catch {}

const upload = multer({
  dest: '/tmp/uploads/',
  // Aumentar limite para acomodar imagens maiores
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Aceitar qualquer imagem suportada pelo Vision (jpeg, png, webp, tiff, heic, heif, bmp, gif, etc.)
    if ((file.mimetype || '').toLowerCase().startsWith('image/')) return cb(null, true);
    cb(new Error('Tipo de arquivo não suportado. Envie uma imagem.'));
  },
});

const uploadPdf = multer({
  dest: '/tmp/uploads/',
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Tipo de arquivo não suportado. Envie um PDF.'));
  },
});

// ENDPOINT DESABILITADO - NÃO USADO MAIS
// A conversão de imagem para PDF agora é feita no frontend (jsPDF)
// Use /extract-text para extrair texto de imagens
/*
router.post('/convert-image-to-pdf', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo de imagem fornecido' });

  const tempFilePath = req.file.path;
  try {
    const imageBuffer = await fs.readFile(tempFilePath);
    const base64Image = imageBuffer.toString('base64');

    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GOOGLE_VISION_API_KEY ausente' });

    const resp = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Image },
          features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
          imageContext: { languageHints: ['pt-BR', 'pt', 'en'] },
        }],
      }),
    });

    if (!resp.ok) throw new Error(`Google Vision API erro: ${resp.status} ${resp.statusText}`);
    const data = await resp.json();
    const rawText = data?.responses?.[0]?.textAnnotations?.[0]?.description || '';
    const extractedText = sanitizeForPdf(rawText);
    if (!extractedText.trim()) {
      return res.status(400).json({ error: 'Nenhum texto foi detectado na imagem', extractedText: '' });
    }

    const pdfDoc = await PDFDocument.create();

    // PÁGINA 1: Embedar imagem original
    let embeddedImage;
    const mimeType = (req.file.mimetype || '').toLowerCase();

    try {
      if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
        embeddedImage = await pdfDoc.embedJpg(imageBuffer);
      } else if (mimeType === 'image/png') {
        embeddedImage = await pdfDoc.embedPng(imageBuffer);
      } else {
        // Fallback: tentar como JPEG
        embeddedImage = await pdfDoc.embedJpg(imageBuffer);
      }

      // Criar página com dimensões da imagem
      const imgWidth = embeddedImage.width;
      const imgHeight = embeddedImage.height;
      const imagePage = pdfDoc.addPage([imgWidth, imgHeight]);

      // Desenhar imagem em tamanho real
      imagePage.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width: imgWidth,
        height: imgHeight,
      });
    } catch (imageError) {
      // eslint-disable-next-line no-console
      console.error('Erro ao embedar imagem no PDF:', imageError);
      // Continuar mesmo assim e criar apenas página de texto
    }

    // PÁGINA 2: Texto extraído do OCR
    let page = pdfDoc.addPage();
    let { width, height } = page.getSize();
    const fontSize = 11;
    const lineHeight = 14;
    const margin = 50;
    const maxWidth = width - margin * 2;

    page.drawText(sanitizeForPdf('TEXTO EXTRAÍDO - GOOGLE VISION OCR'), { x: margin, y: height - margin, size: 14, color: rgb(0, 0, 0) });
    page.drawText(sanitizeForPdf(`Arquivo original: ${req.file.originalname}`), { x: margin, y: height - margin - 20, size: 9, color: rgb(0.5, 0.5, 0.5) });
    page.drawText(sanitizeForPdf(`Data: ${new Date().toLocaleString('pt-BR')}`), { x: margin, y: height - margin - 35, size: 9, color: rgb(0.5, 0.5, 0.5) });

    const cleanText = extractedText.trim();
    const paragraphs = cleanText.split('\n').filter(p => p.trim());
    const allLines = [];
    for (const paragraph of paragraphs) {
      const words = paragraph.split(' ');
      let current = '';
      for (const w of words) {
        const test = current ? `${current} ${w}` : w;
        if (test.length * (fontSize * 0.6) < maxWidth) current = test; else { if (current) allLines.push(current); current = w; }
      }
      if (current) allLines.push(current);
      allLines.push('');
    }

    let y = height - margin - 60;
    for (const line of allLines) {
      if (y < margin) { page = pdfDoc.addPage(); ({ width, height } = page.getSize()); y = height - margin; }
      if (line.trim()) page.drawText(sanitizeForPdf(line), { x: margin, y, size: fontSize, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }

    const pdfBytes = await pdfDoc.save();
    const originalName = req.file.originalname || 'image';
    const pdfName = originalName.replace(/\.(jpg|jpeg|png|webp)$/i, '_vision_ocr.pdf');
    const asciiName = pdfName.replace(/[^\x20-\x7E]/g, '_');
    const cd = `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(pdfName)}`;
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': cd });
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erro no processamento OCR:', error);
    res.status(500).json({ error: 'Erro no processamento da imagem', details: error?.message || 'Erro desconhecido' });
  } finally {
    try { await fs.unlink(tempFilePath); } catch {}
  }
});
*/

router.post('/extract-text', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo de imagem fornecido' });

  const tempFilePath = req.file.path;

  try {
    // Validar API key
    const apiKey = process.env.GOOGLE_VISION_API_KEY;
    if (!apiKey) {
      console.error('[OCR] GOOGLE_VISION_API_KEY não configurada no servidor');
      return res.status(500).json({
        error: 'Configuração do servidor incorreta',
        details: 'GOOGLE_VISION_API_KEY não está configurada'
      });
    }

    const imageBuffer = await fs.readFile(tempFilePath);
    const base64Image = imageBuffer.toString('base64');

    console.log('[OCR] Chamando Google Vision API para extração de texto...');
    console.log('[OCR] Tamanho da imagem:', imageBuffer.length, 'bytes');

    const resp = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Image },
          features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
          imageContext: { languageHints: ['pt-BR', 'pt', 'en'] }
        }]
      })
    });

    // Verificar status da resposta
    if (!resp.ok) {
      const errorBody = await resp.text();
      console.error('[OCR] Google Vision API erro:', resp.status, errorBody);
      return res.status(502).json({
        error: 'Erro na API do Google Vision',
        details: `Status ${resp.status}: ${errorBody}`
      });
    }

    const data = await resp.json();

    // Verificar se há erro na resposta da API
    if (data.responses?.[0]?.error) {
      const apiError = data.responses[0].error;
      console.error('[OCR] Google Vision API retornou erro:', apiError);
      return res.status(502).json({
        error: 'Erro na extração de texto',
        details: apiError.message || 'Erro desconhecido da API'
      });
    }

    const text = data?.responses?.[0]?.textAnnotations?.[0]?.description || '';

    console.log('[OCR] Texto extraído com sucesso:', text.length, 'caracteres');

    res.json({ text, success: true, filename: req.file.originalname });
  } catch (error) {
    console.error('[OCR] Erro na extração de texto:', error);
    res.status(500).json({
      error: 'Erro na extração de texto',
      details: error?.message || 'Erro desconhecido'
    });
  } finally {
    try { await fs.unlink(tempFilePath); } catch {}
  }
});

// ENDPOINT DESABILITADO - NÃO USADO MAIS
// A conversão agora é feita no frontend (jsPDF)
// OCR usa apenas /extract-text endpoint
/*
router.post('/convert-pdf-to-pdf', uploadPdf.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Nenhum PDF fornecido' });
  const tempFilePath = req.file.path;
  const bucketName = process.env.GCS_BUCKET;
  if (!bucketName) return res.status(500).json({ error: 'GCS_BUCKET ausente' });
  const storage = new Storage();
  const client = new vision.ImageAnnotatorClient();

  try {
    const pdfGcsPath = `uploads/${Date.now()}-${req.file.originalname}`;
    await storage.bucket(bucketName).upload(tempFilePath, { destination: pdfGcsPath, contentType: 'application/pdf' });
    const inputUri = `gs://${bucketName}/${pdfGcsPath}`;
    const outPrefix = `vision-output/${Date.now()}-${Math.random().toString(36).slice(2)}/`;
    const outputUri = `gs://${bucketName}/${outPrefix}`;

    const request = {
      requests: [
        {
          inputConfig: { gcsSource: { uri: inputUri }, mimeType: 'application/pdf' },
          features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
          outputConfig: { gcsDestination: { uri: outputUri }, batchSize: 2 },
        },
      ],
    };

    const [operation] = await client.asyncBatchAnnotateFiles(request);
    await operation.promise();

    // Read JSON results from GCS
    const [files] = await storage.bucket(bucketName).getFiles({ prefix: outPrefix });
    let fullText = '';
    for (const file of files) {
      const [buf] = await file.download();
      const json = JSON.parse(buf.toString());
      const responses = json.responses || [];
      for (const r of responses) {
        if (r.fullTextAnnotation?.text) fullText += r.fullTextAnnotation.text + '\n';
      }
    }
    const extractedText = sanitizeForPdf(fullText || '');
    if (!extractedText.trim()) return res.status(400).json({ error: 'Nenhum texto detectado no PDF' });

    // Build searchable PDF
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    let { width, height } = page.getSize();
    const fontSize = 11;
    const lineHeight = 14;
    const margin = 50;
    const maxWidth = width - margin * 2;
    const paragraphs = extractedText.trim().split('\n').filter(Boolean);
    const lines = [];
    for (const paragraph of paragraphs) {
      const words = paragraph.split(' ');
      let current = '';
      for (const w of words) {
        const test = current ? `${current} ${w}` : w;
        if (test.length * (fontSize * 0.6) < maxWidth) current = test; else { if (current) lines.push(current); current = w; }
      }
      if (current) lines.push(current);
      lines.push('');
    }

    let y = height - margin;
    for (const line of lines) {
      if (y < margin) { page = pdfDoc.addPage(); ({ width, height } = page.getSize()); y = height - margin; }
      if (line.trim()) page.drawText(sanitizeForPdf(line), { x: margin, y, size: fontSize, color: rgb(0, 0, 0) });
      y -= lineHeight;
    }

    const pdfBytes = await pdfDoc.save();
    const originalName = req.file.originalname || 'document.pdf';
    const pdfName = originalName.replace(/\.pdf$/i, '_vision_ocr.pdf');
    const asciiName = pdfName.replace(/[^\x20-\x7E]/g, '_');
    const cd = `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(pdfName)}`;
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': cd });
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Erro Vision PDF:', error);
    res.status(500).json({ error: 'Erro no processamento do PDF', details: error?.message || 'Erro desconhecido' });
  } finally {
    try { await fs.unlink(tempFilePath); } catch {}
  }
});
*/

export default router;

function sanitizeForPdf(input) {
  if (!input) return '';
  let s = String(input);
  // Normalize
  s = s.normalize('NFC');
  // Replace common problematic unicode punctuation with ASCII equivalents
  const map = {
    '\u2018': "'", '\u2019': "'", '\u201A': ',', '\u201B': "'",
    '\u201C': '"', '\u201D': '"', '\u201E': '"', '\u201F': '"',
    '\u2026': '...', '\u2013': '-', '\u2014': '-', '\u2212': '-',
    '\u00A0': ' ', '\u2009': ' ', '\u200A': ' ', '\u202F': ' ',
  };
  s = s.replace(/[\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u2026\u2013\u2014\u2212\u00A0\u2009\u200A\u202F]/g, (ch) => map[ch] || ' ');
  // Remove control and zero-width characters
  s = s.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '');
  // Keep only WinAnsi-safe range: 0x20-0x7E and 0xA0-0xFF
  s = s.replace(/[^\x20-\x7E\xA0-\xFF\n\t]/g, '');
  // Normalize newlines
  s = s.replace(/\r\n?/g, '\n');
  // Collapse excessive whitespace
  s = s.replace(/\n{3,}/g, '\n\n');
  return s;
}


