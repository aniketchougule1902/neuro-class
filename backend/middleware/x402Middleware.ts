import { NextRequest, NextResponse } from 'next/server';
import { algorandService, NEUROCLASS_TREASURY_ADDRESS } from '../services/algorandService';
import { withCors } from '../lib/cors';

export interface X402PaymentResult {
  valid: boolean;
  errorResponse?: NextResponse;
  payment?: {
    txId: string;
    sender: string;
    amountAlgo: number;
    verified: boolean;
  };
}

/**
 * Validates x402 Payment Protocol for Next.js API Routes
 * @param req NextRequest object
 * @param priceAlgo Cost of the service in ALGO (default: 0.10 ALGO)
 */
export async function validateX402Payment(req: NextRequest, priceAlgo: number = 0.10): Promise<X402PaymentResult> {
  const searchParams = req.nextUrl.searchParams;
  const authHeader = req.headers.get('authorization');
  
  // Check for transaction ID in custom header, Authorization header, or query params
  const txId = (
    req.headers.get('x-402-payment-txid') ||
    req.headers.get('x-payment-txid') ||
    (authHeader?.startsWith('x402 ') ? authHeader.split(' ')[1] : undefined) ||
    searchParams.get('txId')
  );

  if (!txId) {
    const errorResponse = NextResponse.json({
      status: 402,
      error: 'Payment Required',
      message: `This AI execution requires a micro-payment of ${priceAlgo} ALGO via the x402 Protocol.`,
      challenge: {
        protocol: 'x402',
        network: 'algorand-testnet',
        priceAlgo,
        receiver: NEUROCLASS_TREASURY_ADDRESS,
        service: req.nextUrl.pathname
      }
    }, { status: 402 });
    
    errorResponse.headers.set('WWW-Authenticate', `x402 realm="NeuroClass AI Marketplace", price="${priceAlgo} ALGO", receiver="${NEUROCLASS_TREASURY_ADDRESS}"`);
    errorResponse.headers.set('X-402-Price', `${priceAlgo} ALGO`);
    errorResponse.headers.set('X-402-Receiver', NEUROCLASS_TREASURY_ADDRESS);
    
    return { valid: false, errorResponse: withCors(errorResponse) };
  }

  // Verify the payment on Algorand Testnet
  const verification = await algorandService.verifyPaymentTx(txId, priceAlgo);

  if (!verification.valid) {
    const errorResponse = NextResponse.json({
      status: 402,
      error: 'Payment Verification Failed',
      message: verification.message,
      challenge: {
        protocol: 'x402',
        network: 'algorand-testnet',
        priceAlgo,
        receiver: NEUROCLASS_TREASURY_ADDRESS,
        service: req.nextUrl.pathname
      }
    }, { status: 402 });
    
    errorResponse.headers.set('WWW-Authenticate', `x402 realm="NeuroClass AI Marketplace", price="${priceAlgo} ALGO", error="${verification.message}"`);
    
    return { valid: false, errorResponse: withCors(errorResponse) };
  }

  return {
    valid: true,
    payment: {
      txId,
      sender: verification.sender || '',
      amountAlgo: verification.amountAlgo ?? priceAlgo,
      verified: true
    }
  };
}
