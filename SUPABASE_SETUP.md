# 🚀 Configuração do Supabase para DocFlow-AI

Este guia detalha como configurar completamente o Supabase para o sistema DocFlow-AI.

## 📋 **Pré-requisitos**

- Conta no [Supabase](https://supabase.com)
- Projeto Supabase criado
- Acesso ao Supabase Dashboard
- CLI do Supabase instalado (opcional)

## 🔧 **1. Aplicar Migrações**

As migrações foram criadas em ordem cronológica. Execute no **SQL Editor** do Supabase Dashboard:

### **Migração 1: Schema Principal**
```sql
-- Execute: 20250906155831_fb08e893-bcb5-49e7-8799-25d3c8000ffd.sql
-- Cria todas as tabelas principais e políticas RLS básicas
```

### **Migração 2: Correções do Schema**
```sql
-- Execute: 20250906160000_fix_schema_for_services.sql
-- Ajusta tipos de dados, cria bucket de storage e índices de performance
```

### **Migração 3: Triggers e Funcionalidades Avançadas**
```sql
-- Execute: 20250906160100_triggers_and_advanced_features.sql
-- Adiciona triggers, auditoria e funções avançadas
```

### **Migração 4: Configuração Final**
```sql
-- Execute: 20250906160200_final_setup.sql
-- Configurações finais e dados de exemplo
```

## 📁 **2. Configurar Storage**

### **A. Criar Bucket**
No Dashboard do Supabase:
1. Vá para **Storage**
2. Clique em **"New bucket"**
3. Configure:
   - **Name**: `documents`
   - **Public**: ❌ **NÃO** (privado)
   - **File size limit**: `50MB`
   - **Allowed MIME types**: ✅ **All files**

### **B. Aplicar Políticas RLS do Storage**
No **SQL Editor**, execute:

```sql
-- Política para upload
CREATE POLICY "Users can upload their own documents" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para visualizar/baixar
CREATE POLICY "Users can view their own documents" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para atualizar
CREATE POLICY "Users can update their own documents" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para deletar
CREATE POLICY "Users can delete their own documents" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## 🔐 **3. Configurar Authentication**

### **A. Providers**
Em **Authentication > Providers**:
- ✅ **Email** (habilitado por padrão)
- ✅ **Google** (opcional para login social)

### **B. URL de Redirecionamento**
Adicione em **Authentication > URL Configuration**:
- Development: `http://localhost:8081/auth/callback`
- Production: `https://yourdomain.com/auth/callback`

### **C. Email Templates** (Opcional)
Personalize os templates em **Authentication > Email Templates**

## ⚙️ **4. Configurações de Projeto**

### **A. API Settings**
Verifique em **Settings > API**:
- **Project URL**: `https://qywpltlltaokavsfibre.supabase.co`
- **Project API Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### **B. Database Settings**
Em **Settings > Database**:
- ✅ **Row Level Security**: Habilitado
- ✅ **Realtime**: Habilitado para tabelas principais

## 🧪 **5. Testar Configuração**

### **A. Verificar Tabelas**
Execute no SQL Editor:
```sql
-- Verificar se todas as tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'clients', 'cases', 'folders', 'documents', 
  'petitions', 'facts', 'user_settings'
);
```

### **B. Verificar Storage**
```sql
-- Verificar bucket
SELECT * FROM storage.buckets WHERE id = 'documents';
```

### **C. Testar Inserção**
```sql
-- Testar inserção básica (após login)
SELECT public.initialize_user_data();
SELECT * FROM public.get_system_stats();
```

## 📊 **6. Monitoramento e Manutenção**

### **A. Estatísticas do Sistema**
```sql
-- Ver estatísticas gerais
SELECT * FROM public.get_system_stats();

-- Ver estatísticas de pastas
SELECT * FROM public.get_folder_stats();
```

### **B. Limpeza de Dados**
```sql
-- Limpar dados de teste
SELECT public.cleanup_test_data();

-- Limpar logs antigos (90 dias)
SELECT public.cleanup_old_audit_logs(90);
```

### **C. Busca Avançada**
```sql
-- Buscar documentos
SELECT * FROM public.search_documents_fulltext('contrato');
```

## 🔍 **7. Estrutura do Banco de Dados**

### **Tabelas Principais:**
- `clients` - Clientes do escritório
- `cases` - Casos jurídicos
- `folders` - Estrutura hierárquica de pastas
- `documents` - Documentos armazenados
- `petitions` - Fatos geradas
- `facts` - Fatos extraídos
- `user_settings` - Configurações do usuário

### **Tabelas de Relacionamento:**
- `petition_documents` - Documentos x Fatos
- `fact_documents` - Fatos x Documentos
- `audit_log` - Log de auditoria

### **Views:**
- `document_summary` - Resumo de documentos com joins

### **Funções Principais:**
- `get_next_doc_number()` - Próximo número de documento
- `build_folder_path()` - Caminho da pasta
- `get_folder_stats()` - Estatísticas de pastas
- `search_documents_fulltext()` - Busca avançada

## ✅ **8. Checklist de Configuração**

- [ ] ✅ Migrações aplicadas (4 arquivos .sql)
- [ ] ✅ Bucket `documents` criado no Storage
- [ ] ✅ Políticas RLS do Storage aplicadas
- [ ] ✅ Authentication providers configurados
- [ ] ✅ URLs de redirecionamento definidas
- [ ] ✅ Variáveis de ambiente configuradas no `.env`
- [ ] ✅ Teste de inserção executado com sucesso
- [ ] ✅ Verificação das tabelas confirmada

## 🚨 **9. Troubleshooting**

### **Erro: Bucket não encontrado**
```sql
-- Verificar se bucket existe
SELECT * FROM storage.buckets;

-- Criar manualmente se necessário
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('documents', 'documents', false, 52428800);
```

### **Erro: Políticas RLS**
```sql
-- Verificar políticas
SELECT * FROM pg_policies WHERE tablename = 'documents';

-- Recriar se necessário (ver migração)
```

### **Erro: Permissões**
```sql
-- Grant básico
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
```

## 🎯 **10. Próximos Passos**

Após a configuração:

1. **Testar no Frontend**: Verificar se os services conseguem se conectar
2. **Criar Usuário Teste**: Registrar e fazer login
3. **Testar Upload**: Enviar um documento de teste
4. **Verificar RLS**: Confirmar isolamento entre usuários
5. **Monitorar Performance**: Usar as funções de estatísticas

---

**🎉 Parabéns! Seu Supabase está configurado e pronto para o DocFlow-AI!**

Para dúvidas ou problemas, consulte:
- [Documentação do Supabase](https://supabase.com/docs)
- [Logs do Dashboard](https://supabase.com/dashboard/project/_/logs)
- Arquivo `BACKEND_SERVICES.md` para uso dos services