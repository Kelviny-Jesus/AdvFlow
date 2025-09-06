import { logger } from '../lib/logger';
import { AppError } from '../lib/errors';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

interface ConversionRequest {
  inputPath: string;
  outputPath: string;
  quality?: number;
}

interface ConversionResult {
  success: boolean;
  inputPath: string;
  outputPath: string;
  error?: string;
}

interface BatchConversionResult {
  success: ConversionResult[];
  failed: ConversionResult[];
  total: number;
}

class ImageConverterService {
  private readonly PYTHON_SCRIPT_PATH = path.join(process.cwd(), 'python', 'converter.py');
  private readonly TIMEOUT = 30000; // 30 segundos

  /**
   * Converte uma imagem JPG para PDF
   */
  async convertJpgToPdf(request: ConversionRequest): Promise<ConversionResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔄 Iniciando conversão JPG para PDF...');
      console.log('📁 Entrada:', request.inputPath);
      console.log('📁 Saída:', request.outputPath);

      // Verificar se o arquivo de entrada existe
      if (!fs.existsSync(request.inputPath)) {
        throw new AppError(`Arquivo de entrada não encontrado: ${request.inputPath}`, 404);
      }

      // Verificar se o script Python existe
      if (!fs.existsSync(this.PYTHON_SCRIPT_PATH)) {
        throw new AppError('Script Python de conversão não encontrado', 500);
      }

      // Executar conversão Python
      const result = await this.executePythonConversion(request);
      
      const duration = Date.now() - startTime;
      
      if (result.success) {
        console.log('✅ Conversão concluída com sucesso em', duration, 'ms');
        logger.info('Image conversion completed successfully', {
          inputPath: request.inputPath,
          outputPath: request.outputPath,
          duration
        }, 'ImageConverterService');
      } else {
        console.log('❌ Falha na conversão:', result.error);
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.log('❌ Erro na conversão:', error);
      logger.error('Error in image conversion', new Error(error instanceof Error ? error.message : 'Unknown error'), {
        inputPath: request.inputPath,
        outputPath: request.outputPath,
        duration
      }, 'ImageConverterService');

      return {
        success: false,
        inputPath: request.inputPath,
        outputPath: request.outputPath,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Converte múltiplas imagens JPG para PDF
   */
  async convertMultipleJpgsToPdf(
    inputPaths: string[], 
    outputDir: string, 
    quality: number = 95
  ): Promise<BatchConversionResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔄 Iniciando conversão em lote...');
      console.log('📁 Arquivos:', inputPaths.length);
      console.log('📁 Diretório de saída:', outputDir);

      // Verificar se todos os arquivos de entrada existem
      const missingFiles = inputPaths.filter(path => !fs.existsSync(path));
      if (missingFiles.length > 0) {
        throw new AppError(`Arquivos não encontrados: ${missingFiles.join(', ')}`, 404);
      }

      // Verificar se o script Python existe
      if (!fs.existsSync(this.PYTHON_SCRIPT_PATH)) {
        throw new AppError('Script Python de conversão não encontrado', 500);
      }

      // Executar conversão em lote Python
      const result = await this.executePythonBatchConversion(inputPaths, outputDir, quality);
      
      const duration = Date.now() - startTime;
      
      console.log('✅ Conversão em lote concluída em', duration, 'ms');
      console.log('📊 Sucessos:', result.success.length);
      console.log('❌ Falhas:', result.failed.length);
      
      logger.info('Batch image conversion completed', {
        total: result.total,
        success: result.success.length,
        failed: result.failed.length,
        duration
      }, 'ImageConverterService');

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      console.log('❌ Erro na conversão em lote:', error);
      logger.error('Error in batch image conversion', new Error(error instanceof Error ? error.message : 'Unknown error'), {
        inputPaths,
        outputDir,
        duration
      }, 'ImageConverterService');

      return {
        success: [],
        failed: inputPaths.map(inputPath => ({
          success: false,
          inputPath,
          outputPath: '',
          error: error instanceof Error ? error.message : 'Unknown error'
        })),
        total: inputPaths.length
      };
    }
  }

