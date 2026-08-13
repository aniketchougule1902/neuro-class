import { NextRequest, NextResponse } from 'next/server';
import { aiGenerationService } from '../../../../services/aiGenerationService';
import { markPaymentRefunded, validateX402Payment, X402PaymentResult } from '../../../../middleware/x402Middleware';
import { algorandService } from '../../../../services/algorandService';
import { withCors, handleOptions } from '../../../../lib/cors';

const requiredText = (value: unknown, field: string, maxLength: number) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field} is required`);
  if (value.trim().length > maxLength) throw new Error(`${field} is too long`);
  return value.trim();
};

const validateBody = (body: any) => {
  const topic = requiredText(body?.topic, 'topic', 160);
  const subject = requiredText(body?.subject, 'subject', 120);
  const difficulty = requiredText(body?.difficulty, 'difficulty', 30);
  const totalMarks = Number(body?.totalMarks ?? 100);
  if (!Number.isInteger(totalMarks) || totalMarks < 1 || totalMarks > 500) throw new Error('totalMarks must be between 1 and 500');
  const instructions = body?.instructions == null ? '' : requiredText(body.instructions, 'instructions', 1000);
  return { topic, subject, difficulty, totalMarks, instructions };
};

export async function POST(req: NextRequest) {
  let paymentResult: X402PaymentResult | null = null;
  try {
    paymentResult = await validateX402Payment(req, 0.05);
    if (!paymentResult.valid) return paymentResult.errorResponse as NextResponse;

    const assignment = await aiGenerationService.generateAssignment(validateBody(await req.json()));
    return withCors(NextResponse.json({ success: true, assignment }));
  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'AI Assignment Generation failed';
    console.error('AI Assignment Generation failed:', err);

    if (paymentResult?.payment) {
      try {
        const refundTxId = await algorandService.issueRefund(paymentResult.payment.sender, paymentResult.payment.amountAlgo);
        await markPaymentRefunded(paymentResult.payment.txId, refundTxId);
        return withCors(NextResponse.json({ error: message, refund: { status: 'submitted', txId: refundTxId, amountAlgo: paymentResult.payment.amountAlgo } }, { status: 502 }));
      } catch (refundErr) {
        console.error('x402 assignment refund failed:', refundErr);
        await markPaymentRefunded(paymentResult.payment.txId);
        return withCors(NextResponse.json({ error: message, refund: { status: 'pending' } }, { status: 502 }));
      }
    }

    return withCors(NextResponse.json({ error: message }, { status: 400 }));
  }
}

export async function OPTIONS() {
  return handleOptions();
}
