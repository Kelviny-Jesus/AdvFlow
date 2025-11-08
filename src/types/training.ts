export const DOCUMENT_TRAINING_TYPES = {
  procuracao: {
    label: 'Procuração',
    subtypes: {
      ad_judicia: 'AD Judicia',
      ad_negotiate: 'AD Negotia',
      inpi: 'INPI',
      inss: 'INSS',
      custom: 'Customizada'
    }
  },
  sintese: {
    label: 'Síntese',
    subtypes: {
      resumo_completo: 'Resumo Completo Detalhado',
      resumo_executivo: 'Resumo Executivo'
    }
  },
  contratos: {
    label: 'Contratos',
    subtypes: {
      societario: 'Societário',
      imobiliario: 'Imobiliário',
      prestacao_servicos: 'Prestação de Serviços',
      honorarios: 'Contrato de Honorários'
    }
  },
  peticoes: {
    label: 'Petições',
    subtypes: {
      inicial: 'Petição Inicial',
      recurso: 'Recurso',
      contrarrazoes: 'Contrarrazões',
      notificacao_extrajudicial: 'Notificação Extrajudicial'
    }
  }
} as const;

export type DocumentTrainingType = keyof typeof DOCUMENT_TRAINING_TYPES;
export type DocumentTrainingSubtype<T extends DocumentTrainingType> = keyof typeof DOCUMENT_TRAINING_TYPES[T]['subtypes'];

export interface TrainingDocument {
  id: string;
  user_id: string;
  document_type: string;
  document_subtype: string | null;
  file_name: string | null;
  file_path: string | null;
  extracted_content: string | null;
  structure_metadata: any;
  embedding: number[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingDocumentInsert {
  user_id: string;
  document_type: string;
  document_subtype?: string;
  file_name: string;
  file_path: string;
  extracted_content: string;
  structure_metadata?: any;
  embedding?: number[];
}

export interface StructureMetadata {
  sections?: string[];
  style?: string;
  common_clauses?: string[];
  formatting_patterns?: Record<string, any>;
  key_phrases?: string[];
}

