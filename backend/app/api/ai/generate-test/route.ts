import { NextRequest, NextResponse } from 'next/server';
import { aiGenerationService } from '../../../../services/aiGenerationService';
import { validateX402Payment } from '../../../../middleware/x402Middleware';
import { withCors, handleOptions } from '../../../../lib/cors';

export async function POST(req: NextRequest) {
  try {
    // Validate x402 payment (0.10 ALGO for this service)
    const paymentCheck = await validateX402Payment(req, 0.10);
    if (!paymentCheck.valid) {
      return paymentCheck.errorResponse as NextResponse;
    }

    const body = await req.json();
    const test = await aiGenerationService.generateTest(body);
    
    return withCors(NextResponse.json({ success: true, test }));
  } catch (err: any) {
    console.error("AI Test Generation failed:", err);
    return withCors(NextResponse.json({ error: err.message || "AI Test Generation failed" }, { status: 500 }));
  }
}

export async function OPTIONS() {
  return handleOptions();
}