  /**
   * Executar conversão Python para um arquivo
   */
  private async executePythonConversion(request: ConversionRequest): Promise<ConversionResult> {
    return new Promise((resolve) => {
      const args = [
        this.PYTHON_SCRIPT_PATH,
        '--input', request.inputPath,
        '--output', request.outputPath,
        '--quality', String(request.quality || 95),
        '--json'
      ];

      console.log('🐍 Executando Python:', args.join(' '));

      const pythonProcess = spawn('python3', args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve({
              success: result.success,
              inputPath: request.inputPath,
              outputPath: request.outputPath,
              error: result.success ? undefined : 'Conversão falhou'
            });
          } catch (parseError) {
            resolve({
              success: false,
              inputPath: request.inputPath,
              outputPath: request.outputPath,
              error: 'Erro ao processar resposta do Python'
            });
          }
        } else {
          resolve({
            success: false,
            inputPath: request.inputPath,
            outputPath: request.outputPath,
            error: stderr || `Processo Python falhou com código ${code}`
          });
        }
      });

      pythonProcess.on('error', (error) => {
        resolve({
          success: false,
          inputPath: request.inputPath,
          outputPath: request.outputPath,
          error: `Erro ao executar Python: ${error.message}`
        });
      });

      // Timeout
      setTimeout(() => {
        pythonProcess.kill();
        resolve({
          success: false,
          inputPath: request.inputPath,
          outputPath: request.outputPath,
          error: 'Timeout na conversão'
        });
      }, this.TIMEOUT);
    });
  }

  /**
   * Executar conversão Python em lote
   */
  private async executePythonBatchConversion(
    inputPaths: string[], 
    outputDir: string, 
    quality: number
  ): Promise<BatchConversionResult> {
    return new Promise((resolve) => {
      const args = [
        this.PYTHON_SCRIPT_PATH,
        '--batch',
        '--input', inputPaths.join(','),
        '--output', outputDir,
        '--quality', String(quality),
        '--json'
      ];

      console.log('🐍 Executando Python em lote:', args.join(' '));

      const pythonProcess = spawn('python3', args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            resolve({
              success: result.success.map((item: any) => ({
                success: true,
                inputPath: item.input,
                outputPath: item.output
              })),
              failed: result.failed.map((item: any) => ({
                success: false,
                inputPath: item.input,
                outputPath: '',
                error: item.error
              })),
              total: result.total
            });
          } catch (parseError) {
            resolve({
              success: [],
              failed: inputPaths.map(inputPath => ({
                success: false,
                inputPath,
                outputPath: '',
                error: 'Erro ao processar resposta do Python'
              })),
              total: inputPaths.length
            });
          }
        } else {
          resolve({
            success: [],
            failed: inputPaths.map(inputPath => ({
              success: false,
              inputPath,
              outputPath: '',
              error: stderr || `Processo Python falhou com código ${code}`
            })),
            total: inputPaths.length
          });
        }
      });

      pythonProcess.on('error', (error) => {
        resolve({
          success: [],
          failed: inputPaths.map(inputPath => ({
            success: false,
            inputPath,
            outputPath: '',
            error: `Erro ao executar Python: ${error.message}`
          })),
          total: inputPaths.length
        });
      });

      // Timeout
      setTimeout(() => {
        pythonProcess.kill();
        resolve({
          success: [],
          failed: inputPaths.map(inputPath => ({
            success: false,
            inputPath,
            outputPath: '',
            error: 'Timeout na conversão'
          })),
          total: inputPaths.length
        });
      }, this.TIMEOUT);
    });
  }

  /**
   * Verificar se o serviço está disponível
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Verificar se Python está disponível
      const pythonCheck = spawn('python3', ['--version']);
      
      return new Promise((resolve) => {
        pythonCheck.on('close', (code) => {
          if (code === 0) {
            // Verificar se o script Python existe
            resolve(fs.existsSync(this.PYTHON_SCRIPT_PATH));
          } else {
            resolve(false);
          }
        });
        
        pythonCheck.on('error', () => {
          resolve(false);
        });
      });
    } catch (error) {
      return false;
    }
  }
}

export const imageConverterService = new ImageConverterService();
export type { ConversionRequest, ConversionResult, BatchConversionResult };
