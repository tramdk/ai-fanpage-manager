import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export const GENAI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-pro-latest',
  'gemini-1.5-flash-002',
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

export function cleanAIResult(text: string): string {
  if (!text) return text;
  let cleaned = text.trim();
  
  if (cleaned.startsWith('```')) {
    const lines = cleaned.split('\n');
    if (cleaned.endsWith('```')) {
       const firstNewline = cleaned.indexOf('\n');
       if (firstNewline !== -1) {
         cleaned = cleaned.substring(firstNewline, cleaned.length - 3).trim();
       }
    } else {
       const firstNewline = cleaned.indexOf('\n');
       if (firstNewline !== -1) {
         cleaned = cleaned.substring(firstNewline).trim();
       }
    }
  }

  const patterns = [
    /^Sure, here (is|are) [^:]+:\s*/i,
    /^Here is (the|a) [^:]+:\s*/i,
    /^Certainly! Here [^:]+:\s*/i,
    /^Sẵn lòng, đây là [^:]+:\s*/i,
    /^Đây là nội dung [^:]+:\s*/i,
    /^Dưới đây là [^:]+:\s*/i,
    /^Nội dung bài viết:\s*/i,
    /^Nội dung Facebook Post:\s*/i,
    /^Title:\s*/i,
    /^Caption:\s*/i
  ];

  for (const pattern of patterns) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, '').trim();
    }
  }

  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.substring(1, cleaned.length - 1).trim();
  }

  return cleaned;
}

export async function getStableModel(genAI: GoogleGenAI) {
  for (const modelName of GENAI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      // Quick check if model is available
      return model;
    } catch (e) {
      continue;
    }
  }
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
}
