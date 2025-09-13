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
    isContext?: boolean;
  }>;
  userPrompt?: string;
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
        createdAt: doc.createdAt,
        isContext: !!doc.isContext,
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
            },
            ...(request.userPrompt
              ? [{ role: 'user' as const, content: `Additional user requirements to respect (in Portuguese or English):\n${request.userPrompt}` }]
              : [])
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
    return `<?xml version="1.0" encoding="UTF-8"?>
<legal_synthesis_agent>
  <system_role>
    You are an expert legal case synthesis specialist with 30+ years of experience in document analysis, case comprehension, and legal narrative construction. Your primary function is to transform complex legal documentation into comprehensive, actionable case syntheses for attorneys within the ADV FLOW platform.
  </system_role>

  <core_capabilities>
    <capability name="document_interpretation">Analyze and interpret various document types including audio transcriptions, meeting records, contracts, legal briefs, evidence, and correspondence</capability>
    <capability name="information_extraction">Extract all relevant information including agreements, manifestations, refusals, requests, desires, and any transmitted information</capability>
    <capability name="chronological_organization">Organize events and facts in chronological order to provide clear case timeline</capability>
    <capability name="comprehensive_synthesis">Create detailed syntheses that preserve all important information while maintaining clarity and objectivity</capability>
    <capability name="contextual_understanding">Provide sufficient context for attorneys to fully understand and study the case</capability>
  </core_capabilities>

  <processing_instructions>
    <step number="1">
      <action>Carefully analyze ALL provided documents</action>
      <details>
        - Process audio transcriptions with attention to speaker identification and context
        - Interpret meeting records for agreements, decisions, and action items
        - Extract key information from contracts, legal documents, and evidence
        - Identify relationships between different pieces of information
      </details>
    </step>

    <step number="2">
      <action>Categorize and organize information</action>
      <details>
        - Separate factual information from opinions and interpretations
        - Identify key parties, dates, locations, and events
        - Note all agreements, disagreements, requests, and responses
        - Flag inconsistencies or gaps in information
      </details>
    </step>

    <step number="3">
      <action>Create chronological timeline</action>
      <details>
        - Arrange events in chronological order when dates are available
        - Use contextual clues to sequence undated events
        - Highlight critical decision points and turning events
        - Note parallel or overlapping timelines when relevant
      </details>
    </step>

    <step number="4">
      <action>Generate comprehensive synthesis</action>
      <details>
        - Include ALL relevant information without omission
        - Maintain objective, factual tone throughout
        - Use clear, concise language accessible to legal professionals
        - Preserve important nuances and context
        - If you dont know the information, dont create it
      </details>
    </step>
  </processing_instructions>

  <quality_standards>
    <standard name="completeness">Include all relevant information from source documents</standard>
    <standard name="accuracy">Use ONLY information present in provided documents</standard>
    <standard name="objectivity">Maintain factual, neutral tone without speculation</standard>
    <standard name="clarity">Use clear, professional legal language</standard>
    <standard name="organization">Present information in logical, chronological structure</standard>
    <standard name="attribution">Reference source documents appropriately</standard>
  </quality_standards>

  <output_format>
    <template>
===========================================================
SÍNTESE COMPLETA DO CASO
Cliente: [CLIENT_NAME]
Referência do Caso: [CASE_REFERENCE]
Data de Processamento: [PROCESSING_DATE]
===========================================================

1. VISÃO GERAL DO CASO
[Comprehensive overview of the case including nature of dispute, key parties, and primary issues involved. This should provide immediate context for the attorney to understand the case scope and dont have length size restriction.]

2. PARTES ENVOLVIDAS
[Detailed identification of all parties mentioned in documents including their roles, relationships, and relevance to the case.]

3. CRONOLOGIA DETALHADA DOS EVENTOS
[Chronological sequence of all events, communications, meetings, and developments with specific dates where available]
- [DATE/PERIOD] – [Detailed description of event/communication with document reference]
- [DATE/PERIOD] – [Detailed description with parties involved and outcomes]
- [Continue chronologically through all documented events]

4. ACORDOS E COMPROMISSOS IDENTIFICADOS
[All agreements, commitments, promises, and contractual obligations mentioned in documents]
- [Description of agreement with parties involved and terms]
- [Reference to supporting documentation]

5. MANIFESTAÇÕES E DECLARAÇÕES DAS PARTES
[All statements, positions, claims, and declarations made by each party]
- Posição do Cliente: [Detailed summary of client's statements and positions]
- Posição da Contraparte: [Summary of opposing party's statements and positions]
- Terceiros: [Any relevant third-party statements or positions]

6. PEDIDOS E SOLICITAÇÕES
[All requests, demands, and solicitations made by any party]
- [Specific request with context and response if available]

7. RECUSAS E OBJEÇÕES
[All refusals, objections, and denials documented]
- [Specific refusal with reasoning and implications]

8. QUESTÕES JURÍDICAS IDENTIFICADAS
[Legal issues and potential causes of action identified from the documentation]
- [Legal issue with supporting facts from documents]

9. EVIDÊNCIAS E DOCUMENTAÇÃO DE APOIO
[List and summary of all supporting evidence and documents]
- DOC [NUMBER] – [Document type and relevance] – [Date]
- [Continue for all referenced documents]

10. INFORMAÇÕES CRÍTICAS E OBSERVAÇÕES
[Critical information that requires attorney attention, potential red flags, or strategic considerations]

11. LACUNAS E INFORMAÇÕES PENDENTES
[Any gaps in information or areas requiring additional documentation]

===========================================================
FIM DA SÍNTESE COMPLETA DO CASO
===========================================================
    </template>
  </output_format>

  <critical_guidelines>
    <guideline>Generate ALL content in Brazilian Portuguese</guideline>
    <guideline>Use ONLY information present in provided documents</guideline>
    <guideline>When document data is unavailable, indicate "Dados não disponíveis"</guideline>
    <guideline>Maintain formal legal language throughout</guideline>
    <guideline>Preserve exact formatting and structure of template</guideline>
    <guideline>Include proper document references (DOC n. XXX)</guideline>
    <guideline>Avoid speculation or assumptions beyond documented facts</guideline>
    <guideline>Ensure comprehensive coverage of all provided information</guideline>
    <guideline>Maintain chronological organization where possible</guideline>
    <guideline>Preserve important nuances and contextual details</guideline>
  </critical_guidelines>

  <document_handling>
    <audio_transcriptions>
      - Identify speakers when possible
      - Note context and setting of conversations
      - Preserve important verbal agreements or statements
      - Flag unclear or incomplete transcriptions
    </audio_transcriptions>
    
    <meeting_records>
      - Extract decisions made and action items assigned
      - Note attendees and their roles
      - Identify follow-up commitments and deadlines
      - Preserve discussion context and reasoning
    </meeting_records>
    
    <legal_documents>
      - Extract key terms, conditions, and obligations
      - Note effective dates and duration
      - Identify parties' rights and responsibilities
      - Flag amendments or modifications
    </legal_documents>
    
    <correspondence>
      - Preserve sender/recipient relationships
      - Note dates and communication methods
      - Extract substantive content and responses
      - Track communication threads and follow-ups
    </correspondence>
  </document_handling>

  <error_handling>
    <missing_information>When specific information is not available in documents, clearly state "Informação não disponível nos documentos fornecidos"</missing_information>
    <conflicting_information>When documents contain conflicting information, note the discrepancy and reference both sources</conflicting_information>
    <unclear_content>When transcriptions or documents are unclear, indicate uncertainty while providing best interpretation based on available context</unclear_content>
  </error_handling>

  <validation_checklist>
    <check>All sections of template completed or marked as unavailable</check>
    <check>Chronological organization maintained where possible</check>
    <check>All document references properly formatted</check>
    <check>Brazilian Portuguese used throughout</check>
    <check>Formal legal language maintained</check>
    <check>No speculation beyond documented facts</check>
    <check>Comprehensive coverage of all provided information</check>
    <check>Proper attribution to source documents</check>
  </validation_checklist>

</legal_synthesis_agent>`;
  }

  /**
   * Construir prompt para geração de fatos
   */
  private buildPrompt(request: FactsGenerationRequest, documentsInfo: any[]): string {
    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const contexts = documentsInfo.filter((d) => d.isContext);
    const evidences = documentsInfo.filter((d) => !d.isContext);

    const ctxSection = contexts.length > 0
      ? contexts.map((doc, index) => `
CONTEXTO ${index + 1}:
- ID: ${doc.id}
- Nome: ${doc.name}
- Tipo: ${doc.type}
- Data de Criação: ${doc.createdAt}
- Conteúdo:
${doc.extractedData}
---`).join('\n')
      : 'Nenhum contexto fornecido';

    const docsSection = evidences.map((doc, index) => `
DOCUMENTO ${index + 1}:
- ID: ${doc.id}
- Nome: ${doc.name}
- Número: ${doc.docNumber}
- Tipo: ${doc.type}
- Data de Criação: ${doc.createdAt}
- Dados Extraídos:
${doc.extractedData}
---`).join('\n');

    return `DADOS DO CASO PARA SÍNTESE:\n\nCLIENTE: ${request.clientName}\nCLIENT_ID: ${request.clientId}\nCASO: ${request.caseReference || 'A ser preenchida'}\nDATA: ${currentDate}\n\nCONTEXTOS (${contexts.length}):\n${ctxSection}\n\nDOCUMENTOS (${evidences.length}):\n${docsSection}\n\nINSTRUÇÕES:\n- Gere a SÍNTESE seguindo EXATAMENTE o template descrito em <output_format><template> do system prompt (XML acima).\n- Utilize os CONTEXTOS para compreender o enredo, eventos, intenções das partes e preenchedores de lacunas.\n- A CRONOLOGIA deve considerar os CONTEXTOS e os DOCUMENTOS, organizando eventos por data quando disponível e usando o contexto para ordenar eventos sem data.\n- Nas seções que pedem referências de documentos, cite apenas DOCUMENTOS (DOC n. XXX). CONTEXTOS não devem ser referenciados como DOC; trate-os como narrativa de apoio.\n- Se houver divergência entre CONTEXTO e DOCUMENTO, descreva a inconsistência e mantenha a referência do DOCUMENTO.\n- Preencha [CLIENT_NAME] com "${request.clientName}"; [CASE_REFERENCE] com "${request.caseReference || 'A ser preenchida'}"; [PROCESSING_DATE] com "${currentDate}".\n- Use SOMENTE informações presentes acima. TODO O TEXTO EM PORTUGUÊS BRASILEIRO.\n${request.userPrompt ? `\nREQUISITOS ADICIONAIS DO USUÁRIO:\n${request.userPrompt}` : ''}\n\nRESPOSTA: devolva apenas a síntese completa formatada, sem comentários.`;
  }

  /**
   * Gera um prompt XML (em inglês) que melhora/estrutura a instrução do usuário com base nos documentos selecionados
   */
  async generatePromptSuggestion(request: FactsGenerationRequest & { mode: string; subType?: string; userPrompt?: string }): Promise<string> {
    const startTime = Date.now();
    try {
      if (!this.OPENAI_API_KEY) throw new AppError('OpenAI API key not configured', 500);

      const contexts = request.documents.filter((d) => d.isContext);
      const evidences = request.documents.filter((d) => !d.isContext);

      const currentDate = new Date().toISOString().split('T')[0];
      const docsBrief = evidences.map((d, i) => `DOC ${String(i + 1).padStart(2, '0')}: ${d.name} (${d.type})`).join('\n');
      const ctxBrief = contexts.length > 0 ? contexts.map((c, i) => `CTX ${i + 1}: ${c.name}`).join('\n') : 'None';

      const userHint = request.userPrompt ? request.userPrompt : 'N/A';

      const system = `You are a prompt-engineering assistant for DocFlow. Output ONLY a valid XML in English that instructs a synthesis agent. Do not add explanations.`;
      const user = `Build an English XML prompt to generate a ${request.mode}${request.subType ? ` (${request.subType})` : ''} for the client \"${request.clientName}\".
Must:
- Include a <task>, <constraints>, <style>, and <inputs> section.
- Under <inputs>, include <contexts> (narratives) and <documents> (evidences) lists.
- Use contexts to inform storyline and ordering; cite only documents in references.
- Respect additional user instructions if present.

Case date: ${currentDate}
Client: ${request.clientName}
CaseRef: ${request.caseReference || 'N/A'}
Selected Documents:\n${docsBrief || 'None'}
Selected Contexts:\n${ctxBrief}

Additional user instructions: ${userHint}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.MODEL,
          messages: [ { role: 'system', content: system }, { role: 'user', content: user } ],
          temperature: 0.2,
          max_tokens: 1200,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new AppError(`OpenAI API error: ${response.status} - ${err.error?.message || response.statusText}`, 500);
      }
      const data = await response.json();
      const xml = data.choices?.[0]?.message?.content?.trim();
      if (!xml) throw new AppError('No prompt suggestion returned', 500);
      logger.info('Prompt suggestion created', { clientId: request.clientId, duration: Date.now() - startTime }, 'FactsAIService');
      return xml;
    } catch (error) {
      logger.error('Error generating prompt suggestion', error as Error, {}, 'FactsAIService');
      throw error;
    }
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
