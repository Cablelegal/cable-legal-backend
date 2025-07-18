import { OpenAI } from 'openai';
import pdfParse from 'pdf-parse';
import fs from 'fs/promises';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const config = {
  api: {
    bodyParser: false,
  },
};

import multiparty from 'multiparty';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const form = new multiparty.Form();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: 'Error al procesar el formulario' });
    }

    const file = files.document?.[0];

    if (!file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }

    try {
      const buffer = await fs.readFile(file.path);
      const pdfData = await pdfParse(buffer);

      const content = pdfData.text;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'user',
            content: `
Eres un abogado experto en contratos.

Analiza el siguiente documento y señala cláusulas peligrosas o controvertidas, como si fueras un asesor legal humano. Explica con claridad qué debe tener en cuenta el lector:

${content}
            `,
          },
        ],
      });

      res.status(200).json({ analysis: completion.choices[0].message.content });
    } catch (error) {
      res.status(500).json({ error: 'Error al analizar el documento' });
    }
  });
}
