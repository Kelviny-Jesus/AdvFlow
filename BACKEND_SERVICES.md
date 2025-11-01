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

// Criar Fatos
const petition = await PetitionService.createPetition({
  title: "Fatos Inicial - Processo Trabalhista",
  clientId: "client-id",
  caseId: "case-id",
  content: "# Fatos INICIAL...",
  documentIds: ["doc1", "doc2"],
  template: "template-id",
  status: "draft"
});

// Adicionar fato à Fatos
const fact = await PetitionService.addFactToPetition("petition-id", {
  type: "contratual",
  text: "O contrato foi assinado em 15/01/2024...",
  documentRefs: ["doc-id"],
  confidence: 0.95
});

// Exportar Fatos
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
    template: "# Fatos INICIAL\n\n{content}",
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

---

## 🤖 Configurações de IA

### Modelo Atual: GPT-5

O sistema utiliza o modelo `gpt-5` da OpenAI para geração de fatos e renomeação inteligente de documentos.

#### Rate Limits (Tier 2)
- **TPM (Tokens por Minuto):** 500,000
- **RPM (Requests por Minuto):** 500
- **TPD (Tokens por Dia):** 1,500,000

#### Parâmetros Suportados
O GPT-5 **não suporta** os parâmetros tradicionais de customização:
- ❌ `temperature`
- ❌ `top_p`
- ❌ `frequency_penalty`
- ❌ `presence_penalty`

**Parâmetro único suportado:**
- ✅ `max_completion_tokens` (substitui o antigo `max_tokens`)

### Rate Limiter (`src/lib/rateLimiter.ts`)

Configurações de controle de taxa para evitar exceder limites da API:

```typescript
const TPM_BUDGET = 490000;  // 490k tokens/min (margem de 10k)
const RPM_BUDGET = 490;      // 490 requests/min (margem de 10)
```

**Funcionalidades:**
- Sistema de lock/semáforo para sincronização de requests
- Reserva de tokens antes de cada chamada
- Liberação automática de tokens em caso de erro
- Janela deslizante de 60 segundos
- Logs detalhados de utilização

### Facts AI Service (`src/services/factsAIService.ts`)

Serviço responsável por gerar sínteses e procurações usando IA.

#### Configurações Críticas

```typescript
TIMEOUT: 300000              // 5 minutos (300s)
MAX_TOKENS_PER_REQUEST: 100000   // 100k tokens por chunk
MAX_OUTPUT_TOKENS: 16000         // 16k tokens para resposta
```

#### Por que esses valores?

**1. TIMEOUT = 5 minutos**
- GPT-5 usa "reasoning tokens" (raciocínio interno) que aumentam tempo de processamento
- Requests grandes (~200k tokens) precisam de mais tempo
- Timeout anterior de 2 minutos causava abortos prematuros

**2. MAX_TOKENS_PER_REQUEST = 100k tokens**
- Aproveita melhor o contexto grande do GPT-5
- Reduz número de chunks (menos divisões = mais rápido)
- Anterior era 25k, causava fragmentação excessiva

**3. MAX_OUTPUT_TOKENS = 16k tokens**
- GPT-5 usa **reasoning tokens** (~1k) que consomem do `max_completion_tokens` mas **não aparecem no `content`**
- Espaço necessário: reasoning (~1k) + resposta real (~15k)
- Valor anterior de 1k resultava em respostas vazias (`content: ""`)

#### Estrutura da Resposta GPT-5

```json
{
  "choices": [{
    "message": {
      "content": "Resposta visível ao usuário",
      "role": "assistant"
    },
    "finish_reason": "length" | "stop"
  }],
  "usage": {
    "completion_tokens": 16000,
    "completion_tokens_details": {
      "reasoning_tokens": 1000,    // ← Raciocínio interno (invisível)
      "audio_tokens": 0,
      "accepted_prediction_tokens": 0,
      "rejected_prediction_tokens": 0
    }
  }
}
```

**⚠️ IMPORTANTE:** Os `reasoning_tokens` são contabilizados no `completion_tokens` total mas **não aparecem** no campo `content`. Por isso é crítico deixar margem generosa no `max_completion_tokens`.

### AI Renaming Service (`src/services/aiRenamingService.ts`)

Serviço para renomeação inteligente de documentos.

```typescript
MODEL: 'gpt-5'
TIMEOUT: 30000               // 30 segundos
max_completion_tokens: 100   // Nomes curtos, precisa menos tokens
```

### Padrões de Logs

Todos os logs do sistema **não utilizam emojis** para facilitar parsing e análise automática.

**Exemplo:**
```typescript
// ❌ Evitar
console.log('🤖 Iniciando processamento...');

// ✅ Usar
console.log('Iniciando processamento...');
```

### Troubleshooting Comum

#### 1. "Content vazio" / "No response from OpenAI"
**Causa:** `max_completion_tokens` muito baixo
**Solução:** Aumentar para pelo menos 16k para dar espaço aos reasoning tokens

#### 2. "Timeout in facts generation"
**Causa:** Timeout muito curto para requests grandes
**Solução:** Aumentar `TIMEOUT` para 300000ms (5 minutos)

#### 3. "Unsupported parameter: 'temperature'"
**Causa:** GPT-5 não aceita parâmetros de customização
**Solução:** Remover todos os parâmetros exceto `max_completion_tokens`

#### 4. "Orçamento de tokens insuficientes"
**Causa:** Race condition no rate limiter ou budget muito baixo
**Solução:** Sistema já implementa lock/semáforo com 490k TPM budget