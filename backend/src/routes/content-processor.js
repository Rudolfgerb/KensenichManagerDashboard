import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// AI-powered content processing
router.post('/process-content', async (req, res) => {
  try {
    if (!genAI) {
      return res.status(500).json({ error: 'Gemini API key not configured' });
    }

    const { content, type } = req.body;
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Du bist ein intelligenter Content-Processor für KensenichManager.

Analysiere folgenden Inhalt und entscheide, was damit zu tun ist:

Content: "${content}"
Type: ${type}

Erkenne automatisch, ob es sich um:
1. Eine AUFGABE handelt (z.B. "Todo: Landing Page designen", "Meeting vorbereiten", etc.)
2. Einen KONTAKT handelt (z.B. "Max Mustermann, max@example.com, Firma ABC", Telefonnummern, etc.)
3. Eine NOTIZ/DATEI ist (alles andere)

Antworte NUR im folgenden JSON Format (keine zusätzlichen Texte):

FÜR AUFGABEN:
{
  "action": "create_task",
  "task": {
    "title": "Kurzer Titel",
    "description": "Detaillierte Beschreibung",
    "priority": 1-5,
    "category": "general/mutuus/job/personal",
    "estimated_sessions": 1-10
  }
}

FÜR KONTAKTE:
{
  "action": "create_contact",
  "contact": {
    "name": "Vollständiger Name",
    "email": "email@example.com oder null",
    "phone": "Telefon oder null",
    "company": "Firma oder null",
    "type": "client/partner/lead",
    "notes": "Zusätzliche Infos"
  }
}

FÜR NOTIZEN:
{
  "action": "save_file",
  "file": {
    "filename": "passender-dateiname.txt",
    "content": "Der Inhalt",
    "category": "note/document/idea"
  }
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // Clean up markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const parsed = JSON.parse(text);
      res.json(parsed);
    } catch (parseError) {
      console.error('Failed to parse AI response:', text);
      // Fallback: save as file
      res.json({
        action: 'save_file',
        file: {
          filename: `note-${Date.now()}.txt`,
          content: content,
          category: 'note'
        }
      });
    }
  } catch (error) {
    console.error('Content processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// File upload endpoint
router.post('/upload', async (req, res) => {
  try {
    // In a real implementation, you would:
    // 1. Use multer or similar for file uploads
    // 2. Save to filesystem or cloud storage
    // 3. Extract text from PDFs/docs if needed
    // 4. Use AI to categorize/tag the file

    res.json({
      success: true,
      message: 'File uploaded successfully',
      file: {
        name: 'uploaded-file.pdf',
        path: '/files/uploaded-file.pdf',
        size: 1024
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
