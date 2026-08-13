import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from "@google/genai";
import { withCors, handleOptions } from '../../../../lib/cors';

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not configured');
    aiClient = new GoogleGenAI({ apiKey: key, httpOptions: { headers: { 'User-Agent': 'NeuroClass/1.0' } } });
  }
  return aiClient;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (JSON.stringify(body).length > 12_000_000) {
      return withCors(NextResponse.json({ error: 'Evaluation payload is too large.' }, { status: 413 }));
    }
    const { studentAnswerSheet, subject, studentName, analyzedQuestionPaper } = body;
    
    if (typeof studentAnswerSheet !== 'string' || !studentAnswerSheet.trim() || !analyzedQuestionPaper) {
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

    const responseText = response.text || '{}';
    const cleaned = responseText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const result = JSON.parse(cleaned);
    if (!result || typeof result !== 'object' || !Array.isArray(result.questionEvaluations)) throw new Error('Evaluation engine returned an invalid grading structure');
    return withCors(NextResponse.json(result));

  } catch (err: any) {
    console.error("Test Paper Evaluation Error:", err);
    return withCors(NextResponse.json({ error: err.message || "Evaluation engine failed." }, { status: 500 }));
  }
}

export async function OPTIONS() {
  return handleOptions();
}
