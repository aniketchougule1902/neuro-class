import { NextRequest, NextResponse } from 'next/server';
import { algorandService } from '../../../../services/algorandService';
import { withCors, handleOptions } from '../../../../lib/cors';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { txId, priceAlgo = 0.10 } = body;
    
    const result = await algorandService.verifyPaymentTx(txId, priceAlgo);
    
    if (result.valid) {
      return withCors(NextResponse.json({ status: "settled", ...result }));
    } else {
      return withCors(NextResponse.json({ status: "failed", ...result }, { status: 400 }));
    }
  } catch (err: any) {
    return withCors(NextResponse.json({ error: err.message || "Payment verification error" }, { status: 500 }));
  }
}

export async function OPTIONS() {
  return handleOptions();
}
