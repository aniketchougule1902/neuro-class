import { cors } from 'hono/cors';
import type { Context } from 'hono';
import { aiGenerationService } from './aiGenerationService';
import { addSettlementReceipt, x402App } from './x402Routes';

const boundedText = (value: unknown, field: string, maxLength: number): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error(`${field} is too long`);
  return normalized;
};

const getObjectBody = async (c: Context): Promise<Record<string, unknown>> => {
  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('A JSON object request body is required');
  }
  return body as Record<string, unknown>;
};

const validateTestBody = (body: Record<string, unknown>) => {
  const topic = boundedText(body.topic, 'topic', 160);
  const subject = boundedText(body.subject, 'subject', 120);
  const difficultyValue = String(body.difficulty);
  if (!['Easy', 'Medium', 'Hard', 'Adaptive'].includes(difficultyValue)) {
    throw new Error('difficulty is invalid');
  }
  const difficulty = difficultyValue as 'Easy' | 'Medium' | 'Hard' | 'Adaptive';

  const questionCount = Number(body.questionCount ?? 5);
  const durationMins = Number(body.durationMins ?? 45);
  const totalMarks = Number(body.totalMarks ?? 50);
  if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 20) {
    throw new Error('questionCount must be between 1 and 20');
  }
  if (!Number.isInteger(durationMins) || durationMins < 5 || durationMins > 300) {
    throw new Error('durationMins must be between 5 and 300');
  }
  if (!Number.isInteger(totalMarks) || totalMarks < questionCount || totalMarks > 500) {
    throw new Error('totalMarks is invalid');
  }

  const instructions = body.instructions == null
    ? ''
    : boundedText(body.instructions, 'instructions', 1000);

  return {
    topic,
    subject,
    difficulty,
    questionCount,
    durationMins,
    totalMarks,
    instructions,
  } as const;
};

const validateAssignmentBody = (body: Record<string, unknown>) => {
  const topic = boundedText(body.topic, 'topic', 160);
  const subject = boundedText(body.subject, 'subject', 120);
  const difficulty = boundedText(body.difficulty, 'difficulty', 30);
  const totalMarks = Number(body.totalMarks ?? 100);
  if (!Number.isInteger(totalMarks) || totalMarks < 1 || totalMarks > 500) {
    throw new Error('totalMarks must be between 1 and 500');
  }
  const instructions = body.instructions == null
    ? ''
    : boundedText(body.instructions, 'instructions', 1000);

  return { topic, subject, difficulty, totalMarks, instructions } as const;
};

const withHandlerErrors = async (c: Context, handler: () => Promise<Response>) => {
  try {
    return await handler();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Paid AI request failed';
    console.error('Paid AI request failed:', error);
    return c.json({ error: message }, 400);
  }
};

x402App.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'PAYMENT-SIGNATURE', 'X-PAYMENT'],
  exposeHeaders: ['PAYMENT-RESPONSE', 'X-402-Transaction-Id'],
}));

x402App.options('*', (c) => c.body(null, 204));

x402App.post('/api/ai/generate-test', async (c) => withHandlerErrors(c, async () => {
  const params = validateTestBody(await getObjectBody(c));
  const test = await aiGenerationService.generateTest(params);
  return c.json({ success: true, test });
}));

x402App.post('/api/ai/generate-assignment', async (c) => withHandlerErrors(c, async () => {
  const assignment = await aiGenerationService.generateAssignment(
    validateAssignmentBody(await getObjectBody(c)),
  );
  return c.json({ success: true, assignment });
}));

export async function handleX402AiRequest(request: Request): Promise<Response> {
  const response = await x402App.fetch(request);
  return addSettlementReceipt(request, response);
}
