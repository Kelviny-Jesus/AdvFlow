import { Client, Case, FileItem, FolderItem, Settings, Fact } from "@/types";

export const mockFolders: FolderItem[] = [
  // Pastas de clientes (raiz)
  {
    id: "folder-silva-joao",
    name: "João Silva",
    kind: "client",
    itemsCount: 8,
    documentsCount: 6,
    subfolderCount: 2,
    createdAt: "2024-01-15T10:00:00Z",
    clientId: "silva-joao",
    path: "João Silva"
  },
  {
    id: "folder-santos-maria",
    name: "Maria Santos", 
    kind: "client",
    itemsCount: 3,
    documentsCount: 1,
    subfolderCount: 2,
    createdAt: "2024-02-10T14:30:00Z",
    clientId: "santos-maria",
    path: "Maria Santos"
  },
  {
    id: "folder-acme-sa",
    name: "ACME S.A.",
    kind: "client", 
    itemsCount: 7,
    documentsCount: 2,
    subfolderCount: 5,
    createdAt: "2024-01-20T09:15:00Z",
    clientId: "acme-sa",
    path: "ACME S.A."
  },
  
  // Subpastas do João Silva
  {
    id: "subfolder-silva-trabalhista",
    name: "Processo Trabalhista",
    parentId: "folder-silva-joao",
    kind: "case",
    itemsCount: 4,
    documentsCount: 4,
    subfolderCount: 0,
    createdAt: "2024-01-15T10:30:00Z",
    clientId: "silva-joao",
    path: "João Silva/Processo Trabalhista"
  },
  {
    id: "subfolder-silva-divorcio", 
    name: "Divórcio Consensual",
    parentId: "folder-silva-joao",
    kind: "case",
    itemsCount: 2,
    documentsCount: 2,
    subfolderCount: 0,
    createdAt: "2024-02-01T11:00:00Z",
    clientId: "silva-joao",
    path: "João Silva/Divórcio Consensual"
  },
  
  // Subpastas da Maria Santos
  {
    id: "subfolder-santos-inventario",
    name: "Inventário",
    parentId: "folder-santos-maria",
    kind: "case",
    itemsCount: 1,
    documentsCount: 1,
    subfolderCount: 0,
    createdAt: "2024-02-10T15:00:00Z",
    clientId: "santos-maria",
    path: "Maria Santos/Inventário"
  },
  {
    id: "subfolder-santos-contratos",
    name: "Contratos",
    parentId: "folder-santos-maria", 
    kind: "subfolder",
    itemsCount: 0,
    documentsCount: 0,
    subfolderCount: 0,
    createdAt: "2024-02-15T10:00:00Z",
    clientId: "santos-maria",
    path: "Maria Santos/Contratos"
  },
  
  // Subpastas da ACME S.A.
  {
    id: "subfolder-acme-tributario",
    name: "Questões Tributárias",
    parentId: "folder-acme-sa",
    kind: "case",
    itemsCount: 1,
    documentsCount: 1,
    subfolderCount: 0,
    createdAt: "2024-01-20T16:20:00Z",
    clientId: "acme-sa",
    path: "ACME S.A./Questões Tributárias"
  },
  {
    id: "subfolder-acme-trabalhista",
    name: "Ações Trabalhistas",
    parentId: "folder-acme-sa",
    kind: "case", 
    itemsCount: 1,
    documentsCount: 1,
    subfolderCount: 0,
    createdAt: "2024-03-01T08:45:00Z",
    clientId: "acme-sa",
    path: "ACME S.A./Ações Trabalhistas"
  },
  {
    id: "subfolder-acme-contratos",
    name: "Contratos",
    parentId: "folder-acme-sa",
    kind: "subfolder",
    itemsCount: 0, 
    documentsCount: 0,
    subfolderCount: 0,
    createdAt: "2024-01-22T14:00:00Z",
    clientId: "acme-sa",
    path: "ACME S.A./Contratos"
  },
  {
    id: "subfolder-acme-fiscal",
    name: "Documentos Fiscais",
    parentId: "folder-acme-sa",
    kind: "subfolder",
    itemsCount: 0,
    documentsCount: 0,
    subfolderCount: 0,
    createdAt: "2024-01-25T09:30:00Z", 
    clientId: "acme-sa",
    path: "ACME S.A./Documentos Fiscais"
  },
  {
    id: "subfolder-acme-rh",
    name: "Recursos Humanos",
    parentId: "folder-acme-sa",
    kind: "subfolder",
    itemsCount: 0,
    documentsCount: 0,
    subfolderCount: 0,
    createdAt: "2024-02-01T16:45:00Z",
    clientId: "acme-sa",
    path: "ACME S.A./Recursos Humanos"
  }
];

