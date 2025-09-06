#!/usr/bin/env python3
"""
Serviço de conversão de imagens JPG para PDF
"""

import os
import sys
import json
import argparse
from pathlib import Path
from PIL import Image
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def jpg_to_pdf(jpg_path, pdf_path, quality=95):
    """
    Converte uma imagem JPG para PDF
    
    Args:
        jpg_path (str): Caminho para o arquivo JPG
        pdf_path (str): Caminho de saída para o PDF
        quality (int): Qualidade da conversão (1-100)
    
    Returns:
        bool: True se a conversão foi bem-sucedida
    """
    try:
        logger.info(f"Iniciando conversão: {jpg_path} -> {pdf_path}")
        
        # Verificar se o arquivo JPG existe
        if not os.path.exists(jpg_path):
            logger.error(f"Arquivo JPG não encontrado: {jpg_path}")
            return False
        
        # Abrir a imagem
        with Image.open(jpg_path) as image:
            # Converter para RGB se necessário
            if image.mode != 'RGB':
                logger.info(f"Convertendo modo de cor de {image.mode} para RGB")
                image = image.convert('RGB')
            
            # Criar diretório de saída se não existir
            os.makedirs(os.path.dirname(pdf_path), exist_ok=True)
            
            # Salvar como PDF
            image.save(pdf_path, 'PDF', quality=quality)
            
            logger.info(f"Conversão concluída com sucesso: {pdf_path}")
            return True
            
    except Exception as e:
        logger.error(f"Erro na conversão: {str(e)}")
        return False

def convert_multiple_jpgs(jpg_paths, output_dir, quality=95):
    """
    Converte múltiplas imagens JPG para PDFs
    
    Args:
        jpg_paths (list): Lista de caminhos para arquivos JPG
        output_dir (str): Diretório de saída
        quality (int): Qualidade da conversão (1-100)
    
    Returns:
        dict: Resultado das conversões
    """
    results = {
        'success': [],
        'failed': [],
        'total': len(jpg_paths)
    }
    
    for jpg_path in jpg_paths:
        # Gerar nome do PDF baseado no JPG
        jpg_name = Path(jpg_path).stem
        pdf_path = os.path.join(output_dir, f"{jpg_name}.pdf")
        
        if jpg_to_pdf(jpg_path, pdf_path, quality):
            results['success'].append({
                'input': jpg_path,
                'output': pdf_path
            })
        else:
            results['failed'].append({
                'input': jpg_path,
                'error': 'Falha na conversão'
            })
    
    return results

def main():
    """Função principal para uso via linha de comando"""
    parser = argparse.ArgumentParser(description='Converte imagens JPG para PDF')
    parser.add_argument('--input', '-i', required=True, help='Caminho do arquivo JPG ou diretório')
    parser.add_argument('--output', '-o', required=True, help='Caminho de saída do PDF ou diretório')
    parser.add_argument('--quality', '-q', type=int, default=95, help='Qualidade da conversão (1-100)')
    parser.add_argument('--batch', '-b', action='store_true', help='Modo batch para múltiplos arquivos')
    parser.add_argument('--json', '-j', action='store_true', help='Saída em formato JSON')
    
    args = parser.parse_args()
    
    if args.batch:
        # Modo batch - converter múltiplos arquivos
        if os.path.isdir(args.input):
            # Buscar todos os arquivos JPG no diretório
            jpg_files = []
            for ext in ['*.jpg', '*.jpeg', '*.JPG', '*.JPEG']:
                jpg_files.extend(Path(args.input).glob(ext))
            jpg_paths = [str(f) for f in jpg_files]
        else:
            # Lista de arquivos separados por vírgula
            jpg_paths = [f.strip() for f in args.input.split(',')]
        
        results = convert_multiple_jpgs(jpg_paths, args.output, args.quality)
        
        if args.json:
            print(json.dumps(results, indent=2, ensure_ascii=False))
        else:
            print(f"Conversão concluída: {len(results['success'])}/{results['total']} arquivos")
            if results['failed']:
                print("Arquivos com falha:")
                for failed in results['failed']:
                    print(f"  - {failed['input']}")
    
    else:
        # Modo single - converter um arquivo
        success = jpg_to_pdf(args.input, args.output, args.quality)
        
        if args.json:
            result = {
                'success': success,
                'input': args.input,
                'output': args.output
            }
            print(json.dumps(result, indent=2, ensure_ascii=False))
        else:
            if success:
                print(f"Conversão bem-sucedida: {args.output}")
            else:
                print(f"Falha na conversão: {args.input}")
                sys.exit(1)

if __name__ == "__main__":
    main()
