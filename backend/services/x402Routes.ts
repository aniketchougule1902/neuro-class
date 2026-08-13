import { Hono } from 'hono';
import { paymentMiddleware, x402ResourceServer } from '@x402/hono';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { decodePaymentResponseHeader } from '@x402/core/http';
import type { RoutesConfig } from '@x402/core/server';
import { USDC_TESTNET_ASA_ID } from '@x402/avm';
import { ExactAvmScheme } from '@x402/avm/exact/server';

export const X402_FACILITATOR_URL = (
  process.env.X402_FACILITATOR_URL || 'https://facilitator.goplausible.xyz'
).replace(/\/$/, '');

export const X402_ALGORAND_NETWORK = 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=' as const;
export const X402_USDC_ASSET = USDC_TESTNET_ASA_ID;
export const X402_TREASURY_ADDRESS = (
  process.env.NEUROCLASS_TREASURY_ADDRESS ||
  'HYNRAYO4IGZRBJ6MWZTBIRAOVWQFZODFDQBSJNQNFSP3TRGV5IYOOAZN5A'
).trim();

const amountFromEnvironment = (name: string, fallback: string): string => {
  const value = process.env[name] || fallback;
  if (!/^\d+$/.test(value) || BigInt(value) <= 0n) {
    throw new Error(`${name} must be a positive integer amount in USDC micro-units`);
  }
  return value;
};

const usdcPrice = (amount: string) => ({
  asset: X402_USDC_ASSET,
  amount,
  extra: { name: 'USDC', decimals: 6 },
});

export const X402_CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, PAYMENT-SIGNATURE, X-PAYMENT',
  'Access-Control-Expose-Headers': 'PAYMENT-REQUIRED, PAYMENT-RESPONSE, X-402-Transaction-Id',
};

export function x402OptionsResponse(): Response {
  return new Response(null, { status: 204, headers: X402_CORS_HEADERS });
}

export const X402_ROUTES: RoutesConfig = {
  'POST /api/ai/generate-test': {
    accepts: {
      scheme: 'exact',
      network: X402_ALGORAND_NETWORK,
      payTo: X402_TREASURY_ADDRESS,
      price: usdcPrice(amountFromEnvironment('X402_TEST_PRICE_USDC_MICRO', '100000')),
      maxTimeoutSeconds: 120,
    },
    description: 'Generate a complete AI test paper for a paying instructor',
    mimeType: 'application/json',
    serviceName: 'NeuroClass AI Test Designer',
    tags: ['education', 'assessment', 'ai', 'pay-per-use'],
  },
  'POST /api/ai/generate-assignment': {
    accepts: {
      scheme: 'exact',
      network: X402_ALGORAND_NETWORK,
      payTo: X402_TREASURY_ADDRESS,
      price: usdcPrice(amountFromEnvironment('X402_ASSIGNMENT_PRICE_USDC_MICRO', '50000')),
      maxTimeoutSeconds: 120,
    },
    description: 'Generate a structured AI assignment for a paying instructor',
    mimeType: 'application/json',
    serviceName: 'NeuroClass AI Assignment Designer',
    tags: ['education', 'assignment', 'ai', 'pay-per-use'],
  },
};

const facilitatorClient = new HTTPFacilitatorClient({ url: X402_FACILITATOR_URL });
const resourceServer = new x402ResourceServer(facilitatorClient);
resourceServer.register(X402_ALGORAND_NETWORK, new ExactAvmScheme());

export const x402PaymentMiddleware = paymentMiddleware(X402_ROUTES, resourceServer);

export const x402App = new Hono();
x402App.use('*', x402PaymentMiddleware);

export async function addSettlementReceipt(response: Response): Promise<Response> {
  const corsHeaders = new Headers(response.headers);
  Object.entries(X402_CORS_HEADERS).forEach(([key, value]) => corsHeaders.set(key, value));
  const corsResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: corsHeaders,
  });

  const encodedSettlement = corsResponse.headers.get('PAYMENT-RESPONSE');
  if (!encodedSettlement || corsResponse.status < 200 || corsResponse.status >= 300) return corsResponse;

  let settlement: ReturnType<typeof decodePaymentResponseHeader>;
  try {
    settlement = decodePaymentResponseHeader(encodedSettlement);
  } catch {
    return corsResponse;
  }

  if (!settlement.success || !settlement.transaction) return corsResponse;

  const headers = new Headers(corsResponse.headers);
  headers.set('X-402-Transaction-Id', settlement.transaction);
  headers.set(
    'Access-Control-Expose-Headers',
    'PAYMENT-RESPONSE, X-402-Transaction-Id',
  );

  const contentType = corsResponse.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return new Response(corsResponse.body, {
      status: corsResponse.status,
      statusText: corsResponse.statusText,
      headers,
    });
  }

  try {
    const payload = await corsResponse.clone().json();
    const enrichedPayload = {
      ...(payload && typeof payload === 'object' ? payload : { data: payload }),
      x402: {
        protocolVersion: 2,
        network: settlement.network,
        asset: X402_USDC_ASSET,
        transactionId: settlement.transaction,
        payer: settlement.payer,
        amount: settlement.amount,
        receiptHeader: encodedSettlement,
      },
    };

    headers.set('content-type', 'application/json');
    return new Response(JSON.stringify(enrichedPayload), {
      status: corsResponse.status,
      statusText: corsResponse.statusText,
      headers,
    });
  } catch {
    return new Response(corsResponse.body, {
      status: corsResponse.status,
      statusText: corsResponse.statusText,
      headers,
    });
  }
}
