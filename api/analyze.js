require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const pdfParse = require('pdf-parse');
const fs = require('fs');
const { OpenAI } = require('openai');

const app = express();
const upload = multer({ dest: '/tmp/uploads/' }); // usa /tmp para Vercel
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.use(cors());

app.post('/api/analyze', upload.single('document'), async (req, res) => {
  const file = req.file;

  let content = '';

  try {
    if (file.mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(file.path);
      const pdfData = await pdfParse(dataBuffer);
      content = pdfData.text;
    } else {
      content = fs.readFileSync(file.path, 'utf8');
    }

    fs.unlinkSync(file.path); // eliminar archivo temporal

    const completion = await openai.chat.completions.create({
      messages: [{
        role: 'user',
        content: `
Eres un abogado experto en contratos.

Analiza el siguiente documento y señala cláusulas peligrosas o controvertidas, como si fueras un asesor legal humano. Explica con claridad qué debe tener en cuenta el lector:

${content}
        `
      }],
      model: 'gpt-4'
    });

    res.json({ analysis: completion.choices[0].message.content });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al analizar el documento' });
  }
});

module.exports = app;
