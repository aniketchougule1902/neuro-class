import { NextResponse } from 'next/server';
import { algorandService, NEUROCLASS_TREASURY_ADDRESS } from '../../../../services/algorandService';
import { withCors, handleOptions } from '../../../../lib/cors';

export const dynamic = 'force-dynamic'; // Prevent static caching for wallet generation

export async function GET() {
  try {
    const wallet = algorandService.generateTestnetWallet();
    const balance = await algorandService.getBalance(String(wallet.address));
    
    return withCors(NextResponse.json({
      address: wallet.address,
      mnemonic: wallet.mnemonic,
      secretKey: wallet.secretKey,
      balanceAlgo: balance,
      treasuryAddress: NEUROCLASS_TREASURY_ADDRESS
    }));
  } catch (err: any) {
    return withCors(NextResponse.json({ error: err.message || "Failed to generate Algorand wallet" }, { status: 500 }));
  }
}

export async function OPTIONS() {
  return handleOptions();
}
