import { NextRequest, NextResponse } from 'next/server';
import { aiGenerationService } from '../../../../services/aiGenerationService';
import { validateX402Payment } from '../../../../middleware/x402Middleware';
import { withCors, handleOptions } from '../../../../lib/cors';

export async function POST(req: NextRequest) {
  try {
    // Validate x402 payment (0.05 ALGO for this service)
    const paymentCheck = await validateX402Payment(req, 0.05);
    if (!paymentCheck.valid) {
      return paymentCheck.errorResponse as NextResponse;
    }

    const body = await req.json();
    const assignment = await aiGenerationService.generateAssignment(body);
    
    return withCors(NextResponse.json({ success: true, assignment }));
  } catch (err: any) {
    console.error("AI Assignment Generation failed:", err);
    return withCors(NextResponse.json({ error: err.message || "AI Assignment Generation failed" }, { status: 500 }));
  }
}

export async function OPTIONS() {
  return handleOptions();
}
