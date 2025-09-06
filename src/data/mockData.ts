import { Document, Client, Case } from "@/types/document";

export const mockClients: Client[] = [
  {
    id: "1",
    name: "Silva & Associados",
    email: "contato@silva.com.br",
    cases: [],
  },
  {
    id: "2",
    name: "Empresa ABC Ltda",
    email: "juridico@abc.com.br",
    cases: [],
  },
  {
    id: "3",
    name: "João Santos",
    email: "joao.santos@email.com",
    cases: [],
  },
  {
    id: "4",
    name: "Tech Solutions",
    email: "legal@techsolutions.com",
    cases: [],
  },
];

export const mockCases: Case[] = [
  {
    id: "1",
    name: "Processo Trabalhista 001",
    clientId: "1",
    documents: [],
    createdAt: new Date('2024-01-15'),
  },
  {
    id: "2",
    name: "Contrato de Prestação de Serviços",
    clientId: "1",
    documents: [],
    createdAt: new Date('2024-01-20'),
  },
  {
    id: "3",
    name: "Análise de Compliance",
    clientId: "2",
    documents: [],
    createdAt: new Date('2024-02-01'),
  },
  {
    id: "4",
    name: "Revisão Contratual",
    clientId: "2",
    documents: [],
    createdAt: new Date('2024-02-10'),
  },
  {
    id: "5",
    name: "Divórcio Consensual",
    clientId: "3",
    documents: [],
    createdAt: new Date('2024-02-15'),
  },
  {
    id: "6",
    name: "Propriedade Intelectual",
    clientId: "4",
    documents: [],
    createdAt: new Date('2024-03-01'),
  },
];

export const mockDocuments: Document[] = [
  {
    id: "1",
    name: "Contrato_Trabalho_Silva_2024.pdf",
    type: "pdf",
    size: 2540000,
    uploadDate: new Date('2024-03-15T10:30:00'),
    client: "Silva & Associados",
    case: "Processo Trabalhista 001",
    status: "completed",
    url: "#",
    metadata: {
      pages: 15,
      author: "Dr. Silva",
    },
  },
  {
    id: "2",
    name: "Planilha_Custos_ABC.xlsx",
    type: "excel",
    size: 1250000,
    uploadDate: new Date('2024-03-14T14:20:00'),
    client: "Empresa ABC Ltda",
    case: "Análise de Compliance",
    status: "completed",
    url: "#",
    metadata: {
      sheets: 3,
      lastModified: new Date('2024-03-14T12:00:00'),
    },
  },
  {
    id: "3",
    name: "Parecer_Juridico_Santos.docx",
    type: "word",
    size: 890000,
    uploadDate: new Date('2024-03-13T16:45:00'),
    client: "João Santos",
    case: "Divórcio Consensual",
    status: "processing",
    metadata: {
      wordCount: 2500,
    },
  },
  {
    id: "4",
    name: "Audiencia_Gravacao.mp3",
    type: "audio",
    size: 45600000,
    uploadDate: new Date('2024-03-12T09:15:00'),
    client: "Silva & Associados",
    case: "Processo Trabalhista 001",
    status: "completed",
    url: "#",
    metadata: {
      duration: "01:23:45",
      quality: "128kbps",
    },
  },
  {
    id: "5",
    name: "Foto_Documento_ID.jpg",
    type: "image",
    size: 3200000,
    uploadDate: new Date('2024-03-11T11:30:00'),
    client: "João Santos",
    case: "Divórcio Consensual",
    status: "completed",
    url: "#",
    metadata: {
      resolution: "1920x1080",
      format: "JPEG",
    },
  },
  {
    id: "6",
    name: "Registro_Marca_TechSolutions.pdf",
    type: "pdf",
    size: 1800000,
    uploadDate: new Date('2024-03-10T13:20:00'),
    client: "Tech Solutions",
    case: "Propriedade Intelectual",
    status: "completed",
    url: "#",
    metadata: {
      pages: 8,
      certified: true,
    },
  },
  {
    id: "7",
    name: "Minuta_Contrato_ABC.docx",
    type: "word",
    size: 650000,
    uploadDate: new Date('2024-03-09T08:45:00'),
    client: "Empresa ABC Ltda",
    case: "Revisão Contratual",
    status: "error",
    metadata: {
      wordCount: 1200,
      error: "Arquivo corrompido",
    },
  },
  {
    id: "8",
    name: "Ata_Reuniao_Silva.pdf",
    type: "pdf",
    size: 450000,
    uploadDate: new Date('2024-03-08T15:10:00'),
    client: "Silva & Associados",
    case: "Contrato de Prestação de Serviços",
    status: "completed",
    url: "#",
    metadata: {
      pages: 3,
      participants: 5,
    },
  },
];

// Update relationships
mockClients.forEach(client => {
  client.cases = mockCases.filter(case_ => case_.clientId === client.id);
});

mockCases.forEach(case_ => {
  case_.documents = mockDocuments.filter(doc => doc.case === case_.name);
});