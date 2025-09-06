# DocFlow-AI Backend Services

Este documento descreve as rotas e serviços do backend integrados com Supabase.

## 🏗️ Arquitetura dos Services

O sistema está organizado em **6 services principais**:

### 1. **ClientService** - Gerenciamento de Clientes
```typescript
import { ClientService } from "@/services/clientService";

// Buscar todos os clientes
const clients = await ClientService.getClients();

// Criar novo cliente
const newClient = await ClientService.createClient({
  name: "João Silva",
  email: "joao@email.com",
  phone: "(11) 99999-9999"
});

// Buscar por ID
const client = await ClientService.getClientById("client-id");

// Atualizar cliente
const updated = await ClientService.updateClient("client-id", {
  name: "João da Silva"
});

// Deletar cliente
await ClientService.deleteClient("client-id");

// Buscar clientes (search)
const results = await ClientService.searchClients("João");
```

### 2. **CaseService** - Gerenciamento de Casos
```typescript
import { CaseService } from "@/services/caseService";

// Buscar casos (todos ou de um cliente)
const cases = await CaseService.getCases("client-id");

// Criar novo caso
const newCase = await CaseService.createCase({
  name: "Processo Trabalhista",
  clientId: "client-id",
  reference: "5005719-85.2024.4.03.6109",
  description: "Ação trabalhista por rescisão indireta",
  status: "active"
});

// Atualizar caso
const updated = await CaseService.updateCase("case-id", {
  status: "closed"
});
```

### 3. **FolderService** - Gerenciamento de Pastas
```typescript
import { FolderService } from "@/services/folderService";

// Buscar pastas (raiz ou subpastas)
const folders = await FolderService.getFolders(); // Pastas raiz
const subfolders = await FolderService.getFolders("parent-id");

// Criar nova pasta
const newFolder = await FolderService.createFolder({
  name: "Contratos",
  kind: "subfolder",
  parentId: "client-folder-id",
  clientId: "client-id",
  path: "João Silva/Contratos"
});

// Buscar pastas
const results = await FolderService.searchFolders("João Silva");
```

### 4. **DocumentService** - Upload e Gerenciamento de Documentos
```typescript
import { DocumentService } from "@/services/documentService";

// Upload de arquivo
const storagePath = await DocumentService.uploadFile(
  file, 
  "clients/client-id/folder", 
  (progress) => console.log(`${progress}%`)
);

// Criar documento no banco
const document = await DocumentService.createDocument({
  name: "contrato.pdf",
  mimeType: "application/pdf",
  size: 1024000,
  clientId: "client-id",
  caseId: "case-id",
  folderId: "folder-id",
  type: "pdf",
  docNumber: "DOC n. 001",
  supabaseStoragePath: storagePath
});

// Buscar documentos
const docs = await DocumentService.getDocuments({
  clientId: "client-id",
  caseId: "case-id"
});

// Gerar URL de download
const downloadUrl = await DocumentService.getDownloadUrl("doc-id");

// Gerar próximo número
const nextNumber = await DocumentService.getNextDocNumber("client-id");
```

### 5. **PetitionService** - Geração de Fatos
```typescript
import { PetitionService } from "@/services/petitionService";

// Criar petição
const petition = await PetitionService.createPetition({
  title: "Petição Inicial - Processo Trabalhista",
  clientId: "client-id",
  caseId: "case-id",
  content: "# PETIÇÃO INICIAL...",
  documentIds: ["doc1", "doc2"],
  template: "template-id",
  status: "draft"
});

// Adicionar fato à petição
const fact = await PetitionService.addFactToPetition("petition-id", {
  type: "contratual",
  text: "O contrato foi assinado em 15/01/2024...",
  documentRefs: ["doc-id"],
  confidence: 0.95
});

// Exportar petição
const blob = await PetitionService.exportPetition("petition-id", "pdf");
```

### 6. **SettingsService** - Configurações do Usuário
```typescript
import { SettingsService } from "@/services/settingsService";

// Buscar configurações
const settings = await SettingsService.getUserSettings();

// Atualizar configurações
const updated = await SettingsService.updateUserSettings({
  naming: {
    pattern: "DOC n. {seq} - {client} - {date}",
    uppercaseClient: true,
    useUnderscores: false,
    seqResetPerClient: true,
    dateFormat: "dd/MM/yyyy"
  },
  petition: {
    template: "# PETIÇÃO INICIAL\n\n{content}",
    factCategories: ["contratual", "processual", "probatório"],
    autoExtractFacts: true
  }
});

// Resetar para padrão
const defaults = await SettingsService.resetToDefaults();
```

