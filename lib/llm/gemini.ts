import { GoogleGenerativeAI } from '@google/generative-ai';

let _genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!_genAI) {
    _genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'placeholder');
  }
  return _genAI;
}

const GEMINI_SYSTEM = `You are a helpful assistant answering questions about products, services, and brands. 
Be comprehensive and mention specific brands when relevant. Provide balanced, informative responses.`;

export async function queryGemini(keyword: string): Promise<string> {
  const model = getGenAI().getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: GEMINI_SYSTEM,
  });
  const result = await model.generateContent(keyword);
  return result.response.text();
}
