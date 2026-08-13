import { NextRequest, NextResponse } from 'next/server';
import { algorandService, NEUROCLASS_TREASURY_ADDRESS } from '../../../../services/algorandService';
import { withCors, handleOptions } from '../../../../lib/cors';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const txId = typeof body?.txId === 'string' ? body.txId.trim() : '';
    const priceAlgo = Number(body?.priceAlgo ?? 0.10);

    if (!txId || !Number.isFinite(priceAlgo) || priceAlgo <= 0 || priceAlgo > 100) {
      return withCors(NextResponse.json({
        status: 'failed',
        error: 'txId and a valid priceAlgo are required'
      }, { status: 400 }));
    }

    const result = await algorandService.verifyPaymentTx(txId, priceAlgo);
    return withCors(NextResponse.json({
      status: result.valid ? 'verified' : 'failed',
      treasury: NEUROCLASS_TREASURY_ADDRESS,
      network: 'algorand-testnet',
      ...result
    }, { status: result.valid ? 200 : 400 }));
  } catch (err: any) {
    return withCors(NextResponse.json({
      status: 'failed',
      error: err instanceof Error ? err.message : 'Payment verification error'
    }, { status: 500 }));
  }
}

export async function OPTIONS() {
  return handleOptions();
}
