import { cors } from 'hono/cors';
import type { Context } from 'hono';
import { aiGenerationService } from './aiGenerationService';
import { addSettlementReceipt, x402App } from './x402Routes';
import { supabase } from '../database/supabase';

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

const validateClassroomAnswerBody = (body: Record<string, unknown>) => {
  const classroomId = boundedText(body.classroomId, 'classroomId', 100);
  const question = boundedText(body.question, 'question', 2000);
  const threadId = body.threadId == null ? '' : boundedText(body.threadId, 'threadId', 100);
  return { classroomId, question, threadId } as const;
};

const validateProjectIdeaBody = (body: Record<string, unknown>) => {
  const category = boundedText(body.category, 'category', 100);
  const target = boundedText(body.target, 'target', 200);
  const skills = boundedText(body.skills, 'skills', 500);
  const constraints = boundedText(body.constraints, 'constraints', 500);
  const impact = boundedText(body.impact, 'impact', 500);
  const preferredStack = body.preferredStack == null ? '' : boundedText(body.preferredStack, 'preferredStack', 200);
  return { category, target, skills, constraints, impact, preferredStack } as const;
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

x402App.post('/api/ai/project-idea', async (c) => withHandlerErrors(c, async () => {
  const token = c.req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return c.json({ error: 'Authentication is required.' }, 401);
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return c.json({ error: 'Authentication is invalid or expired.' }, 401);
  const project = await aiGenerationService.generateProjectIdea(
    validateProjectIdeaBody(await getObjectBody(c)),
  );
  return c.json({ success: true, project });
}));

x402App.post('/api/ai/classroom-answer', async (c) => withHandlerErrors(c, async () => {
  const { classroomId, question, threadId } = validateClassroomAnswerBody(await getObjectBody(c));
  const token = c.req.header('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return c.json({ error: 'Authentication is required.' }, 401);
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return c.json({ error: 'Authentication is invalid or expired.' }, 401);

  const { data: membership, error: membershipError } = await (supabase.from('students') as any)
    .select('id')
    .eq('user_id', authData.user.id)
    .eq('classroom_id', classroomId)
    .limit(1)
    .maybeSingle();
  if (membershipError || !membership) return c.json({ error: 'You are not enrolled in this classroom.' }, 403);

  const { data: materials } = await (supabase.from('classroom_materials') as any)
    .select('name, mime_type, extracted_text, extraction_status')
    .eq('classroom_id', classroomId)
    .eq('extraction_status', 'ready')
    .order('created_at', { ascending: false })
    .limit(40);
  const context = (materials || []).map((material: any) => `SOURCE: ${material.name} (${material.mime_type})\\n${String(material.extracted_text || '').slice(0, 12000)}`).join('\\n\\n');

  let thread: any = null;
  if (threadId) {
    const { data } = await (supabase.from('learning_threads') as any)
      .select('id, classroom_id, student_user_id')
      .eq('id', threadId)
      .eq('classroom_id', classroomId)
      .eq('student_user_id', authData.user.id)
      .maybeSingle();
    thread = data;
  }
  if (!thread) {
    const { data, error } = await (supabase.from('learning_threads') as any).insert({
      classroom_id: classroomId,
      student_user_id: authData.user.id,
      title: question.slice(0, 80),
    }).select('id, classroom_id, student_user_id').single();
    if (error) throw error;
    thread = data;
  }

  const { data: history } = await (supabase.from('learning_messages') as any)
    .select('role, content')
    .eq('thread_id', thread.id)
    .order('created_at', { ascending: true })
    .limit(20);
  const answer = await aiGenerationService.answerClassroomQuestion({ question, context, history: history || [] });
  await (supabase.from('learning_messages') as any).insert([
    { thread_id: thread.id, role: 'user', content: question },
    { thread_id: thread.id, role: 'assistant', content: String(answer.answer || ''), citations: answer.citations || [] },
  ]);
  return c.json({ success: true, threadId: thread.id, answer, sources: (materials || []).map((item: any) => item.name) });
}));

export async function handleX402AiRequest(request: Request): Promise<Response> {
  const response = await x402App.fetch(request);
  return addSettlementReceipt(request, response);
}
