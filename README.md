# DocFlow-AI - Sistema de Gestão de Documentos Jurídicos

Sistema completo de gestão de documentos jurídicos com IA integrada para extração de dados, renomeação automática e geração de narrativas de fatos.

## 🚀 Funcionalidades Principais

### 📁 Gestão de Documentos
- **Upload inteligente** com conversão automática JPG → PDF
- **Organização hierárquica** de pastas (Clientes, Casos, Subpastas)
- **Visualização de documentos** integrada (PDF, imagens, áudio, vídeo)
- **Navegação estilo Google Drive** com breadcrumbs

### 🤖 Inteligência Artificial
- **Extração automática de dados** via n8n webhook
- **Renomeação inteligente** com OpenAI GPT-4o-mini
- **Numeração sequencial** automática por cliente
- **Classificação de documentos** (RG, CPF, Contratos, etc.)
- **Geração de narrativas de fatos** para petições

### 🔄 Integrações
- **Supabase** (PostgreSQL + Storage + Auth)
- **n8n** para processamento de documentos
- **OpenAI** para IA e renomeação
- **Python** para conversão de imagens

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 18** com TypeScript
- **Vite** para build e desenvolvimento
- **Tailwind CSS** para estilização
- **Shadcn/UI** para componentes
- **React Query** para gerenciamento de estado
- **Framer Motion** para animações
- **jsPDF** para conversão de imagens

### Backend
- **Supabase** (PostgreSQL + Storage + Auth)
- **Row Level Security (RLS)** para segurança
- **Python 3.13** com Pillow para processamento de imagens

### IA e Processamento
- **OpenAI GPT-4o-mini** para renomeação e narrativas
- **n8n** para extração de dados de documentos
- **Webhooks** para comunicação assíncrona

## 📋 Pré-requisitos

- **Node.js 18+** e npm
- **Python 3.13+** com pip
- **Conta Supabase** (gratuita)
- **Chave OpenAI API** (paga)
- **n8n webhook** configurado

## 🚀 Instalação e Configuração

### 1. Clone o Repositório

```bash
git clone <SEU_REPOSITORIO>
cd legal-streamline
```

### 2. Instalar Dependências Node.js

```bash
# Instalar dependências principais
npm install --legacy-peer-deps

# Instalar dependências de desenvolvimento
npm install @tanstack/react-query-devtools --save-dev --legacy-peer-deps
```

### 3. Configurar Variáveis de Ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```env
# Supabase
VITE_SUPABASE_URL=sua_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase

# OpenAI
VITE_OPENAI_API_KEY=sk-sua-chave-openai

# n8n Webhook
VITE_N8N_WEBHOOK_URL=https://primary-production-f2257.up.railway.app/webhook/entrada-documentos
```

### 4. Configurar Supabase

#### 4.1 Criar Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Copie a URL e chave anônima para o `.env.local`

#### 4.2 Executar Migrações
Execute os arquivos SQL na pasta `supabase/migrations/` na ordem:

```sql
-- 1. Tabelas principais
-- 2. Relacionamentos
-- 3. Triggers e funções
-- 4. Políticas RLS
-- 5. Configuração final
```

#### 4.3 Configurar Storage
```sql
-- Criar bucket 'documents'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true);

-- Políticas de acesso
CREATE POLICY "documents_public_read" ON storage.objects
FOR SELECT USING (bucket_id = 'documents');

CREATE POLICY "documents_authenticated_upload" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
```

### 5. Configurar Python (Opcional)

Para conversão avançada de imagens:

```bash
# Executar script de instalação
./install-python-deps.sh

# Ou instalação manual
cd python
python3 -m venv .venv
source .venv/bin/activate
pip install Pillow
```

### 6. Iniciar Desenvolvimento

```bash
npm run dev
```

O sistema estará disponível em `http://localhost:8080`

## 📖 Guia de Uso

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

### 3. Geração de Narrativas

1. **Acesse a aba "Fatos"**
2. **Selecione uma pasta** com documentos
3. **Escolha documentos** relevantes
4. **Clique "Gerar Narrativa"**
5. **Revise e salve** o conteúdo gerado

## 🔧 Configurações Avançadas

### OpenAI - Modelos e Prompts

O sistema usa **GPT-4o-mini** para:
- **Renomeação de documentos** com classificação específica
- **Geração de narrativas** em português brasileiro
- **Numeração sequencial** por cliente

### n8n - Processamento de Documentos

Configure seu webhook n8n para receber:
```json
{
  "fileUrl": "https://supabase.co/storage/...",
  "mimeType": "application/pdf",
  "fileName": "documento.pdf",
  "documentId": "uuid",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### Supabase - Políticas RLS

O sistema implementa Row Level Security:
- **Usuários** só acessam seus próprios dados
- **Documentos** protegidos por usuário
- **Storage** com políticas de upload/leitura

## 🐛 Solução de Problemas

### Erro: "Bucket not found"
```sql
-- Verificar se bucket existe
SELECT * FROM storage.buckets WHERE id = 'documents';

-- Recriar se necessário
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', true);
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

## 📁 Estrutura do Projeto

```
legal-streamline/
├── src/
│   ├── components/          # Componentes React
│   ├── services/           # Serviços de negócio
│   ├── hooks/              # React Query hooks
│   ├── types/              # Definições TypeScript
│   ├── utils/              # Utilitários
│   └── pages/              # Páginas da aplicação
├── python/                 # Scripts Python
│   ├── converter.py        # Conversor JPG→PDF
│   ├── requirements.txt    # Dependências Python
│   └── .venv/             # Ambiente virtual
├── supabase/              # Migrações e configurações
└── public/                # Arquivos estáticos
```

## 🔄 Fluxo de Processamento

1. **Upload** → Conversão JPG→PDF → Storage
2. **Extração** → n8n webhook → Dados extraídos
3. **Renomeação** → OpenAI → Nome inteligente
4. **Organização** → Pastas hierárquicas
5. **Narrativas** → IA → Conteúdo jurídico

## 📊 Logs e Monitoramento

O sistema gera logs detalhados:
- **Console do navegador** para debug
- **Terminal VS Code** para desenvolvimento
- **Supabase logs** para produção
- **Performance monitoring** integrado

## 🚀 Deploy

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm run build
npm run preview
```

### Deploy no Supabase
1. Configure variáveis de ambiente
2. Execute migrações
3. Configure políticas RLS
4. Deploy do frontend

## 📝 Licença

Este projeto é privado e proprietário.

## 🤝 Suporte

Para suporte técnico ou dúvidas:
1. Verifique os logs do console
2. Confirme configurações do `.env.local`
3. Teste integrações individualmente
4. Consulte a documentação das APIs

---

**DocFlow-AI** - Transformando a gestão de documentos jurídicos com IA 🚀