export const mockClients: Client[] = [
  {
    id: "silva-joao",
    name: "João Silva",
    email: "joao.silva@email.com",
    phone: "(11) 99999-1111",
    createdAt: "2024-01-15T10:00:00Z",
    casesCount: 2,
  },
  {
    id: "santos-maria", 
    name: "Maria Santos",
    email: "maria.santos@email.com",
    phone: "(11) 99999-2222",
    createdAt: "2024-02-10T14:30:00Z",
    casesCount: 1,
  },
  {
    id: "acme-sa",
    name: "ACME S.A.",
    email: "juridico@acme.com.br",
    phone: "(11) 99999-3333",
    createdAt: "2024-01-20T09:15:00Z",
    casesCount: 2,
  },
];

export const mockCases: Case[] = [
  {
    id: "silva-trabalhista",
    name: "Processo Trabalhista",
    clientId: "silva-joao",
    reference: "5005719-85.2024.4.03.6109",
    description: "Ação trabalhista por rescisão indireta",
    status: "active",
    createdAt: "2024-01-15T10:30:00Z",
    documentsCount: 4,
  },
  {
    id: "silva-divorcio",
    name: "Divórcio Consensual",
    clientId: "silva-joao", 
    reference: "0001234-56.2024.8.26.0001",
    description: "Divórcio litigioso com partilha de bens",
    status: "active",
    createdAt: "2024-02-01T11:00:00Z",
    documentsCount: 2,
  },
  {
    id: "santos-inventario",
    name: "Inventário",
    clientId: "santos-maria",
    reference: "1001234-12.2024.8.26.0100", 
    description: "Inventário e partilha - falecimento do cônjuge",
    status: "active",
    createdAt: "2024-02-10T15:00:00Z",
    documentsCount: 1,
  },
  {
    id: "acme-tributario",
    name: "Questionamento Tributário",
    clientId: "acme-sa",
    reference: "0801234-78.2024.4.03.6100",
    description: "Impugnação de auto de infração - ICMS",
    status: "active", 
    createdAt: "2024-01-20T16:20:00Z",
    documentsCount: 3,
  },
  {
    id: "acme-trabalhista",
    name: "Ação Trabalhista Coletiva",
    clientId: "acme-sa",
    reference: "5001111-22.2024.5.02.0011",
    description: "Ação anulatória de norma coletiva",
    status: "active",
    createdAt: "2024-03-01T08:45:00Z",
    documentsCount: 2,
  },
];