## 🎣 Hooks React Query

Para facilitar o uso no frontend, criamos hooks customizados:

### Hooks de Clientes
```typescript
import { useClients, useCreateClient, useUpdateClient } from "@/hooks/useClients";

function ClientList() {
  const { data: clients, isLoading } = useClients();
  const createMutation = useCreateClient();
  
  const handleCreate = () => {
    createMutation.mutate({
      name: "Novo Cliente",
      email: "cliente@email.com"
    });
  };
  
  return (
    <div>
      {isLoading ? "Carregando..." : clients?.map(client => (
        <div key={client.id}>{client.name}</div>
      ))}
      <button onClick={handleCreate}>Criar Cliente</button>
    </div>
  );
}
```

### Hooks de Upload Inteligente
```typescript
import { useSmartUpload } from "@/hooks/useSmartUpload";

function UploadPage() {
  const {
    uploadFiles,
    addFiles,
    processUploads,
    isUploading,
    completedCount
  } = useSmartUpload();
  
  const handleDrop = (files: File[]) => {
    addFiles(files, {
      type: "existing_folder",
      folderId: "selected-folder-id"
    });
  };
  
  return (
    <div>
      <DropZone onDrop={handleDrop} />
      <button 
        onClick={processUploads} 
        disabled={isUploading}
      >
        {isUploading ? "Enviando..." : "Enviar Arquivos"}
      </button>
      <p>{completedCount} arquivos enviados</p>
    </div>
  );
}
```

## 🔗 Integração com Supabase

### Storage de Arquivos
- **Bucket**: `documents`
- **Estrutura**: `clients/{clientId}/{folderName}/{filename}`
- **Políticas RLS**: Apenas o usuário proprietário pode acessar seus arquivos

### Tabelas Principais
- **clients**: Informações dos clientes
- **cases**: Casos jurídicos
- **folders**: Estrutura hierárquica de pastas
- **documents**: Metadados dos documentos
- **petitions**: Fatos geradas
- **facts**: Fatos extraídos dos documentos
- **user_settings**: Configurações personalizadas

### Autenticação
```typescript
import { supabase } from "@/integrations/supabase/client";

// Verificar usuário logado
const { data: user } = await supabase.auth.getUser();

// Todos os services verificam automaticamente a autenticação
// e filtram dados pelo user_id
```

## 🚀 Como Usar

### 1. **Upload Simples**
```typescript
// Upload direto para pasta existente
const { mutate: upload } = useUploadDocument();

upload({
  file: selectedFile,
  folderPath: "clients/client-id/contratos",
  documentData: {
    name: selectedFile.name,
    mimeType: selectedFile.type,
    size: selectedFile.size,
    clientId: "client-id",
    caseId: "case-id",
    type: detectFileType(selectedFile.name)
  }
});
```

### 2. **Upload com Criação Automática**
```typescript
// Upload com criação automática de estruturas
const { processUploads, addFiles } = useSmartUpload();

// Adicionar arquivos para novo cliente
addFiles(files, {
  type: "new_client",
  clientName: "Maria Santos"
});

// Processar uploads (cria cliente, pasta e caso automaticamente)
await processUploads();
```

### 3. **Busca Avançada**
```typescript
// Buscar documentos com filtros
const { data: documents } = useDocuments({
  clientId: "client-id",
  caseId: "case-id",
  type: "pdf"
});

// Buscar com texto
const { data: results } = useSearchDocuments("contrato", {
  clientId: "client-id"
});
```

## 🛡️ Segurança

- **Row Level Security (RLS)** ativado em todas as tabelas
- **Filtros automáticos** por `user_id` em todos os services
- **Validação de autenticação** em cada operação
- **URLs temporárias** para download de arquivos
- **Soft delete** para documentos (marcados como `deleted`)

## ⚡ Performance

- **Cache inteligente** com React Query
- **Invalidação automática** de cache após mutações
- **Stale time** otimizado por tipo de dados
- **Parallel uploads** para múltiplos arquivos
- **Progress tracking** em tempo real

Este sistema de backend está completamente integrado com o frontend React e pronto para uso em produção! 🎉