import { NextResponse } from 'next/server';
import { supabase, isSupabaseServiceRoleConfigured } from '../../../../database/supabase';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return NextResponse.json({ error: 'Authentication is required.' }, { status: 401 });
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return NextResponse.json({ error: 'Authentication is invalid or expired.' }, { status: 401 });
  if (!isSupabaseServiceRoleConfigured()) return NextResponse.json({ payments: [] });

  const url = new URL(request.url);
  const payer = url.searchParams.get('payer');
  if (!payer || payer.length > 64) return NextResponse.json({ error: 'A valid payer address is required.' }, { status: 400 });

  const { data, error } = await supabase.from('x402_payments')
    .select('id,service_name,status,network,asset_id,amount_usdc_micro,payer_address,receiver_address,settlement_tx_id,request_path,payment_response,created_at,updated_at')
    .eq('payer_address', payer)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ error: 'Unable to read the payment ledger.' }, { status: 500 });

  return NextResponse.json({ payments: (data || []).map((payment: any) => ({
    ...payment,
    explorerUrl: payment.settlement_tx_id ? `https://testnet.explorer.perawallet.app/tx/${encodeURIComponent(payment.settlement_tx_id)}` : null,
  })) });
}