export const mockFiles: FileItem[] = [
  {
    id: "file-001",
    name: "DOC n. 001 + SILVA_JOAO + CONTRATO_TRABALHO + 2024-01-15.pdf",
    docNumber: "DOC n. 001",
    mimeType: "application/pdf",
    size: 2548000,
    clientId: "silva-joao",
    caseId: "silva-trabalhista", 
    type: "pdf",
    webViewLink: "#",
    downloadLink: "#",
    createdAt: "2024-01-15T10:45:00Z",
    modifiedAt: "2024-01-15T10:45:00Z",
    description: "Contrato de trabalho original - CLT",
    appProperties: {
      documentType: "CONTRATO_TRABALHO",
      processingDate: "2024-01-15",
      folderId: "subfolder-silva-trabalhista"
    },
  },
  {
    id: "file-002", 
    name: "DOC n. 002 + SILVA_JOAO + HOLERITE + 2024-01-16.pdf",
    docNumber: "DOC n. 002",
    mimeType: "application/pdf",
    size: 156000,
    clientId: "silva-joao",
    caseId: "silva-trabalhista",
    type: "pdf", 
    webViewLink: "#",
    downloadLink: "#",
    createdAt: "2024-01-16T09:30:00Z",
    modifiedAt: "2024-01-16T09:30:00Z",
    description: "Holerites dos últimos 12 meses",
    appProperties: {
      documentType: "HOLERITE",
      processingDate: "2024-01-16",
      folderId: "subfolder-silva-trabalhista"
    },
  },
  {
    id: "file-003",
    name: "DOC n. 003 + SILVA_JOAO + AUDIO_REUNIAO + 2024-01-20.mp3", 
    docNumber: "DOC n. 003",
    mimeType: "audio/mpeg",
    size: 45600000,
    clientId: "silva-joao",
    caseId: "silva-trabalhista",
    type: "audio",
    webViewLink: "#",
    downloadLink: "#", 
    createdAt: "2024-01-20T14:15:00Z",
    modifiedAt: "2024-01-20T14:15:00Z",
    description: "Gravação da reunião com RH - assédio moral",
    appProperties: {
      documentType: "AUDIO_REUNIAO",
      processingDate: "2024-01-20",
      duration: "00:23:45",
      folderId: "subfolder-silva-trabalhista"
    },
  },
  {
    id: "file-004",
    name: "DOC n. 004 + SILVA_JOAO + LAUDO_MEDICO + 2024-01-25.pdf",
    docNumber: "DOC n. 004", 
    mimeType: "application/pdf",
    size: 890000,
    clientId: "silva-joao",
    caseId: "silva-trabalhista",
    type: "pdf",
    webViewLink: "#",
    downloadLink: "#",
    createdAt: "2024-01-25T11:20:00Z",
    modifiedAt: "2024-01-25T11:20:00Z",
    description: "Laudo médico - estresse ocupacional",
    appProperties: {
      documentType: "LAUDO_MEDICO", 
      processingDate: "2024-01-25",
      folderId: "subfolder-silva-trabalhista"
    },
  },
  {
    id: "file-005",
    name: "DOC n. 005 + SILVA_JOAO + CERTIDAO_CASAMENTO + 2024-02-01.pdf",
    docNumber: "DOC n. 005",
    mimeType: "application/pdf", 
    size: 340000,
    clientId: "silva-joao",
    caseId: "silva-divorcio",
    type: "pdf",
    webViewLink: "#",
    downloadLink: "#",
    createdAt: "2024-02-01T11:30:00Z",
    modifiedAt: "2024-02-01T11:30:00Z",
    description: "Certidão de casamento atualizada",
    appProperties: {
      documentType: "CERTIDAO_CASAMENTO",
      processingDate: "2024-02-01",
      folderId: "subfolder-silva-divorcio"
    },
  },
  {
    id: "file-006",
    name: "DOC n. 006 + SILVA_JOAO + INVENTARIO_BENS + 2024-02-05.docx",
    docNumber: "DOC n. 006", 
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    size: 125000,
    clientId: "silva-joao",
    caseId: "silva-divorcio",
    type: "docx",
    webViewLink: "#", 
    downloadLink: "#",
    createdAt: "2024-02-05T16:10:00Z",
    modifiedAt: "2024-02-05T16:10:00Z",
    description: "Inventário de bens do casal",
    appProperties: {
      documentType: "INVENTARIO_BENS",
      processingDate: "2024-02-05",
      folderId: "subfolder-silva-divorcio"
    },
  },
  {
    id: "file-007",
    name: "DOC n. 007 + SANTOS_MARIA + CERTIDAO_OBITO + 2024-02-10.pdf",
    docNumber: "DOC n. 007",
    mimeType: "application/pdf",
    size: 280000,
    clientId: "santos-maria",
    caseId: "santos-inventario", 
    type: "pdf",
    webViewLink: "#",
    downloadLink: "#",
    createdAt: "2024-02-10T15:30:00Z",
    modifiedAt: "2024-02-10T15:30:00Z",
    description: "Certidão de óbito do cônjuge",
    appProperties: {
      documentType: "CERTIDAO_OBITO",
      processingDate: "2024-02-10",
      folderId: "subfolder-santos-inventario"
    },
  },
  {
    id: "file-008",
    name: "DOC n. 008 + ACME_SA + AUTO_INFRACAO + 2024-01-20.pdf",
    docNumber: "DOC n. 008", 
    mimeType: "application/pdf",
    size: 1200000,
    clientId: "acme-sa",
    caseId: "acme-tributario",
    type: "pdf",
    webViewLink: "#",
    downloadLink: "#",
    createdAt: "2024-01-20T16:45:00Z",
    modifiedAt: "2024-01-20T16:45:00Z", 
    description: "Auto de infração - ICMS R$ 250.000",
    appProperties: {
      documentType: "AUTO_INFRACAO",
      processingDate: "2024-01-20",
      valor: "250000.00",
      folderId: "subfolder-acme-tributario"
    },
  },
];

