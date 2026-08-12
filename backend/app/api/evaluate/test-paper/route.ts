import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";
import { withCors, handleOptions } from '../../../../lib/cors';

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
    const { studentAnswerSheet, subject, studentName, analyzedQuestionPaper } = body;
    
    if (!studentAnswerSheet || !analyzedQuestionPaper) {
      return withCors(NextResponse.json({ error: "Missing student answer sheet or reference question paper." }, { status: 400 }));
    }

    const ai = getAIClient();
    const parts: any[] = [];

    let promptText = `
      You are the Master AI Evaluator for NeuroClass.
      Grade the student's submission against the reference Question Paper.
      Reference Question Paper: ${JSON.stringify(analyzedQuestionPaper)}
      Student Name: ${studentName || 'Student'}
      Subject: ${subject || 'General'}

      Output strictly JSON:
      {
        "totalMarksObtained": 85,
        "totalMarksPossible": 100,
        "percentage": 85,
        "grade": "A",
        "overallFeedback": "Excellent analytical rigor.",
        "strengths": ["Clear step-by-step mathematical proofs"],
        "weaknesses": ["Minor arithmetic slip in final step"],
        "improvementSuggestions": ["Review wave packet boundary conditions"],
        "questionEvaluations": [
          {
            "questionNumber": "Q1",
            "marksAllocated": 10,
            "marksAwarded": 9,
            "feedback": "Great logic.",
            "studentResponseSummary": "Accurate derivation."
          }
        ]
      }
    `;

    if (studentAnswerSheet.startsWith("data:image/")) {
      const matches = studentAnswerSheet.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      if (matches) {
        parts.push({
          inlineData: { mimeType: matches[1], data: matches[2] }
        });
      }
    } else {
      promptText += `\n\n--- STUDENT ANSWER SHEET ---\n${studentAnswerSheet}`;
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
    console.error("Test Paper Evaluation Error:", err);
    return withCors(NextResponse.json({ error: err.message || "Evaluation engine failed." }, { status: 500 }));
  }
}

export async function OPTIONS() {
  return handleOptions();
}
