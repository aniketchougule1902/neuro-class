import { NextRequest, NextResponse } from 'next/server';
import { aiGenerationService } from '../../../../services/aiGenerationService';
import { markPaymentRefunded, validateX402Payment, X402PaymentResult } from '../../../../middleware/x402Middleware';
import { algorandService } from '../../../../services/algorandService';
import { withCors, handleOptions } from '../../../../lib/cors';

const asBoundedString = (value: unknown, field: string, maxLength: number) => {
  if (typeof value !== 'string' || value.trim().length === 0) throw new Error(`${field} is required`);
  if (value.trim().length > maxLength) throw new Error(`${field} is too long`);
  return value.trim();
};

function validateGenerateTestBody(body: any) {
  const topic = asBoundedString(body?.topic, 'topic', 160);
  const subject = asBoundedString(body?.subject, 'subject', 120);
  const difficulty = body?.difficulty;
  if (!['Easy', 'Medium', 'Hard', 'Adaptive'].includes(difficulty)) throw new Error('difficulty is invalid');

  const questionCount = Number(body?.questionCount ?? 5);
  const durationMins = Number(body?.durationMins ?? 45);
  const totalMarks = Number(body?.totalMarks ?? 50);
  if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 20) throw new Error('questionCount must be between 1 and 20');
  if (!Number.isInteger(durationMins) || durationMins < 5 || durationMins > 300) throw new Error('durationMins must be between 5 and 300');
  if (!Number.isInteger(totalMarks) || totalMarks < questionCount || totalMarks > 500) throw new Error('totalMarks is invalid');

  const instructions = body?.instructions == null ? '' : asBoundedString(body.instructions, 'instructions', 1000);
  return { topic, subject, difficulty, questionCount, durationMins, totalMarks, instructions } as const;
}

export async function POST(req: NextRequest) {
  let paymentResult: X402PaymentResult | null = null;

  try {
    paymentResult = await validateX402Payment(req, 0.10);
    if (!paymentResult.valid) return paymentResult.errorResponse as NextResponse;

    const body = await req.json();
    const params = validateGenerateTestBody(body);
    const test = await aiGenerationService.generateTest(params);

    return withCors(NextResponse.json({ success: true, test }));
  } catch (err: any) {
    const message = err instanceof Error ? err.message : 'AI Test Generation failed';
    console.error('AI Test Generation failed:', err);

    if (paymentResult?.payment) {
      try {
        const refundTxId = await algorandService.issueRefund(
          paymentResult.payment.sender,
          paymentResult.payment.amountAlgo
        );
        await markPaymentRefunded(paymentResult.payment.txId, refundTxId);
        return withCors(NextResponse.json({
          error: message,
          refund: { status: 'submitted', txId: refundTxId, amountAlgo: paymentResult.payment.amountAlgo }
        }, { status: 502 }));
      } catch (refundErr) {
        console.error('x402 refund failed:', refundErr);
        await markPaymentRefunded(paymentResult.payment.txId);
        return withCors(NextResponse.json({
          error: message,
          refund: { status: 'pending', message: 'The payment was recorded, but the automatic refund could not be submitted. Support can reconcile it from the payment ledger.' }
        }, { status: 502 }));
      }
    }

    return withCors(NextResponse.json({ error: message }, { status: 400 }));
  }
}

export async function OPTIONS() {
  return handleOptions();
}