export const defaultSettings: Settings = {
  naming: {
    pattern: "DOC n. {seq} + {client} + {type} + {date}",
    uppercaseClient: true,
    useUnderscores: true, 
    seqResetPerClient: true,
    dateFormat: "YYYY-MM-DD",
  },
  petition: {
    template: `NARRATIVA FÁTICA - [CLIENT_NAME] - [CASE_REFERENCE]

Data: [PROCESSING_DATE]

I. DOS FATOS

[FACTS]

II. DOS DOCUMENTOS

[DOCUMENTS_TABLE] 

III. DO DIREITO

(A ser preenchido com fundamentação jurídica)

IV. DOS PEDIDOS

(A ser preenchido conforme o caso)

Termos em que pede deferimento.

Local, data.

_____________________
Advogado(a)
OAB/XX nº XXXXX`,
    factCategories: ["contratual", "processual", "probatório"],
    autoExtractFacts: true,
  },
  classification: {
    rules: [
      {
        id: "rule-1",
        match: "atestad",
        type: "ATESTADO_MATRICULA", 
        priority: 10,
        enabled: true,
      },
      {
        id: "rule-2",
        match: "contrato",
        type: "CONTRATO",
        priority: 9,
        enabled: true,
      },
      {
        id: "rule-3", 
        match: "holerite",
        type: "HOLERITE",
        priority: 8,
        enabled: true,
      },
      {
        id: "rule-4",
        match: "certidao",
        type: "CERTIDAO",
        priority: 7,
        enabled: true,
      },
    ],
    enabled: true,
  },
  integrations: {
    googleDrive: {
      connected: false,
    },
  },
};

export const mockFacts: Fact[] = [
  {
    id: "fact-1",
    type: "contratual",
    text: "O autor foi contratado pela ré em 15/01/2020 para exercer a função de analista financeiro.",
    documentRefs: ["file-001"],
    tags: ["contratação", "função"],
    confidence: 0.95,
  },
  {
    id: "fact-2", 
    type: "probatório",
    text: "Durante reunião gravada em áudio, o superior hierárquico proferiu ofensas pessoais contra o autor.",
    documentRefs: ["file-003"],
    tags: ["assédio", "prova"],
    confidence: 0.89,
  },
  {
    id: "fact-3",
    type: "processual",
    text: "Laudo médico comprova desenvolvimento de quadro de estresse ocupacional em decorrência do ambiente de trabalho.", 
    documentRefs: ["file-004"],
    tags: ["dano", "nexo-causal"],
    confidence: 0.92,
  },
];

// Função para buscar dados mock 
export const getMockData = {
  clients: () => Promise.resolve({ data: mockClients }),
  folders: (parentId?: string) => {
    const filtered = parentId 
      ? mockFolders.filter(f => f.parentId === parentId)
      : mockFolders.filter(f => !f.parentId); // Pastas raiz
    return Promise.resolve({ data: filtered });
  },
  cases: (clientId?: string) => {
    const filtered = clientId 
      ? mockCases.filter(c => c.clientId === clientId)
      : mockCases;
    return Promise.resolve({ data: filtered });
  },
  files: (folderId?: string, clientId?: string, caseId?: string) => {
    let filtered = mockFiles;
    if (folderId) filtered = filtered.filter(f => f.appProperties?.folderId === folderId);
    else if (clientId) filtered = filtered.filter(f => f.clientId === clientId);
    if (caseId) filtered = filtered.filter(f => f.caseId === caseId);
    return Promise.resolve({ data: filtered });
  },
  settings: () => Promise.resolve({ data: defaultSettings }),
  facts: (documentIds: string[]) => {
    const filtered = mockFacts.filter(f => 
      f.documentRefs?.some(ref => documentIds.includes(ref))
    );
    return Promise.resolve({ data: filtered });
  },
};