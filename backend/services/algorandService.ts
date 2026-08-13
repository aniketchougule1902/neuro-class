import algosdkImport from 'algosdk';

const algosdk: typeof algosdkImport = (algosdkImport as any).default || algosdkImport;

const ALGOD_SERVER = process.env.ALGOD_SERVER_URL || 'https://testnet-api.algonode.cloud';
const INDEXER_SERVER = process.env.ALGORAND_INDEXER_URL || 'https://testnet-idx.algonode.cloud';
const PORT = Number(process.env.ALGORAND_PORT || 443);
const ALLOW_DEMO_PAYMENTS = process.env.X402_ALLOW_DEMO_PAYMENTS === 'true' && process.env.NODE_ENV !== 'production';
const TREASURY_MNEMONIC = process.env.TREASURY_MNEMONIC?.trim();
const DEFAULT_TESTNET_TREASURY = 'ECQ2Y3ZDYKG65YV2VI37AXDK5C26NVVUFN4CU2UFKMF2CHS25T2N53YPCI';

// A public receiving address may be committed; the treasury signing key must never be.
export const NEUROCLASS_TREASURY_ADDRESS = (
  process.env.NEUROCLASS_TREASURY_ADDRESS || DEFAULT_TESTNET_TREASURY
).trim();

if (!algosdk.isValidAddress(NEUROCLASS_TREASURY_ADDRESS)) {
  throw new Error('NEUROCLASS_TREASURY_ADDRESS is not a valid Algorand address');
}

export const algodClient = new algosdk.Algodv2('', ALGOD_SERVER, PORT);
export const indexerClient = new algosdk.Indexer('', INDEXER_SERVER, PORT);

export interface PaymentVerificationResult {
  valid: boolean;
  txId?: string;
  sender?: string;
  receiver?: string;
  amountAlgo?: number;
  message?: string;
}

const isAlgorandTransactionId = (value: string) => /^[A-Z2-7]{52}$/.test(value);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const algorandService = {
  async getBalance(address: string): Promise<number> {
    if (!algosdk.isValidAddress(address)) throw new Error('Invalid Algorand address');
    const info = await algodClient.accountInformation(address).do();
    return Number(info.amount) / 1e6;
  },

  async verifyPaymentTx(txId: string, minAmountAlgo = 0.05): Promise<PaymentVerificationResult> {
    const normalizedTxId = String(txId || '').trim().toUpperCase();
    const minimum = Number(minAmountAlgo);

    if (!Number.isFinite(minimum) || minimum <= 0) {
      return { valid: false, message: 'Payment amount must be greater than zero' };
    }

    if (ALLOW_DEMO_PAYMENTS && /^(DEV-TX-|X402-SETTLED-)/.test(normalizedTxId)) {
      return {
        valid: true,
        txId: normalizedTxId,
        sender: 'TESTNET_DEMO_WALLET',
        receiver: NEUROCLASS_TREASURY_ADDRESS,
        amountAlgo: minimum,
        message: 'Verified using the development-only x402 settlement simulator'
      };
    }

    if (!isAlgorandTransactionId(normalizedTxId)) {
      return { valid: false, message: 'Invalid Algorand transaction ID' };
    }

    let lastError: unknown;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        const txInfo = await indexerClient.lookupTransactionByID(normalizedTxId).do();
        const transaction: any = txInfo.transaction;
        const txType = transaction?.txType || transaction?.['tx-type'];
        const paymentInfo = transaction?.paymentTransaction || transaction?.['payment-transaction'];
        const receiver = String(paymentInfo?.receiver || '');
        const sender = String(transaction?.sender || transaction?.snd || '');
        const amountAlgo = Number(paymentInfo?.amount || 0) / 1e6;

        if (txType !== 'pay' || !paymentInfo) {
          return { valid: false, txId: normalizedTxId, message: 'Transaction is not an Algorand payment' };
        }
        if (receiver !== NEUROCLASS_TREASURY_ADDRESS) {
          return {
            valid: false,
            txId: normalizedTxId,
            receiver,
            message: 'Payment receiver does not match the NeuroClass treasury'
          };
        }
        if (amountAlgo < minimum) {
          return {
            valid: false,
            txId: normalizedTxId,
            sender,
            receiver,
            amountAlgo,
            message: `Insufficient payment amount: ${amountAlgo} ALGO provided, ${minimum} ALGO required`
          };
        }

        return {
          valid: true,
          txId: normalizedTxId,
          sender,
          receiver,
          amountAlgo,
          message: 'Algorand on-chain payment verified'
        };
      } catch (error) {
        lastError = error;
        if (attempt < 3) await sleep(750 * (attempt + 1));
      }
    }

    return {
      valid: false,
      txId: normalizedTxId,
      message: `Algorand transaction verification failed: ${lastError instanceof Error ? lastError.message : 'transaction not found'}`
    };
  },

  async issueRefund(receiverAddress: string, amountAlgo: number): Promise<string> {
    if (!TREASURY_MNEMONIC) {
      throw new Error('TREASURY_MNEMONIC is not configured; automatic refunds are disabled');
    }
    if (!algosdk.isValidAddress(receiverAddress)) throw new Error('Invalid refund receiver address');
    if (!Number.isFinite(amountAlgo) || amountAlgo <= 0) throw new Error('Refund amount must be greater than zero');

    const account = algosdk.mnemonicToSecretKey(TREASURY_MNEMONIC);
    if (String(account.addr) !== NEUROCLASS_TREASURY_ADDRESS) {
      throw new Error('TREASURY_MNEMONIC does not belong to NEUROCLASS_TREASURY_ADDRESS');
    }

    const suggestedParams = await algodClient.getTransactionParams().do();
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: account.addr,
      receiver: receiverAddress,
      amount: Math.floor(amountAlgo * 1_000_000),
      suggestedParams,
      note: new TextEncoder().encode('NeuroClass x402 refund')
    });

    const signedTxn = txn.signTxn(account.sk);
    const response = await algodClient.sendRawTransaction(signedTxn).do();
    return response.txid || (response as any).txId;
  }
};

export const isDemoPaymentsEnabled = () => ALLOW_DEMO_PAYMENTS;
export const isTreasuryRefundConfigured = () => Boolean(TREASURY_MNEMONIC);
export default algorandService;
