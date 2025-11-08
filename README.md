# AdvFlow

Sistema de gestão de documentos jurídicos com IA: extração OCR (Google Vision), renomeação por IA e geração de documentos (Síntese/Procuração/Contratos/Petições). Mantém o arquivo original no preview do usuário e cria um PDF pesquisável derivado para a extração.

## Funcionalidades Principais

### Gestão de Documentos
- Upload inteligente (arquivo original mantido no preview)
- Organização hierárquica de pastas (Clientes, Casos, Subpastas)
- Visualização integrada (PDF, imagens, DOCX, áudio, vídeo)
- Navegação com breadcrumbs

### Inteligência Artificial
- Extração automática de dados (Google Vision OCR → PDF pesquisável derivado)
- Renomeação inteligente com OpenAI GPT-5
- Numeração sequencial por cliente
- Geração de documentos com prompt customizável e sugestão em XML (EN)

### Integrações
- Supabase (PostgreSQL + Storage + Auth)
- Google Cloud Vision + Storage (OCR) + Google Drive
- OpenAI (renomeação/geração)


## Tecnologias Utilizadas

### Frontend
- React 18 + TypeScript, Vite, Tailwind, Shadcn/UI, React Query, Framer Motion
- FFmpeg.wasm para conversão `.opus` → `.mp3` (binários servidos de `public/ffmpeg/`)

### Backend (dev)
- Express (API OCR local)
- Google Cloud Vision + Storage
- Supabase (RLS habilitado)

### IA e Processamento
- OpenAI GPT‑5 para renomeação/narrativas
- Vision OCR (imagens síncrono; PDFs assíncrono via GCS)

## Pré‑requisitos

- Node.js 18+ e pnpm 8+
- Conta Supabase (bucket `documents`)
- Projeto GCP com Vision API habilitada e bucket GCS

## Instalação e Configuração

### 1. Clone o Repositório

```bash
git clone <SEU_REPOSITORIO>
cd DocFlow
```

### 2. Instalar Dependências

```bash
pnpm i
# pós-instalação copia @ffmpeg/core para public/ffmpeg
```

### 3. Variáveis de Ambiente

1) Frontend (`docflow/.env.local`)
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_OPENAI_API_KEY=...
VITE_GOOGLE_DRIVE_CLIENT_ID=...
VITE_GOOGLE_DRIVE_API_KEY=...
```

2) Backend OCR (`docflow/.env`)
```
GOOGLE_APPLICATION_CREDENTIALS=/ABS/PATH/para/service-account.json
GCS_BUCKET=seu-bucket-gcs
PORT=3000
```

### 4. Configurar Supabase

#### 4.1 Criar Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Copie a URL e chave anônima para o `.env.local`


### 5. Executar (dev)

```bash
pnpm dev:full   # web + api OCR

# ou separados
pnpm dev        # :8080
pnpm dev:api    # :3000
```

O sistema estará em `http://localhost:8080` (proxy `/api` → `:3000`).

## Guia de Uso

### 1. Upload de Documentos

1. **Acesse a aba "Uploads"**
2. **Selecione uma pasta** (cliente ou caso)
3. **Arraste arquivos** ou clique para selecionar
4. **Aguarde o processamento**:
   - Conversão automática JPG → PDF
   - Upload para Supabase Storage
   - Extração de dados via n8n
   - Renomeação automática com IA

### 2. Navegação de Pastas

1. **Acesse a aba "Pastas"**
2. **Navegue hierarquicamente**:
   - Clientes (pastas principais)
   - Casos (subpastas de clientes)
   - Subpastas (organização adicional)
3. **Visualize documentos** clicando neles
4. **Use breadcrumbs** para navegação

### 3. Geração (Síntese)

1. Acesse a aba de geração
2. Selecione documentos e contextos
3. Escreva instruções adicionais (prompt)
4. Use “Melhore seu prompt” (gera XML em inglês)
5. Gere e salve

## Configurações Avançadas

### OpenAI - Modelos e Prompts

O sistema usa **GPT-5** para:
- **Renomeação de documentos** com classificação específica
- **Geração de narrativas** em português brasileiro
- **Numeração sequencial** por cliente

### OCR (Vision) – Endpoints (dev)

- `POST /api/ocr/convert-image-to-pdf`
- `POST /api/ocr/convert-pdf-to-pdf`

### Supabase - Políticas RLS

O sistema implementa Row Level Security:
- **Usuários** só acessam seus próprios dados
- **Documentos** protegidos por usuário
- **Storage** com políticas de upload/leitura

```

### Erro: "Invalid PDF structure"
- Verifique se a conversão JPG→PDF está funcionando
- Confirme que o arquivo está sendo enviado como PDF para o n8n
- Verifique logs de conversão no console

### Erro: "OpenAI API Key"
- Confirme que `VITE_OPENAI_API_KEY` está no `.env.local`
- Verifique se a chave tem créditos disponíveis
- Teste a chave em [platform.openai.com](https://platform.openai.com)

### Erro: "n8n webhook"
- Confirme que `VITE_N8N_WEBHOOK_URL` está correto
- Teste o webhook manualmente
- Verifique logs de extração no console

## Estrutura do Projeto

```
docflow/
├── src/
│   ├── components/          # DocumentViewer com painel de texto extraído
│   ├── services/           # Serviços de negócio
│   ├── hooks/              # React Query hooks
│   ├── types/              # Definições TypeScript
│   ├── utils/              # Utilitários
│   └── pages/              # Páginas da aplicação
├── server/                 # API OCR (Express)
│   ├── app.js
│   └── routes/ocr.js
├── public/ffmpeg/          # Binários FFmpeg (wasm)
├── supabase/              # Migrações e configurações
└── public/                # Arquivos estáticos
```

## Fluxo de Processamento

1. Upload (arquivo original salvo)
2. OCR (gera PDF pesquisável derivado e usa na extração)
3. Renomeação por IA
4. Organização em pastas
5. Geração de documentos

## Logs e Monitoramento

O sistema gera logs detalhados:
- **Console do navegador** para debug
- **Terminal VS Code** para desenvolvimento
- **Supabase logs** para produção
- **Performance monitoring** integrado

## Deploy

### Desenvolvimento
```bash
pnpm dev:full
```

### Produção
```bash
pnpm build
pnpm preview
```