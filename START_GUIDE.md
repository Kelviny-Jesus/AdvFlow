# 🚀 Guia para Rodar o DocFlow-AI Melhorado

## ⚡ Início Rápido

### 1. **Configurar Ambiente**

Crie o arquivo `.env.local` na raiz do projeto:

```bash
# .env.local
NODE_ENV=development
REACT_APP_USE_MOCK_DATA=true
REACT_APP_SUPABASE_URL=https://qywpltlltaokavsfibre.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF5d3BsdGxsdGFva2F2c2ZpYnJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NzM0MTcsImV4cCI6MjA3MTU0OTQxN30.0aMUoXZb1XOTRmosM4FlbPKLyRpfZBWyYZmxgAfLA9w
REACT_APP_ENABLE_PERFORMANCE_MONITORING=true
```

### 2. **Instalar Dependências**

```bash
npm install --legacy-peer-deps
```

### 3. **Rodar o Sistema**

```bash
npm run dev
```

O sistema estará disponível em: **http://localhost:5173**

## 🎯 O que Você Verá

### **No Console do Browser:**
- ✅ Logs estruturados com emoji e contexto
- 📊 Métricas de performance automáticas
- 🔍 Estatísticas de cache (a cada minuto)
- ⚡ Configurações do sistema na inicialização

### **Na Interface:**
- 🔄 React Query DevTools (canto inferior direito)
- 📝 Dados mock funcionando (clientes, casos, documentos)
- 🚀 Toast notifications melhoradas
- ⚡ Loading states otimizados

## 🧪 Testando as Melhorias

### **1. Upload Inteligente**
- Vá para a página de Upload
- Selecione uma imagem (será comprimida automaticamente)
- Veja o progress detalhado com velocidade e tempo restante
- Arquivos grandes (>10MB) usarão upload em chunks

### **2. Busca Otimizada**
- Use a busca de documentos
- Note o cache inteligente (busque novamente a mesma coisa)
- Veja os logs no console

### **3. Error Handling**
- Tente fazer uma operação inválida
- Veja os erros estruturados no console
- Toast notifications com mensagens claras

### **4. Performance Monitoring**
- Abra o DevTools do browser
- Veja os logs de performance no console
- Operações lentas (>5s) são destacadas

## 🔧 Usando as Melhorias no Código

### **Em Componentes Novos:**

```typescript
// hooks/useDocuments.ts → hooks/useDocumentsV2.ts
import { useDocumentsV2, useSmartUploadDocument } from '@/hooks/useDocumentsV2';

// services/documentService.ts → services/documentServiceV2.ts  
import { DocumentServiceV2 } from '@/services/documentServiceV2';

function MyComponent() {
  // Cache otimizado, error handling automático
  const { data: documents, isLoading, error } = useDocumentsV2({
    clientId: 'client-123'
  });

  // Upload inteligente com compressão e chunks
  const smartUpload = useSmartUploadDocument();

  const handleUpload = (file: File) => {
    smartUpload.mutate({
      file,
      folderPath: 'clients/client-123',
      documentData: { clientId: 'client-123', caseId: 'case-456' },
      options: {
        autoCompress: true,      // Comprimir imagens
        autoDetectType: true,    // Detectar tipo automaticamente
        onProgress: (progress) => {
          console.log(`${progress.percentage}% - ${progress.speed} bytes/s`);
        }
      }
    });
  };

  return (
    <div>
      {/* Seu componente aqui */}
    </div>
  );
}
```

### **Validação Automática:**

```typescript
import { validateData, CreateClientSchema } from '@/lib/validations';

// Validação automática com mensagens de erro claras
try {
  const validClient = validateData(CreateClientSchema, formData);
  // Dados válidos, prosseguir
} catch (error) {
  // Erro de validação com mensagem específica
  console.error(error.message);
}
```

### **Logging Estruturado:**

```typescript
import { logger, PerformanceMonitor } from '@/lib/logger';

// Logs estruturados
logger.info('Operação iniciada', { userId: '123', action: 'upload' }, 'MyComponent');

// Monitoramento de performance
PerformanceMonitor.startTimer('operacao-pesada');
await minhaOperacaoPesada();
PerformanceMonitor.endTimer('operacao-pesada'); // Log automático se > 5s
```

## 🔄 Alternando Entre Mock e Dados Reais

### **Para usar dados MOCK (desenvolvimento):**
```bash
# .env.local
REACT_APP_USE_MOCK_DATA=true
```

### **Para usar Supabase (produção):**
```bash
# .env.local
REACT_APP_USE_MOCK_DATA=false
```

## 📊 Monitoramento em Tempo Real

### **React Query DevTools:**
- Clique no ícone no canto inferior direito
- Veja queries ativas, cache, mutations
- Debug problemas de cache

### **Console Logs:**
```bash
# Estrutura dos logs
[TIMESTAMP] [LEVEL] [CONTEXT] Mensagem { metadata }

# Exemplos:
ℹ️ 2024-01-20T10:30:00.000Z [DocumentServiceV2] Document created successfully { id: "doc-123" }
⚠️ 2024-01-20T10:30:05.000Z [Performance] Slow operation detected: uploadFile { duration: "8500ms" }
```

## 🐛 Troubleshooting

### **Erro de dependências:**
```bash
npm install --legacy-peer-deps --force
```

### **Cache não funcionando:**
- Verifique se `QueryClientProvider` está no `main.tsx`
- Limpe o cache: `localStorage.clear()` no console

### **Mock data não aparece:**
- Verifique se `REACT_APP_USE_MOCK_DATA=true` no `.env.local`
- Reinicie o servidor: `Ctrl+C` e `npm run dev`

### **Logs não aparecem:**
- Abra DevTools (F12)
- Vá para aba Console
- Verifique se não há filtros ativos

## 🎉 Próximos Passos

1. **Explore o componente de exemplo:** `src/components/ExampleImprovedComponent.tsx`
2. **Migre componentes existentes** para usar as versões V2
3. **Configure CI/CD** para deploy automático
4. **Adicione testes** para as funcionalidades críticas

---

## ✨ Features Ativas

- ✅ **Error Handling Robusto** - Erros estruturados e informativos
- ✅ **Cache Inteligente** - Configurações otimizadas por tipo de dados  
- ✅ **Upload Avançado** - Chunks, compressão, progress detalhado
- ✅ **Validação Rigorosa** - Zod schemas para todas as entidades
- ✅ **Logging Estruturado** - Logs com contexto e metadata
- ✅ **Performance Monitoring** - Métricas automáticas de operações
- ✅ **Adapter Pattern** - Fácil alternância entre mock e dados reais
- ✅ **React Query DevTools** - Debug visual de queries e cache

**🚀 Sistema pronto para produção com qualidade profissional!**
