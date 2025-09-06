/**
 * Schemas de validação com Zod
 */

import { z } from 'zod';

// Validações básicas
export const UuidSchema = z.string().uuid('ID inválido');
export const EmailSchema = z.string().email('Email inválido');
export const PhoneSchema = z.string().regex(
  /^\(\d{2}\)\s\d{4,5}-\d{4}$/,
  'Telefone deve estar no formato (11) 99999-9999'
);

// Schema para Cliente
export const ClientSchema = z.object({
  id: UuidSchema.optional(),
  name: z.string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .trim(),
  email: EmailSchema.optional().or(z.literal('')),
  phone: PhoneSchema.optional().or(z.literal('')),
  createdAt: z.string().datetime().optional(),
  casesCount: z.number().int().min(0).optional(),
});

export const CreateClientSchema = ClientSchema.omit({ 
  id: true, 
  createdAt: true, 
  casesCount: true 
});

export const UpdateClientSchema = CreateClientSchema.partial();

// Schema para Caso
export const CaseSchema = z.object({
  id: UuidSchema.optional(),
  name: z.string()
    .min(3, 'Nome do caso deve ter pelo menos 3 caracteres')
    .max(200, 'Nome do caso deve ter no máximo 200 caracteres')
    .trim(),
  clientId: UuidSchema,
  reference: z.string()
    .min(5, 'Referência deve ter pelo menos 5 caracteres')
    .max(50, 'Referência deve ter no máximo 50 caracteres')
    .optional()
    .or(z.literal('')),
  description: z.string()
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .optional()
    .or(z.literal('')),
  status: z.enum(['active', 'inactive', 'closed'], {
    errorMap: () => ({ message: 'Status deve ser: active, inactive ou closed' })
  }),
  createdAt: z.string().datetime().optional(),
  documentsCount: z.number().int().min(0).optional(),
});

export const CreateCaseSchema = CaseSchema.omit({ 
  id: true, 
  createdAt: true, 
  documentsCount: true 
});

export const UpdateCaseSchema = CreateCaseSchema.partial().omit({ clientId: true });

// Schema para Pasta
export const FolderSchema = z.object({
  id: UuidSchema.optional(),
  name: z.string()
    .min(1, 'Nome da pasta é obrigatório')
    .max(100, 'Nome da pasta deve ter no máximo 100 caracteres')
    .trim(),
  kind: z.enum(['client', 'case', 'subfolder'], {
    errorMap: () => ({ message: 'Tipo deve ser: client, case ou subfolder' })
  }),
  parentId: UuidSchema.optional(),
  clientId: UuidSchema.optional(),
  caseId: UuidSchema.optional(),
  path: z.string().min(1, 'Caminho é obrigatório'),
  createdAt: z.string().datetime().optional(),
  itemsCount: z.number().int().min(0).optional(),
  documentsCount: z.number().int().min(0).optional(),
  subfolderCount: z.number().int().min(0).optional(),
});

export const CreateFolderSchema = FolderSchema.omit({ 
  id: true, 
  createdAt: true,
  itemsCount: true,
  documentsCount: true,
  subfolderCount: true,
});

// Schema para Documento
export const DocumentSchema = z.object({
  id: UuidSchema.optional(),
  name: z.string()
    .min(1, 'Nome do arquivo é obrigatório')
    .max(255, 'Nome do arquivo deve ter no máximo 255 caracteres'),
  docNumber: z.string()
    .max(20, 'Número do documento deve ter no máximo 20 caracteres')
    .optional(),
  mimeType: z.string().min(1, 'Tipo MIME é obrigatório'),
  size: z.number()
    .int()
    .min(1, 'Tamanho do arquivo deve ser maior que 0')
    .max(100 * 1024 * 1024, 'Arquivo deve ter no máximo 100MB'),
  clientId: UuidSchema,
  caseId: UuidSchema,
  folderId: UuidSchema.optional(),
  type: z.enum(['pdf', 'docx', 'xlsx', 'image', 'audio', 'video', 'other'], {
    errorMap: () => ({ message: 'Tipo de arquivo inválido' })
  }),
  description: z.string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional()
    .or(z.literal('')),
  webViewLink: z.string().url().optional(),
  downloadLink: z.string().url().optional(),
  thumbnailLink: z.string().url().optional(),
  createdAt: z.string().datetime().optional(),
  modifiedAt: z.string().datetime().optional(),
  appProperties: z.record(z.any()).optional(),
});

export const CreateDocumentSchema = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  size: z.number().int().min(1).max(100 * 1024 * 1024),
  clientId: UuidSchema.optional().or(z.literal('')),
  caseId: UuidSchema.optional().or(z.literal('')),
  folderId: UuidSchema.optional(),
  type: z.string().min(1),
  docNumber: z.string().max(20).optional(),
  description: z.string().max(500).optional().or(z.literal('')),
  supabaseStoragePath: z.string().min(1),
});

