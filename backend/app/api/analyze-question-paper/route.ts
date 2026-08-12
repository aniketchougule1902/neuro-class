import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";
import { withCors, handleOptions } from '../../../lib/cors';

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      aiClient = new GoogleGenAI({ apiKey: 'DEMO_KEY' });
    } else {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      });
    }
  }
  return aiClient;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { questionPaper, subject } = body;
    
    if (!questionPaper) {
      return withCors(NextResponse.json({ error: "Missing question paper content." }, { status: 400 }));
    }

    const ai = getAIClient();
    const parts: any[] = [];

    let promptText = `
      You are the Elite AI Question Paper Analyst and OCR digitizer for NeuroClass.
      YOUR TASK is to:
      1. Parse the uploaded question paper.
      2. Identify and list every single question in the paper.
      3. For each question, extract: question number, exact question text, marks allocated, and concise answer key.

      Format strictly as JSON matching this schema:
      {
        "title": "Extracted Exam Title",
        "subject": "${subject || 'General'}",
        "totalMarks": 100,
        "questions": [
          {
            "number": "Q1",
            "text": "Full question statement",
            "marks": 10,
            "expectedAnswer": "Model solution points"
          }
        ]
      }
    `;

    if (questionPaper.startsWith("data:image/")) {
      const matches = questionPaper.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      if (matches) {
        parts.push({
          inlineData: { mimeType: matches[1], data: matches[2] }
        });
      }
    } else {
      promptText += `\n\n--- QUESTION PAPER CONTENT ---\n${questionPaper}`;
    }

    parts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        temperature: 0.2
      }
    });

    const responseText = response.text || "{}";
    const cleaned = responseText.trim().replace(/^```json/, '').replace(/```$/, '');
    
    return withCors(NextResponse.json(JSON.parse(cleaned)));

  } catch (err: any) {
    console.error("AI Question Paper Parsing Error:", err);
    return withCors(NextResponse.json({ error: err.message || "Failed to analyze question paper." }, { status: 500 }));
  }
}

export async function OPTIONS() {
  return handleOptions();
}
