import express from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import { requireX402Payment } from "./middleware/x402Middleware";
import { algorandService, NEUROCLASS_TREASURY_ADDRESS } from "./services/algorandService";
import { aiGenerationService } from "./services/aiGenerationService";

// Load .env from backend directory or project root
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config();

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

export function createExpressApp() {
  const app = express();

  // CORS - Allow cross-origin requests for decoupled Vercel deployment
  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-402-Payment-TxId', 'X-Payment-TxId']
  }));

  app.use(express.json({ limit: '50mb' }));

  // AI Question Paper Analysis Route
  app.post("/api/analyze-question-paper", async (req, res) => {
    try {
      const { questionPaper, subject } = req.body;
      if (!questionPaper) {
        return res.status(400).json({ error: "Missing question paper content." });
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
      res.json(JSON.parse(cleaned));

    } catch (err: any) {
      console.error("AI Question Paper Parsing Error:", err);
      res.status(500).json({ error: err.message || "Failed to analyze question paper." });
    }
  });

  // AI Student Test Paper OCR Evaluation Route
  app.post("/api/evaluate/test-paper", async (req, res) => {
    try {
      const { studentAnswerSheet, subject, studentName, analyzedQuestionPaper } = req.body;
      if (!studentAnswerSheet || !analyzedQuestionPaper) {
        return res.status(400).json({ error: "Missing student answer sheet or reference question paper." });
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
      res.json(JSON.parse(cleaned));

    } catch (err: any) {
      console.error("Test Paper Evaluation Error:", err);
      res.status(500).json({ error: err.message || "Evaluation engine failed." });
    }
  });

  // AI Assignment Rubric Evaluation Route
  app.post("/api/evaluate/assignment", async (req, res) => {
    try {
      const { assignmentDescription, rubric, studentSubmission, subject, studentName } = req.body;
      if (!studentSubmission) {
        return res.status(400).json({ error: "Missing student assignment submission." });
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
      res.json(JSON.parse(cleaned));

    } catch (err: any) {
      console.error("Assignment Rubric Evaluation Error:", err);
      res.status(500).json({ error: err.message || "Assignment grading failed." });
    }
  });

  // x402 Protocol & Algorand Routes
  app.get("/api/x402/demo-wallet", async (_req, res) => {
    try {
      const wallet = algorandService.generateTestnetWallet();
      const balance = await algorandService.getBalance(String(wallet.address));
      res.json({
        address: wallet.address,
        mnemonic: wallet.mnemonic,
        balanceAlgo: balance,
        treasuryAddress: NEUROCLASS_TREASURY_ADDRESS
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to generate Algorand wallet" });
    }
  });

  app.post("/api/x402/verify", async (req, res) => {
    try {
      const { txId, priceAlgo = 0.10 } = req.body;
      const result = await algorandService.verifyPaymentTx(txId, priceAlgo);
      if (result.valid) {
        res.json({ status: "settled", ...result });
      } else {
        res.status(400).json({ status: "failed", ...result });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Payment verification error" });
    }
  });

  app.post("/api/ai/generate-test", requireX402Payment(0.10), async (req, res) => {
    try {
      const test = await aiGenerationService.generateTest(req.body);
      res.json({ success: true, test });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "AI Test Generation failed" });
    }
  });

  app.post("/api/ai/generate-assignment", requireX402Payment(0.05), async (req, res) => {
    try {
      const assignment = await aiGenerationService.generateAssignment(req.body);
      res.json({ success: true, assignment });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "AI Assignment Generation failed" });
    }
  });

  return app;
}

export async function startBackendServer() {
  const app = createExpressApp();
  const PORT = process.env.PORT || 9000;

  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}
