import { logger } from '../lib/logger';
import { AppError } from '../lib/errors';

interface RenamingRequest {
  documentId: string;
  fileName: string;
  extractedData: string;
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
  private readonly MODEL = 'gpt-4o-mini-2024-07-18'; // Usando o modelo mais próximo disponível
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

      console.log('🤖 Iniciando renomeação AI para:', request.fileName);
      console.log('📄 Cliente:', request.clientName || 'Não especificado');
      console.log('📊 Tamanho do conteúdo extraído:', request.extractedData.length, 'caracteres');
      
      logger.info('Starting AI document renaming', {
        documentId: request.documentId,
        fileName: request.fileName,
        extractedDataLength: request.extractedData.length,
        clientName: request.clientName,
        caseReference: request.caseReference
      }, 'AIRenamingService');

      // Preparar o prompt baseado no template fornecido
      const prompt = this.buildPrompt(request);

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
          max_tokens: 100,
          temperature: 0.3,
          top_p: 1,
          frequency_penalty: 0,
          presence_penalty: 0
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
      const suggestedName = data.choices?.[0]?.message?.content?.trim();

      console.log('🎯 Nome sugerido pela IA:', suggestedName);

      if (!suggestedName) {
        console.log('❌ IA não retornou nome sugerido');
        throw new AppError('No response from OpenAI', 500);
      }

      const duration = Date.now() - startTime;
      
      console.log('✅ Renomeação AI concluída em', duration, 'ms');
      console.log('📝 Nome original:', request.fileName);
      console.log('🆕 Nome sugerido:', suggestedName);
      
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

IMPORTANTE: Sua resposta deve ser APENAS o nome do documento no formato especificado, sem explicações, observações ou texto adicional.`;
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
      console.log('❌ Nome sugerido não segue o formato:', name);
      console.log('✅ Formato esperado: DOC n. 001 + CLIENTE + TIPO + 2024-03-15');
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
