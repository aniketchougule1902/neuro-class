import { NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, PAYMENT-SIGNATURE, X-PAYMENT',
  'Access-Control-Expose-Headers': 'PAYMENT-RESPONSE, X-402-Transaction-Id',
};

export function withCors(response: NextResponse): NextResponse {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export function handleOptions() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
