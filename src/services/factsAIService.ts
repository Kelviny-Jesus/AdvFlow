import { logger } from '../lib/logger';
import { AppError } from '../lib/errors';

interface FactsGenerationRequest {
  clientId: string;
  clientName: string;
  caseReference?: string;
  documentIds: string[];
  documents: Array<{
    id: string;
    name: string;
    docNumber?: string;
    extractedData?: string;
    type: string;
    createdAt: string;
  }>;
}

interface FactsGenerationResponse {
  success: boolean;
  facts?: string;
  error?: string;
}

class FactsAIService {
  private readonly OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  private readonly MODEL = 'gpt-4o-mini-2024-07-18'; // Mapeado para gpt-4o-mini
  private readonly TIMEOUT = 120000; // 2 minutos

  /**
   * Gerar fatos usando IA baseado nos documentos selecionados
   */
  async generateFacts(request: FactsGenerationRequest): Promise<string> {
    const startTime = Date.now();
    
    try {
      if (!this.OPENAI_API_KEY) {
        logger.error('OpenAI API key not configured', new Error('OpenAI API key not configured'), {}, 'FactsAIService');
        throw new AppError('OpenAI API key not configured', 500);
      }

      console.log('🤖 Iniciando geração de fatos para cliente:', request.clientName);
      console.log('📄 Documentos selecionados:', request.documentIds.length);
      console.log('📊 Documentos com dados extraídos:', request.documents.filter(d => d.extractedData).length);

      // Preparar dados dos documentos para o prompt
      const documentsInfo = request.documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        docNumber: doc.docNumber || 'DOC n. XXX',
        type: doc.type,
        extractedData: doc.extractedData || 'Dados não disponíveis',
        createdAt: doc.createdAt
      }));

      // Construir prompt
      const prompt = this.buildPrompt(request, documentsInfo);

      // Fazer requisição para OpenAI
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
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
          temperature: 0.3,
          max_tokens: 4000
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
      const generatedFacts = data.choices?.[0]?.message?.content?.trim();

      if (!generatedFacts) {
        console.log('❌ IA não retornou fatos gerados');
        throw new AppError('No response from OpenAI', 500);
      }

      const duration = Date.now() - startTime;
      
      console.log('✅ Geração de fatos concluída em', duration, 'ms');
      console.log('📝 Tamanho dos fatos gerados:', generatedFacts.length, 'caracteres');
      
      logger.info('Facts generation completed successfully', {
        clientId: request.clientId,
        clientName: request.clientName,
        documentCount: request.documentIds.length,
        duration,
        factsLength: generatedFacts.length
      }, 'FactsAIService');

      return generatedFacts;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('⏰ Timeout na geração de fatos');
        logger.error('Timeout in facts generation', new Error('Timeout in facts generation'), {
          clientId: request.clientId,
          duration,
          timeout: this.TIMEOUT
        }, 'FactsAIService');
        throw new AppError('Timeout na geração de fatos', 408);
      }

      console.log('❌ Erro na geração de fatos:', error);
      logger.error('Error in facts generation', new Error(error instanceof Error ? error.message : 'Unknown error'), {
        clientId: request.clientId,
        duration
      }, 'FactsAIService');

      throw error;
    }
  }

  /**
   * Prompt do sistema para geração de fatos
   */
  private getSystemPrompt(): string {
    return `Você é um assistente jurídico especializado em análise de documentos e geração de relatórios de fatos para processos legais.

INSTRUÇÕES IMPORTANTES:
1. Analise cuidadosamente todos os documentos fornecidos
2. Extraia informações relevantes dos dados extraídos de cada documento
3. Organize os fatos de forma cronológica quando possível
4. Use APENAS informações presentes nos documentos fornecidos
5. Se um documento não tiver dados extraídos, indique "Dados não disponíveis"
6. Siga EXATAMENTE o formato de saída especificado
7. Use as referências de documentos fornecidas (DOC n. XXX)
8. Seja objetivo e factual, evitando especulações
9. Mantenha linguagem jurídica formal e clara
10. GERE TODO O CONTEÚDO EM PORTUGUÊS BRASILEIRO

FORMATO DE SAÍDA OBRIGATÓRIO:
- Use exatamente o template fornecido
- Substitua apenas os campos entre colchetes
- Mantenha toda a formatação e estrutura
- Não adicione informações não presentes nos documentos
- TODO O TEXTO DEVE ESTAR EM PORTUGUÊS BRASILEIRO`;
  }

  /**
   * Construir prompt para geração de fatos
   */
  private buildPrompt(request: FactsGenerationRequest, documentsInfo: any[]): string {
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    return `
DOCUMENTOS PARA ANÁLISE E GERAÇÃO DE FATOS:

**Informações do Cliente:**
- Nome: ${request.clientName}
- ID: ${request.clientId}
- Referência do Caso: ${request.caseReference || 'A ser preenchida'}
- Data de Processamento: ${currentDate}

**Documentos Selecionados (${documentsInfo.length}):**
${documentsInfo.map((doc, index) => `
DOCUMENTO ${index + 1}:
- ID: ${doc.id}
- Nome: ${doc.name}
- Número: ${doc.docNumber}
- Tipo: ${doc.type}
- Data de Criação: ${doc.createdAt}
- Dados Extraídos:
${doc.extractedData}
---`).join('\n')}

**TAREFA:**
Analise todos os documentos acima e gere um relatório de fatos seguindo EXATAMENTE este formato:

===========================================================
RELATÓRIO NARRATIVO DE FATOS
Cliente: ${request.clientName}
Referência do Caso: ${request.caseReference || '[REFERÊNCIA_DO_CASO]'}
Data de Processamento: ${currentDate}
===========================================================
 
1. RESUMO DO CASO
O presente caso trata de [resumo breve da disputa, ex: "violação contratual entre ${request.clientName} e EMPRESA B"].
A pretensão decorre de [base factual], e os fundamentos jurídicos são respaldados pela documentação anexa e por descrições de áudio ou informações consolidadas de resumo de reunião jurídica ou mensagens do cliente relatando o ocorrido. Faça uma descrição detalhada.
 
2. CRONOLOGIA DOS FATOS
- [DATA] – [Descrição do evento com referência ao documento comprobatório]
 
- [DATA] – [Descrição do evento, correspondência ou negociação]
 
- [DATA] – [Descrição da assinatura de contrato, violação ou ocorrência relevante]
 
- [DATA] – [Comunicação posterior, fatura ou evidência de danos]
 
 
3. FATOS PRINCIPAIS
- O requerente está devidamente representado conforme Procuração
 (Referência: DOC 02).
- A relação contratual entre as partes está evidenciada
 (Referência: DOC 03).
- Os danos e violação de obrigações são comprovados por evidências de apoio
 (Referência: DOC 04, DOC 05).
- A identificação e capacidade processual do requerente estão confirmadas
 (Referência: DOC 01).
 
4. DECLARAÇÕES DAS PARTES
- Declaração do requerente: [Inserir resumo extraído de mensagens ou documentos, ex: "O requerido deixou de prestar os serviços contratados, causando prejuízos financeiros"].  
- Declaração da parte contrária: [Inserir resumo, se disponível, de correspondência ou peças processuais].
Aplique apenas verificando resumo ou documentação do caso se já existir nos documentos. SE não existir, não leve em consideração.
 
5. EVIDÊNCIAS DE APOIO (Lista de Documentos Processados)
${documentsInfo.map((doc, index) => 
  `- DOC ${String(index + 1).padStart(2, '0')} – ${request.clientName} – ${this.getDocumentTypeDescription(doc.type)} – ${doc.createdAt.split('T')[0]}`
).join('\n')}
 
===========================================================
FIM DO RELATÓRIO NARRATIVO DE FATOS
===========================================================

**IMPORTANTE:**
- Use APENAS informações presentes nos documentos fornecidos
- Se um documento não tiver dados extraídos, indique "Dados não disponíveis"
- Mantenha a formatação exata do template
- Seja factual e objetivo
- Use as referências de documentos corretas (DOC 01, DOC 02, etc.)
- Se não houver informações suficientes para uma seção, indique "Informações não disponíveis nos documentos fornecidos"

**RESPOSTA (apenas o relatório formatado):**
`;
  }

  /**
   * Obter descrição do tipo de documento
   */
  private getDocumentTypeDescription(type: string): string {
    const typeMap: Record<string, string> = {
      'pdf': 'Documento',
      'image': 'Evidência Fotográfica',
      'audio': 'Gravação de Áudio',
      'video': 'Evidência em Vídeo',
      'docx': 'Documento Word',
      'txt': 'Documento de Texto',
      'other': 'Documento de Apoio'
    };
    
    return typeMap[type.toLowerCase()] || 'Documento de Apoio';
  }

  /**
   * Verificar se o serviço está configurado
   */
  isConfigured(): boolean {
    return !!this.OPENAI_API_KEY;
  }
}

export const factsAIService = new FactsAIService();
export type { FactsGenerationRequest, FactsGenerationResponse };
