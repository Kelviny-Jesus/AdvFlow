#!/bin/bash

# Script para instalar dependências Python para conversão de JPG para PDF

echo "🐍 Instalando dependências Python para conversão de documentos..."

# Verificar se Python está instalado
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 não encontrado. Por favor, instale Python 3 primeiro."
    echo "   macOS: brew install python3"
    echo "   Ubuntu/Debian: sudo apt install python3 python3-pip"
    echo "   Windows: https://www.python.org/downloads/"
    exit 1
fi

# Verificar se pip está instalado
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 não encontrado. Por favor, instale pip3 primeiro."
    exit 1
fi

echo "✅ Python 3 encontrado: $(python3 --version)"
echo "✅ pip3 encontrado: $(pip3 --version)"

# Navegar para o diretório python
cd "$(dirname "$0")/python"

# Instalar dependências
echo "📦 Instalando Pillow..."
pip3 install -r requirements.txt

# Verificar instalação
echo "🔍 Verificando instalação..."
python3 -c "from PIL import Image; print('✅ Pillow instalado com sucesso!')"

echo "🎉 Instalação concluída!"
echo ""
echo "📋 Como usar:"
echo "   Conversão única:"
echo "   python3 python/converter.py -i imagem.jpg -o documento.pdf"
echo ""
echo "   Conversão em lote:"
echo "   python3 python/converter.py -b -i /caminho/para/jpgs/ -o /caminho/saida/"
echo ""
echo "   Saída JSON:"
echo "   python3 python/converter.py -i imagem.jpg -o documento.pdf --json"
