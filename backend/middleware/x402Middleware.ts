import { NextRequest, NextResponse } from 'next/server';
import { algorandService, NEUROCLASS_TREASURY_ADDRESS } from '../services/algorandService';
import { isSupabaseConfigured, isSupabaseServiceRoleConfigured, supabase } from '../database/supabase';
import { withCors } from '../lib/cors';

const REQUIRE_PAYMENT_LEDGER = process.env.X402_REQUIRE_LEDGER === 'true' || process.env.NODE_ENV === 'production';

export interface X402PaymentResult {
  valid: boolean;
  errorResponse?: NextResponse;
  payment?: {
    txId: string;
    sender: string;
    receiver: string;
    amountAlgo: number;
    verified: boolean;
  };
}

const challengeFor = (req: NextRequest, priceAlgo: number) => ({
  protocol: 'x402',
  network: 'algorand-testnet',
  priceAlgo,
  receiver: NEUROCLASS_TREASURY_ADDRESS,
  service: req.nextUrl.pathname
});

const paymentError = (req: NextRequest, status: number, error: string, message: string, priceAlgo: number) => {
  const response = NextResponse.json({
    status,
    error,
    message,
    challenge: challengeFor(req, priceAlgo)
  }, { status });

  response.headers.set(
    'WWW-Authenticate',
    `x402 realm="NeuroClass AI Marketplace", price="${priceAlgo} ALGO", receiver="${NEUROCLASS_TREASURY_ADDRESS}"`
  );
  response.headers.set('X-402-Price', `${priceAlgo} ALGO`);
  response.headers.set('X-402-Receiver', NEUROCLASS_TREASURY_ADDRESS);
  return withCors(response);
};

async function claimPayment(txId: string, priceAlgo: number, sender: string, receiver: string, amountAlgo: number, serviceName: string) {
  if (!isSupabaseConfigured() || (process.env.NODE_ENV === 'production' && !isSupabaseServiceRoleConfigured())) {
    if (REQUIRE_PAYMENT_LEDGER) {
      return { ok: false, duplicate: false, message: 'Production payment ledger requires SUPABASE_SERVICE_ROLE_KEY' };
    }
    return { ok: true, duplicate: false };
  }

  const { data: existing, error: lookupError } = await supabase
    .from('x402_payments')
    .select('id,status,service_name')
    .eq('tx_hash', txId)
    .maybeSingle();

  if (lookupError) {
    return { ok: false, duplicate: false, message: `Payment ledger lookup failed: ${lookupError.message}` };
  }
  if (existing) {
    return { ok: false, duplicate: true, message: 'This payment transaction has already been consumed' };
  }

  const { error: insertError } = await supabase.from('x402_payments').insert({
    tx_hash: txId,
    amount_algo: amountAlgo || priceAlgo,
    service_name: serviceName,
    payer_address: sender || null,
    receiver_address: receiver || NEUROCLASS_TREASURY_ADDRESS,
    status: 'settled'
  });

  if (insertError) {
    // The unique tx_hash constraint makes concurrent retries safe even if both pass the lookup.
    if (insertError.code === '23505') {
      return { ok: false, duplicate: true, message: 'This payment transaction has already been consumed' };
    }
    return { ok: false, duplicate: false, message: `Payment ledger insert failed: ${insertError.message}` };
  }

  return { ok: true, duplicate: false };
}

export async function markPaymentRefunded(txId: string, refundTxId?: string) {
  if (!isSupabaseConfigured()) return;
  await supabase.from('x402_payments').update({
    status: refundTxId ? 'refunded' : 'refund_pending'
  }).eq('tx_hash', txId);
}

/** Validate and atomically consume an x402 Algorand payment for one paid operation. */
export async function validateX402Payment(req: NextRequest, priceAlgo = 0.10): Promise<X402PaymentResult> {
  const authHeader = req.headers.get('authorization');
  const txId = (
    req.headers.get('x-402-payment-txid') ||
    req.headers.get('x-payment-txid') ||
    (authHeader?.toLowerCase().startsWith('x402 ') ? authHeader.slice(5).trim() : undefined) ||
    req.nextUrl.searchParams.get('txId')
  )?.trim();

  if (!txId) {
    return { valid: false, errorResponse: paymentError(
      req,
      402,
      'Payment Required',
      `This AI execution requires a micro-payment of ${priceAlgo} ALGO via the x402 Protocol.`,
      priceAlgo
    ) };
  }

  const verification = await algorandService.verifyPaymentTx(txId, priceAlgo);
  if (!verification.valid) {
    return { valid: false, errorResponse: paymentError(req, 402, 'Payment Verification Failed', verification.message || 'Payment could not be verified', priceAlgo) };
  }

  const claim = await claimPayment(
    txId,
    priceAlgo,
    verification.sender || '',
    verification.receiver || NEUROCLASS_TREASURY_ADDRESS,
    verification.amountAlgo || priceAlgo,
    req.nextUrl.pathname
  );

  if (!claim.ok) {
    return {
      valid: false,
      errorResponse: paymentError(
        req,
        claim.duplicate ? 409 : 503,
        claim.duplicate ? 'Payment Already Consumed' : 'Payment Ledger Unavailable',
        claim.message || 'Unable to safely claim the payment',
        priceAlgo
      )
    };
  }

  return {
    valid: true,
    payment: {
      txId,
      sender: verification.sender || '',
      receiver: verification.receiver || NEUROCLASS_TREASURY_ADDRESS,
      amountAlgo: verification.amountAlgo ?? priceAlgo,
      verified: true
    }
  };
}
