import { logger } from '../lib/logger';
import { AppError } from '../lib/errors';

interface RenamingRequest {
  documentId: string;
  fileName: string;
  extractedData: string;
  fileType?: 'pdf' | 'docx' | 'image' | 'audio' | 'video' | 'zip' | 'other';
  mimeType?: string;
  clientName?: string;
  caseReference?: string;
  lastDocument?: {
    name: string;
    number: number;
  } | null;
}

interface RenamingResponse {
  success: boolean;
  suggestedName?: string;
  error?: string;
}

class AIRenamingService {
  private readonly OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  private readonly MODEL = 'gpt-5';
  private readonly API_URL = 'https://api.openai.com/v1/chat/completions';
  private readonly TIMEOUT = 30000; // 30 segundos

  /**
   * Analisa o conteúdo extraído e sugere um novo nome para o documento
   */
  async suggestDocumentName(request: RenamingRequest): Promise<string | null> {
    const startTime = Date.now();
    
    try {
      if (!this.OPENAI_API_KEY) {
        logger.error('OpenAI API key not configured', new Error('OpenAI API key not configured'), {}, 'AIRenamingService');
        throw new AppError('OpenAI API key not configured', 500);
      }

      console.log('Iniciando renomeação AI para:', request.fileName);
      console.log('Cliente:', request.clientName || 'Não especificado');
      console.log('Tamanho do conteúdo extraído:', request.extractedData.length, 'caracteres');
      
      logger.info('Starting AI document renaming', {
        documentId: request.documentId,
        fileName: request.fileName,
        extractedDataLength: request.extractedData.length,
        clientName: request.clientName,
        caseReference: request.caseReference
      }, 'AIRenamingService');

      // Preparar o prompt baseado no template fornecido
      const prompt = this.buildPrompt(request);

      console.log('Prompt enviado para OpenAI:');
      console.log('System prompt:', this.getSystemPrompt().substring(0, 200) + '...');
      console.log('User prompt:', prompt.substring(0, 500) + '...');

      // Fazer requisição para OpenAI
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: this.MODEL,
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt()
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_completion_tokens: 500
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new AppError(
          `OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`,
          500
        );
      }

      const data = await response.json();

      console.log('Resposta completa da OpenAI:', JSON.stringify(data, null, 2));
      console.log('Usage:', data.usage);
      console.log('Completion tokens details:', data.usage?.completion_tokens_details);

      // Verificar se há erro na resposta
      if (data.error) {
        console.error('OpenAI retornou erro:', data.error);
        throw new AppError(`OpenAI error: ${data.error.message || 'Unknown error'}`, 500);
      }

      // Verificar se há choices
      if (!data.choices || data.choices.length === 0) {
        console.error('OpenAI não retornou choices');
        console.log('Resposta completa:', data);
        throw new AppError('OpenAI response missing choices', 500);
      }

      const choice = data.choices[0];
      const suggestedName = choice?.message?.content?.trim();

      console.log('Nome sugerido pela IA:', suggestedName);
      console.log('Finish reason:', choice?.finish_reason);

      if (!suggestedName) {
        console.log('IA não retornou nome sugerido');
        console.log('Finish reason:', choice?.finish_reason);
        console.log('Message:', choice?.message);
        console.log('Refusal:', choice?.message?.refusal);
        
        // Se foi cortado por limite de tokens
        if (choice?.finish_reason === 'length') {
          throw new AppError('OpenAI response truncated - content too long', 500);
        }
        
        // Se houve recusa de conteúdo
        if (choice?.message?.refusal) {
          throw new AppError(`OpenAI refused: ${choice.message.refusal}`, 500);
        }
        
        throw new AppError('No response from OpenAI', 500);
      }

      const duration = Date.now() - startTime;

      console.log('Renomeação AI concluída em', duration, 'ms');
      console.log('Nome original:', request.fileName);
      console.log('Nome sugerido:', suggestedName);
      
      logger.info('AI renaming completed successfully', {
        documentId: request.documentId,
        originalName: request.fileName,
        suggestedName,
        duration
      }, 'AIRenamingService');

      return suggestedName;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('Timeout in AI renaming', new Error('Timeout in AI renaming'), {}, 'AIRenamingService');
        throw new AppError('Timeout in AI renaming', 500);
      }

      logger.error('Error in AI renaming', error instanceof Error ? error : new Error('Unknown error'), {}, 'AIRenamingService');

