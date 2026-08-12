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
    const { assignmentDescription, rubric, studentSubmission, subject, studentName } = body;
    
    if (!studentSubmission) {
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

    const responseText = response.text || "{}";
    const cleaned = responseText.trim().replace(/^```json/, '').replace(/```$/, '');
    
    return withCors(NextResponse.json(JSON.parse(cleaned)));

  } catch (err: any) {
    console.error("Assignment Rubric Evaluation Error:", err);
    return withCors(NextResponse.json({ error: err.message || "Assignment grading failed." }, { status: 500 }));
  }
}

export async function OPTIONS() {
  return handleOptions();
}
