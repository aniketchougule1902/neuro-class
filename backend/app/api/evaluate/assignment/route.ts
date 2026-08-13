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
    const { assignmentDescription, rubric, studentSubmission, subject, studentName } = body;
    
    if (typeof studentSubmission !== 'string' || !studentSubmission.trim()) {
      return withCors(NextResponse.json({ error: "Missing student assignment submission." }, { status: 400 }));
    }

    const ai = getAIClient();
    const parts: any[] = [];

    let promptText = `
      You are the NeuroClass AI Assignment & Rubric Grading Agent.
      Assignment: ${assignmentDescription || 'General Assignment'}
      Rubric Parameters: ${JSON.stringify(rubric)}
      Student: ${studentName || 'Student'}

      Output strictly JSON:
      {
        "finalGrade": "A",
        "overallJustification": "Outstanding structured research.",
        "criteriaScores": [
          {
            "name": "Content Quality",
            "maxMarks": 30,
            "scoreObtained": 28,
            "justification": "Original insights."
          }
        ],
        "plagiarismScore": 2,
        "plagiarismDetails": "Original student submission.",
        "improvementSuggestions": ["Incorporate more primary sources."]
      }
    `;

    if (studentSubmission.startsWith("data:image/")) {
      const matches = studentSubmission.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
      if (matches) {
        parts.push({
          inlineData: { mimeType: matches[1], data: matches[2] }
        });
      }
    } else {
      promptText += `\n\n--- STUDENT SUBMISSION ---\n${studentSubmission}`;
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
    if (!result || typeof result !== 'object' || !Array.isArray(result.criteriaScores)) throw new Error('Assignment evaluator returned an invalid rubric structure');
    return withCors(NextResponse.json(result));

  } catch (err: any) {
    console.error("Assignment Rubric Evaluation Error:", err);
    return withCors(NextResponse.json({ error: err.message || "Assignment grading failed." }, { status: 500 }));
  }
}

export async function OPTIONS() {
  return handleOptions();
}
