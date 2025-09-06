# Conversor de JPG para PDF

Este serviço permite converter imagens JPG para PDF usando Python e a biblioteca Pillow.

## 📋 Pré-requisitos

- Python 3.7 ou superior
- pip3

## 🚀 Instalação

### Opção 1: Script Automático (Recomendado)
```bash
# No diretório raiz do projeto
./install-python-deps.sh
```

### Opção 2: Instalação Manual
```bash
# Navegar para o diretório python
cd python

# Instalar dependências
pip3 install -r requirements.txt

# Verificar instalação
python3 -c "from PIL import Image; print('✅ Pillow instalado com sucesso!')"
```

## 📖 Como Usar

### 1. Conversão Única
```bash
python3 python/converter.py -i imagem.jpg -o documento.pdf
```

### 2. Conversão com Qualidade Específica
```bash
python3 python/converter.py -i imagem.jpg -o documento.pdf -q 90
```

### 3. Conversão em Lote (Múltiplos Arquivos)
```bash
# Converter todos os JPGs de um diretório
python3 python/converter.py -b -i /caminho/para/jpgs/ -o /caminho/saida/

# Converter arquivos específicos
python3 python/converter.py -b -i "img1.jpg,img2.jpg,img3.jpg" -o /caminho/saida/
```

### 4. Saída em JSON
```bash
python3 python/converter.py -i imagem.jpg -o documento.pdf --json
```

## 🔧 Parâmetros

- `-i, --input`: Caminho do arquivo JPG ou diretório (obrigatório)
- `-o, --output`: Caminho de saída do PDF ou diretório (obrigatório)
- `-q, --quality`: Qualidade da conversão (1-100, padrão: 95)
- `-b, --batch`: Modo batch para múltiplos arquivos
- `-j, --json`: Saída em formato JSON

## 📁 Estrutura de Arquivos

```
python/
├── converter.py          # Script principal de conversão
├── requirements.txt      # Dependências Python
└── README.md            # Este arquivo
```

## 🐛 Solução de Problemas

### Erro: "Python 3 não encontrado"
```bash
# macOS
brew install python3

# Ubuntu/Debian
sudo apt install python3 python3-pip

# Windows
# Baixar de https://www.python.org/downloads/
```

### Erro: "Pillow não encontrado"
```bash
pip3 install Pillow
```

### Erro: "Permissão negada"
```bash
chmod +x python/converter.py
```

## 🔗 Integração com Node.js

O serviço pode ser integrado com o frontend através do `imageConverterService.ts`:

```typescript
import { imageConverterService } from '@/services/imageConverterService';

// Conversão única
const result = await imageConverterService.convertJpgToPdf({
  inputPath: '/caminho/imagem.jpg',
  outputPath: '/caminho/documento.pdf',
  quality: 95
});

// Conversão em lote
const batchResult = await imageConverterService.convertMultipleJpgsToPdf(
  ['img1.jpg', 'img2.jpg', 'img3.jpg'],
  '/caminho/saida/',
  95
);
```

## 📊 Exemplo de Saída JSON

```json
{
  "success": true,
  "input": "/caminho/imagem.jpg",
  "output": "/caminho/documento.pdf"
}
```

```json
{
  "success": [
    {
      "input": "/caminho/img1.jpg",
      "output": "/caminho/saida/img1.pdf"
    }
  ],
  "failed": [],
  "total": 1
}
```