      // Não falhar o processo por causa da renomeação
      return null;
    }
  }

  /**
   * Constrói o prompt baseado no template fornecido
   */
  private buildPrompt(request: RenamingRequest): string {
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Obter descrição do tipo de arquivo
    const fileTypeDescription = this.getFileTypeDescription(request.fileType, request.mimeType);
    
    // Construir informação do último documento se disponível
    let lastDocumentInfo = '';
    if (request.lastDocument) {
      const nextNumber = String(request.lastDocument.number + 1).padStart(3, '0');
      lastDocumentInfo = `
**NUMERAÇÃO SEQUENCIAL:**
- Último documento renomeado: ${request.lastDocument.name}
- Número do último documento: ${request.lastDocument.number}
- PRÓXIMO NÚMERO A USAR: ${nextNumber}
- IMPORTANTE: Use sempre o número ${nextNumber} para este documento
`;
    } else {
      lastDocumentInfo = `
**NUMERAÇÃO SEQUENCIAL:**
- Este é o primeiro documento do cliente
- Use o número 001 para este documento
`;
    }
    
    return `
DOCUMENTO PARA ANÁLISE E RENOMEAÇÃO:

**Informações do Documento:**
- Nome atual: ${request.fileName}
- Tipo de arquivo: ${fileTypeDescription}
- Cliente: ${request.clientName || 'Não especificado'}
- Referência do caso: ${request.caseReference || 'Não especificado'}
- Data de processamento: ${currentDate}

${lastDocumentInfo}

**Conteúdo Extraído:**
${request.extractedData}

**INSTRUÇÕES:**
Analise o conteúdo extraído acima e sugira um novo nome para o documento seguindo EXATAMENTE o formato:

DOC n. [NÚMERO_SEQUENCIAL] + [NOME_CLIENTE] + [TIPO_DOCUMENTO] + [DATA_PROCESSAMENTO]

**FORMATO OBRIGATÓRIO:**
- DOC n. [001, 002, 003...] (número sequencial de 3 dígitos)
- Nome do cliente em MAIÚSCULAS com underscores
- Tipo do documento em MAIÚSCULAS com underscores
- Data no formato YYYY-MM-DD

**TIPOS DE DOCUMENTOS ESPECÍFICOS:**
Analise cuidadosamente o conteúdo e identifique o tipo exato:

**DOCUMENTOS PESSOAIS:**
- RG (Registro Geral)
- CPF (Cadastro de Pessoa Física)
- CNH (Carteira Nacional de Habilitação)
- TITULO_ELEITOR
- CERTIDAO_NASCIMENTO
- CERTIDAO_CASAMENTO
- PASSPORTE

**DOCUMENTOS CONTRATUAIS:**
- CONTRATO_TRABALHO
- CONTRATO_SERVICO
- CONTRATO_LOCACAO
- CONTRATO_COMPRA_VENDA
- TERMO_ACORDO
- TERMO_COMPROMISSO
- NDAS (Acordo de Confidencialidade)

**DOCUMENTOS PROCESSUAIS:**
- PETICAO_INICIAL
- PETICAO_RESPOSTA
- PETICAO_RECURSO
- SENTENCA
- DECISAO
- MANDADO_SEGURANCA
- HABEAS_CORPUS
- PROCURACAO
- PROCURACAO_ADJUDICATORIA

**DOCUMENTOS FINANCEIROS:**
- EXTRATO_BANCARIO
- COMPROVANTE_RENDA
- IMPOSTO_RENDA
- DECLARACAO_IR
- NOTA_FISCAL
- RECIBO
- BOLETO

**CORRESPONDÊNCIAS:**
- CARTA_DEMANDA
- CARTA_RESPOSTA
- EMAIL_CORRESPONDENCIA
- NOTIFICACAO_EXTRAJUDICIAL
- INTIMACAO

**EVIDÊNCIAS:**
- FOTO_EVIDENCIA
- VIDEO_EVIDENCIA
- AUDIO_GRAVACAO
- TESTEMUNHO_ESCRITO
- LAUDO_TECNICO
- PERICIA

**EXEMPLOS ESPECÍFICOS:**
- DOC n. 001 + SILVA_JOAO + RG + 2024-03-15
- DOC n. 002 + SILVA_JOAO + CPF + 2024-03-16
- DOC n. 003 + SILVA_JOAO + CONTRATO_TRABALHO + 2024-03-17
- DOC n. 004 + SILVA_JOAO + PETICAO_INICIAL + 2024-03-18
- DOC n. 005 + SILVA_JOAO + PROCURACAO + 2024-03-19
- DOC n. 006 + SILVA_JOAO + EXTRATO_BANCARIO + 2024-03-20

**IMPORTANTE:**
- Responda APENAS com o nome sugerido, sem explicações ou observações
- Use apenas o formato especificado
- IDENTIFIQUE O TIPO ESPECÍFICO do documento baseado no conteúdo
- Se for RG, use "RG"
- Se for CPF, use "CPF"
- Se for contrato de trabalho, use "CONTRATO_TRABALHO"
- Se não conseguir identificar o tipo específico, use "DOCUMENTO_LEGAL"
- Se não tiver nome do cliente, use "CLIENTE_NAO_IDENTIFICADO"
- RESPEITE A NUMERAÇÃO SEQUENCIAL indicada acima

**RESPOSTA (apenas o nome):**
`;
  }

  /**
   * Prompt do sistema baseado no template fornecido
   */
  private getSystemPrompt(): string {
    return `Você é um Agente Especialista em Documentos Jurídicos com foco em Reconhecimento, Classificação e Criação de Fatos.

SUA ESPECIALIZAÇÃO:
- Análise e classificação de documentos jurídicos baseada no conteúdo
- Geração de nomes de arquivo descritivos baseados na análise do documento
- Criação de fatos estruturados a partir de documentos e narrativas
- Gerenciamento de organização de documentos

SUAS FUNÇÕES PRIMÁRIAS:
1. Analisar e classificar documentos jurídicos baseado no conteúdo
2. Gerar nomes de arquivo descritivos baseados na análise do documento
3. Criar fatos estruturados a partir de documentos e narrativas
4. Gerenciar organização de documentos

SISTEMA DE CLASSIFICAÇÃO ESPECÍFICA:
- Documentos Pessoais: RG, CPF, CNH, TITULO_ELEITOR, CERTIDAO_NASCIMENTO, CERTIDAO_CASAMENTO, PASSPORTE
- Documentos Contratuais: CONTRATO_TRABALHO, CONTRATO_SERVICO, CONTRATO_LOCACAO, CONTRATO_COMPRA_VENDA, TERMO_ACORDO, TERMO_COMPROMISSO, NDAS
- Documentos Processuais: PETICAO_INICIAL, PETICAO_RESPOSTA, PETICAO_RECURSO, SENTENCA, DECISAO, MANDADO_SEGURANCA, HABEAS_CORPUS, PROCURACAO, PROCURACAO_ADJUDICATORIA
- Documentos Financeiros: EXTRATO_BANCARIO, COMPROVANTE_RENDA, IMPOSTO_RENDA, DECLARACAO_IR, NOTA_FISCAL, RECIBO, BOLETO
- Correspondências: CARTA_DEMANDA, CARTA_RESPOSTA, EMAIL_CORRESPONDENCIA, NOTIFICACAO_EXTRAJUDICIAL, INTIMACAO
- Evidências: FOTO_EVIDENCIA, VIDEO_EVIDENCIA, AUDIO_GRAVACAO, TESTEMUNHO_ESCRITO, LAUDO_TECNICO, PERICIA

CONVENÇÕES DE NOMENCLATURA:
- Formato: DOC n. [NÚMERO_SEQUENCIAL] + [NOME_CLIENTE] + [TIPO_DOCUMENTO] + [DATA_PROCESSAMENTO]
- Nome do cliente em MAIÚSCULAS com underscores
- Tipo do documento em MAIÚSCULAS com underscores
- Data no formato ISO (YYYY-MM-DD)
- Numeração sequencial de 3 dígitos por cliente

COMPORTAMENTO:
- Siga EXATAMENTE o formato de nomenclatura especificado
- Analise cuidadosamente o conteúdo para identificar o tipo ESPECÍFICO de documento
- Use os tipos específicos listados (RG, CPF, CONTRATO_TRABALHO, etc.)
- Seja preciso na classificação - não use "DOCUMENTO_LEGAL" se conseguir identificar o tipo específico
- Responda APENAS com o nome sugerido, sem explicações
- Mantenha confidencialidade e padrões profissionais jurídicos
- Se não conseguir identificar informações, use valores padrão apropriados

IMPORTANTE SOBRE TIPOS DE ARQUIVO:
- Se o tipo de arquivo for ÁUDIO (audio/*, .ogg, .mp3, etc.): o conteúdo extraído é uma TRANSCRIÇÃO de áudio
  → Use AUDIO_GRAVACAO independentemente do conteúdo da transcrição
  → NÃO use FOTO_EVIDENCIA, IMAGEM ou outros tipos visuais para áudios
- Se o tipo for VÍDEO: use VIDEO_EVIDENCIA
- Se o tipo for IMAGEM/PDF: o conteúdo foi extraído via OCR, analise para identificar o tipo específico (RG, CPF, CONTRATO, etc.)
- SEMPRE respeite o tipo de arquivo indicado acima nas "Informações do Documento"

IMPORTANTE: Sua resposta deve ser APENAS o nome do documento no formato especificado, sem explicações, observações ou texto adicional.`;
  }

  /**
   * Obter descrição legível do tipo de arquivo
   */
  private getFileTypeDescription(fileType?: string, mimeType?: string): string {
    if (!fileType && !mimeType) return 'Tipo não identificado';
    
    const typeMap: Record<string, string> = {
      'audio': '🎵 ÁUDIO (gravação de áudio, transcrição de fala)',
      'video': '🎬 VÍDEO (gravação de vídeo)',
      'image': '🖼️ IMAGEM (foto, digitalização, screenshot)',
      'pdf': '📄 PDF (documento escaneado ou digital)',
      'docx': '📝 DOCUMENTO WORD',
      'zip': '📦 ARQUIVO COMPACTADO',
      'other': '📎 OUTRO TIPO DE ARQUIVO'
    };
    
    const description = typeMap[fileType || 'other'] || 'Tipo desconhecido';
    return mimeType ? `${description} - MIME: ${mimeType}` : description;
  }

  /**
   * Verifica se o serviço está configurado corretamente
   */
  isConfigured(): boolean {
    return !!this.OPENAI_API_KEY;
  }

  /**
   * Valida se o nome sugerido segue o formato correto
   */
  validateSuggestedName(name: string): boolean {
    const pattern = /^DOC n\. \d{3} \+ [A-Z_]+ \+ [A-Z_]+ \+ \d{4}-\d{2}-\d{2}$/;
    const isValid = pattern.test(name);
    
    if (!isValid) {
      console.log('Nome sugerido não segue o formato:', name);
      console.log('Formato esperado: DOC n. 001 + CLIENTE + TIPO + 2024-03-15');
    }
    
    return isValid;
  }

  /**
   * Lista de tipos de documentos específicos reconhecidos
   */
  getRecognizedDocumentTypes(): string[] {
    return [
      // Documentos Pessoais
      'RG', 'CPF', 'CNH', 'TITULO_ELEITOR', 'CERTIDAO_NASCIMENTO', 'CERTIDAO_CASAMENTO', 'PASSPORTE',
      
      // Documentos Contratuais
      'CONTRATO_TRABALHO', 'CONTRATO_SERVICO', 'CONTRATO_LOCACAO', 'CONTRATO_COMPRA_VENDA', 
      'TERMO_ACORDO', 'TERMO_COMPROMISSO', 'NDAS',
      
      // Documentos Processuais
      'PETICAO_INICIAL', 'PETICAO_RESPOSTA', 'PETICAO_RECURSO', 'SENTENCA', 'DECISAO', 
      'MANDADO_SEGURANCA', 'HABEAS_CORPUS', 'PROCURACAO', 'PROCURACAO_ADJUDICATORIA',
      
      // Documentos Financeiros
      'EXTRATO_BANCARIO', 'COMPROVANTE_RENDA', 'IMPOSTO_RENDA', 'DECLARACAO_IR', 
      'NOTA_FISCAL', 'RECIBO', 'BOLETO',
      
      // Correspondências
      'CARTA_DEMANDA', 'CARTA_RESPOSTA', 'EMAIL_CORRESPONDENCIA', 'NOTIFICACAO_EXTRAJUDICIAL', 'INTIMACAO',
      
      // Evidências
      'FOTO_EVIDENCIA', 'VIDEO_EVIDENCIA', 'AUDIO_GRAVACAO', 'TESTEMUNHO_ESCRITO', 'LAUDO_TECNICO', 'PERICIA'
    ];
  }

  /**
   * Verifica se um tipo de documento é reconhecido
   */
  isRecognizedDocumentType(type: string): boolean {
    return this.getRecognizedDocumentTypes().includes(type.toUpperCase());
  }
}

export const aiRenamingService = new AIRenamingService();
export type { RenamingRequest, RenamingResponse };
