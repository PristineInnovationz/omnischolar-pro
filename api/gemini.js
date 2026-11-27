import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Central model config (easy to swap when newer models release)
const MODELS = {
  LITE: 'gemini-3.5-flash-lite', // K–12 homework, flashcards, quick tutoring
  PRO_FLASH: 'gemini-3.8-flash'  // College, essay rubric grading, complex proofs
};

function selectModel({ gradeLevel = '', taskType = '' }) {
  const grade = gradeLevel.toLowerCase();
  const task = taskType.toLowerCase();

  // Route College/University or heavy essay/rubric tasks to Gemini 3.8 Flash
  if (
    grade.includes('college') ||
    grade.includes('university') ||
    task.includes('essay') ||
    task.includes('rubric') ||
    task.includes('exam')
  ) {
    return MODELS.PRO_FLASH;
  }

  // Default Elementary (K–5), Middle (6–8), and High School (9–12) to Flash-Lite
  return MODELS.LITE;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      prompt,
      systemInstruction = '',
      images = [],
      gradeLevel = 'high',
      taskType = 'homework'
    } = req.body;

    const selectedModel = selectModel({ gradeLevel, taskType });

    // Build multimodal parts (text + any uploaded worksheet/scratchpad images)
    const parts = [{ text: prompt }];
    for (const img of images) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType || 'image/png',
          data: img.base64
        }
      });
    }

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: [{ role: 'user', parts }],
      config: systemInstruction ? { systemInstruction } : undefined
    });

    return res.status(200).json({
      text: response.text,
      modelUsed: selectedModel
    });
  } catch (err) {
    console.error('Gemini API Error:', err);
    return res.status(500).json({ error: err.message || 'AI request failed' });
  }
}
