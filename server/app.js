import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import ocrRoutes from './routes/ocr.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/ocr', ocrRoutes);

// Tratamento de erros do multer
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Arquivo muito grande. Máximo 10MB.' });
    }
  }
  return res.status(500).json({ error: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`OCR server listening on port ${PORT}`);
});


