import { NextRequest, NextResponse } from 'next/server';
import { aiGenerationService } from '../../../../services/aiGenerationService';
import { validateX402Payment, X402PaymentResult } from '../../../../middleware/x402Middleware';
import { algorandService } from '../../../../services/algorandService';
import { withCors, handleOptions } from '../../../../lib/cors';

export async function POST(req: NextRequest) {
  let paymentResult: X402PaymentResult | null = null;
  try {
    // Validate x402 payment (0.10 ALGO for this service)
    paymentResult = await validateX402Payment(req, 0.10);
    if (!paymentResult.valid) {
      return paymentResult.errorResponse as NextResponse;
    }

    const body = await req.json();
    const test = await aiGenerationService.generateTest(body);
    
    return withCors(NextResponse.json({ success: true, test }));
  } catch (err: any) {
    console.error("AI Test Generation failed:", err);
    
    // Auto-Refund Mechanism
    if (paymentResult?.payment?.sender) {
      try {
        const amountToRefund = paymentResult.payment.amountAlgo;
        await algorandService.issueRefund(paymentResult.payment.sender, amountToRefund);
        return withCors(NextResponse.json({ 
          error: `AI Test Generation failed. ${amountToRefund} ALGO has been automatically refunded to your wallet.` 
        }, { status: 500 }));
      } catch (refundErr: any) {
        console.error("Refund failed:", refundErr);
        return withCors(NextResponse.json({ 
          error: "AI Test Generation failed, and automatic refund encountered an error. Please contact support." 
        }, { status: 500 }));
      }
    }

    return withCors(NextResponse.json({ error: err.message || "AI Test Generation failed" }, { status: 500 }));
  }
}

export async function OPTIONS() {
  return handleOptions();
}