export const UpdateDocumentSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  docNumber: z.string().max(20).optional().or(z.literal('')),
  description: z.string().max(500).optional().or(z.literal('')),
  folderId: UuidSchema.optional().or(z.literal('')),
});

// Schema para Fatos
export const PetitionSchema = z.object({
  id: UuidSchema.optional(),
  title: z.string()
    .min(5, 'Título deve ter pelo menos 5 caracteres')
    .max(200, 'Título deve ter no máximo 200 caracteres')
    .trim(),
  clientId: UuidSchema,
  caseId: UuidSchema,
  content: z.string().min(10, 'Conteúdo deve ter pelo menos 10 caracteres'),
  status: z.enum(['draft', 'review', 'final', 'sent'], {
    errorMap: () => ({ message: 'Status deve ser: draft, review, final ou sent' })
  }),
  template: z.string().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const CreatePetitionSchema = PetitionSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const UpdatePetitionSchema = CreatePetitionSchema.partial().omit({ 
  clientId: true, 
  caseId: true 
});

// Schema para Fato
export const FactSchema = z.object({
  id: UuidSchema.optional(),
  type: z.enum(['contratual', 'processual', 'probatório', 'comunicação'], {
    errorMap: () => ({ message: 'Tipo deve ser: contratual, processual, probatório ou comunicação' })
  }),
  text: z.string()
    .min(10, 'Texto do fato deve ter pelo menos 10 caracteres')
    .max(1000, 'Texto do fato deve ter no máximo 1000 caracteres'),
  documentRefs: z.array(UuidSchema).optional(),
  tags: z.array(z.string().max(50)).optional(),
  confidence: z.number()
    .min(0, 'Confiança deve ser entre 0 e 1')
    .max(1, 'Confiança deve ser entre 0 e 1')
    .optional(),
  petitionId: UuidSchema,
  createdAt: z.string().datetime().optional(),
});

export const CreateFactSchema = FactSchema.omit({ 
  id: true, 
  createdAt: true 
});

// Schema para Configurações
export const SettingsSchema = z.object({
  naming: z.object({
    pattern: z.string().min(1, 'Padrão de nomenclatura é obrigatório'),
    uppercaseClient: z.boolean(),
    useUnderscores: z.boolean(),
    seqResetPerClient: z.boolean(),
    dateFormat: z.string().min(1, 'Formato de data é obrigatório'),
  }),
  petition: z.object({
    template: z.string().min(10, 'Template deve ter pelo menos 10 caracteres'),
    factCategories: z.array(z.string().min(1)).min(1, 'Pelo menos uma categoria é obrigatória'),
    autoExtractFacts: z.boolean(),
  }),
  classification: z.object({
    enabled: z.boolean(),
    rules: z.array(z.object({
      id: z.string().min(1),
      match: z.string().min(1, 'Padrão de match é obrigatório'),
      type: z.string().min(1, 'Tipo é obrigatório'),
      priority: z.number().int().min(1).max(100),
      enabled: z.boolean(),
    })),
  }),
  integrations: z.object({
    googleDrive: z.object({
      connected: z.boolean(),
    }),
  }),
});

// Schema para Upload
export const UploadSchema = z.object({
  file: z.instanceof(File, { message: 'Arquivo é obrigatório' }),
  folderPath: z.string().min(1, 'Caminho da pasta é obrigatório'),
  documentData: CreateDocumentSchema.omit({ supabaseStoragePath: true }),
});

// Schema para filtros de busca
export const DocumentFiltersSchema = z.object({
  clientId: UuidSchema.optional(),
  caseId: UuidSchema.optional(),
  folderId: UuidSchema.optional(),
  type: z.string().optional(),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }).optional(),
  sizeRange: z.object({
    min: z.number().int().min(0),
    max: z.number().int().min(0),
  }).optional(),
}).refine(data => {
  if (data.sizeRange) {
    return data.sizeRange.min <= data.sizeRange.max;
  }
  return true;
}, {
  message: 'Tamanho mínimo deve ser menor ou igual ao máximo',
  path: ['sizeRange'],
});

/**
 * Função helper para validar dados
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Erro de validação: ${messages.join(', ')}`);
    }
    throw error;
  }
}

/**
 * Função helper para validação parcial (não lança erro)
 */
export function validateDataSafe<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  try {
    const validData = schema.parse(data);
    return { success: true, data: validData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { success: false, errors };
    }
    return { success: false, errors: ['Erro de validação desconhecido'] };
  }
}
