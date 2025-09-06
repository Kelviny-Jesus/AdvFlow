#!/bin/bash

# Script para Inicializar o Backend DocFlow-AI
# Este script consolida todas as migrações em um único arquivo para execução

echo "🚀 Iniciando configuração do Backend DocFlow-AI..."

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 Instruções para Inicializar o Backend:${NC}"
echo ""
echo -e "${YELLOW}1. Acesse o Supabase Dashboard:${NC}"
echo "   https://supabase.com/dashboard/project/qywpltlltaokavsfibre"
echo ""
echo -e "${YELLOW}2. Vá para SQL Editor${NC}"
echo ""
echo -e "${YELLOW}3. Execute as migrações na seguinte ordem:${NC}"
echo ""

# Listar migrações em ordem
echo -e "${GREEN}📁 Migrações a executar:${NC}"
echo "   ✅ 20250906155831_fb08e893-bcb5-49e7-8799-25d3c8000ffd.sql (Schema principal)"
echo "   ✅ 20250906160000_fix_schema_for_services.sql (Correções + Storage)"
echo "   ✅ 20250906160100_triggers_and_advanced_features.sql (Triggers + Funcionalidades)"
echo "   ✅ 20250906160200_final_setup.sql (Configuração final)"
echo ""

# Verificar se os arquivos existem
migration_dir="supabase/migrations"
migrations=(
    "20250906155831_fb08e893-bcb5-49e7-8799-25d3c8000ffd.sql"
    "20250906160000_fix_schema_for_services.sql"
    "20250906160100_triggers_and_advanced_features.sql"
    "20250906160200_final_setup.sql"
)

echo -e "${BLUE}🔍 Verificando migrações...${NC}"
all_exist=true

for migration in "${migrations[@]}"; do
    if [ -f "$migration_dir/$migration" ]; then
        echo -e "   ✅ $migration"
    else
        echo -e "   ❌ $migration ${RED}(não encontrado)${NC}"
        all_exist=false
    fi
done

if [ "$all_exist" = true ]; then
    echo ""
    echo -e "${GREEN}✅ Todas as migrações estão disponíveis!${NC}"
    
    # Criar arquivo consolidado
    echo ""
    echo -e "${BLUE}📦 Criando arquivo consolidado de migração...${NC}"
    
    consolidated_file="supabase_migrations_consolidated.sql"
    
    cat > "$consolidated_file" << 'EOF'
-- ========================================
-- DOCFLOW-AI SUPABASE SETUP CONSOLIDADO
-- ========================================
-- Execute este script completo no SQL Editor do Supabase
-- Dashboard: https://supabase.com/dashboard/project/qywpltlltaokavsfibre

-- Início da migração consolidada
BEGIN;

EOF

    # Adicionar cada migração
    for migration in "${migrations[@]}"; do
        if [ -f "$migration_dir/$migration" ]; then
            echo "-- ========================================" >> "$consolidated_file"
            echo "-- MIGRAÇÃO: $migration" >> "$consolidated_file"
            echo "-- ========================================" >> "$consolidated_file"
            echo "" >> "$consolidated_file"
            cat "$migration_dir/$migration" >> "$consolidated_file"
            echo "" >> "$consolidated_file"
            echo "" >> "$consolidated_file"
        fi
    done
    
    cat >> "$consolidated_file" << 'EOF'

-- Finalizar migração
COMMIT;

-- Verificação final
SELECT 'Backend DocFlow-AI configurado com sucesso! 🎉' as status;

-- Verificar tabelas criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('clients', 'cases', 'folders', 'documents', 'petitions', 'facts', 'user_settings')
ORDER BY table_name;

-- Verificar funções criadas
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('get_next_doc_number', 'build_folder_path', 'get_folder_stats')
ORDER BY routine_name;
EOF

    echo -e "   📄 Arquivo criado: ${GREEN}$consolidated_file${NC}"
    
    echo ""
    echo -e "${YELLOW}🎯 Próximos passos:${NC}"
    echo "   1. Copie o conteúdo do arquivo: $consolidated_file"
    echo "   2. Cole no SQL Editor do Supabase"
    echo "   3. Execute o script completo"
    echo ""
    echo -e "${BLUE}📋 Ou execute comando direto:${NC}"
    echo "   cat $consolidated_file | pbcopy"
    echo "   (Copia automaticamente para área de transferência no macOS)"
    
else
    echo ""
    echo -e "${RED}❌ Algumas migrações estão faltando. Verifique os arquivos.${NC}"
fi

echo ""
echo -e "${GREEN}🚀 Depois de executar as migrações, inicie o frontend com:${NC}"
echo "   npm run dev"
echo ""
echo -e "${BLUE}📖 Documentação completa em:${NC}"
echo "   - SUPABASE_SETUP.md"
echo "   - BACKEND_SERVICES.md"
echo ""
echo -e "${GREEN}✨ Backend DocFlow-AI estará pronto para uso!${NC}"