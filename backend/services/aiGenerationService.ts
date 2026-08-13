import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;
const ALLOW_SYNTHETIC_FALLBACK = process.env.AI_ALLOW_FALLBACK === 'true' && process.env.NODE_ENV !== 'production';

function parseJsonResponse(text: string) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object') throw new Error('AI provider returned invalid JSON');
  return parsed;
}

function parseTestResponse(text: string) {
  const parsed = parseJsonResponse(text);
  if (!Array.isArray((parsed as any).questions)) throw new Error('AI provider returned an invalid test structure');
  return parsed;
}

function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not configured');
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: { 'User-Agent': 'NeuroClass/1.0' }
      }
    });
  }
  return aiClient;
}

export interface GenerateTestParams {
  topic: string;
  subject: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Adaptive';
  questionCount: number;
  durationMins: number;
  totalMarks: number;
  instructions?: string;
}

export interface GenerateAssignmentParams {
  topic: string;
  subject: string;
  difficulty: string;
  totalMarks: number;
  instructions?: string;
}

export const aiGenerationService = {
  /**
   * Generate complete structured Test paper with questions, options, and answer key
   */
  async generateTest(params: GenerateTestParams) {
    const { topic, subject, difficulty, questionCount = 5, durationMins = 45, totalMarks = 50, instructions = '' } = params;

    const prompt = `
You are the NeuroClass AI Test Generator. Generate a production-grade academic test paper based on the following parameters:
- Subject: ${subject}
- Topic: ${topic}
- Difficulty Level: ${difficulty}
- Number of Questions: ${questionCount}
- Duration: ${durationMins} minutes
- Total Marks: ${totalMarks}
${instructions ? `- Extra Instructions: ${instructions}` : ''}

Respond ONLY with valid JSON matching this schema:
{
  "title": "${topic} - ${difficulty} Assessment",
  "subject": "${subject}",
  "totalMarks": ${totalMarks},
  "durationMins": ${durationMins},
  "instructions": "Answer all questions clearly. Proctoring is active.",
  "questions": [
    {
      "id": "q1",
      "questionNumber": 1,
      "text": "Question statement here",
      "type": "mcq" or "short-answer",
      "marks": 10,
      "options": ["Option A", "Option B", "Option C", "Option D"], // null if short-answer
      "correctAnswer": "Option A or model answer",
      "explanation": "Brief explanation of why this answer is correct"
    }
  ]
}
`;

    try {
      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.4,
          responseMimeType: 'application/json'
        }
      });

      const text = response.text || '';
      return parseTestResponse(text);
    } catch (err: any) {
      if (!ALLOW_SYNTHETIC_FALLBACK) throw err;
      console.warn('Gemini test generation fallback triggered:', err instanceof Error ? err.message : err);
      // Structured fallback is explicitly opt-in for local development only.
      return {
        title: `${topic} - ${difficulty} Assessment (AI Generated)`,
        subject: subject,
        totalMarks: totalMarks,
        durationMins: durationMins,
        instructions: instructions || 'Answer all questions. Anti-cheat proctoring enabled.',
        questions: Array.from({ length: questionCount }).map((_, idx) => ({
          id: `q-${idx + 1}`,
          questionNumber: idx + 1,
          text: `[${difficulty}] Evaluate ${topic} principles for scenario #${idx + 1}.`,
          type: idx % 2 === 0 ? 'mcq' : 'short-answer',
          marks: Math.round(totalMarks / questionCount),
          options: idx % 2 === 0 ? [
            `Primary property of ${topic}`,
            `Secondary fallback of ${topic}`,
            `Asymptotic upper bound limit`,
            `Inverse boundary condition`
          ] : undefined,
          correctAnswer: `Primary property of ${topic}`,
          explanation: `Demonstrates fundamental concepts in ${subject}.`
        }))
      };
    }
  },

  /**
   * Generate AI Assignment with problem statement, criteria, and rubrics
   */
  async generateAssignment(params: GenerateAssignmentParams) {
    const { topic, subject, difficulty, totalMarks, instructions } = params;

    const prompt = `
You are the NeuroClass AI Assignment Architect. Draft a comprehensive student assignment:
- Topic: ${topic}
- Subject: ${subject}
- Difficulty: ${difficulty}
- Total Marks: ${totalMarks}
${instructions ? `- Teacher Guidelines: ${instructions}` : ''}

Respond ONLY in JSON matching this schema:
{
  "title": "${topic} Applied Research & Practical Assignment",
  "subject": "${subject}",
  "totalMarks": ${totalMarks},
  "problemStatement": "Detailed description of the assignment problem statement and objective...",
  "learningObjectives": ["Objective 1", "Objective 2", "Objective 3"],
  "evaluationCriteria": [
    { "name": "Content & Methodology", "maxMarks": ${Math.round(totalMarks * 0.4)}, "description": "Core concepts correctness and analytical rigor." },
    { "name": "Structure & Formatting", "maxMarks": ${Math.round(totalMarks * 0.3)}, "description": "Clarity of presentation, diagrams, and section flow." },
    { "name": "Originality & Citations", "maxMarks": ${Math.round(totalMarks * 0.3)}, "description": "Plagiarism-free original analysis." }
  ],
  "sampleTestCases": ["Verify edge case for empty input", "Check asymptotic time complexity"]
}
`;

    try {
      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          temperature: 0.4,
          responseMimeType: 'application/json'
        }
      });

      const text = response.text || '';
      return parseJsonResponse(text);
    } catch (err: any) {
      if (!ALLOW_SYNTHETIC_FALLBACK) throw err;
      console.warn('Gemini assignment generation fallback triggered:', err instanceof Error ? err.message : err);
      return {
        title: `${topic} Applied Assignment`,
        subject: subject,
        totalMarks: totalMarks,
        problemStatement: `Develop a comprehensive solution demonstrating deep understanding of ${topic} in ${subject}. Ensure proper documentation and test verification.`,
        learningObjectives: [
          `Master fundamental constructs of ${topic}`,
          `Implement robust edge-case validations`,
          `Synthesize analytical findings in structured report`
        ],
        evaluationCriteria: [
          { name: 'Core Implementation', maxMarks: Math.round(totalMarks * 0.5), description: 'Correctness and technical accuracy' },
          { name: 'Documentation & Structure', maxMarks: Math.round(totalMarks * 0.3), description: 'Clean presentation and clear reasoning' },
          { name: 'Originality', maxMarks: Math.round(totalMarks * 0.2), description: 'Independent work and citation standards' }
        ],
        sampleTestCases: [
          `Boundary condition validation for ${topic}`,
          `Performance benchmarking under standard load`
        ]
      };
    }
  }
};
