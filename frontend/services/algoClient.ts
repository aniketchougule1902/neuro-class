import { PeraWalletConnect } from '@perawallet/connect';
import algosdk from 'algosdk';
import { x402Client, wrapFetchWithPayment } from '@x402/fetch';
import type { ClientAvmSigner } from '@x402/avm';
import { ExactAvmScheme } from '@x402/avm/exact/client';
import {
  AccessResolution,
  parsePaymentRequirementHeader,
  parseSettlementReceiptHeader,
} from '../types/x402-domain';

const ALGORAND_TESTNET_CAIP2 = import.meta.env.VITE_X402_NETWORK || 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=';
const ALGOD_SERVER = import.meta.env.VITE_ALGOD_SERVER_URL || 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = Number(import.meta.env.VITE_ALGORAND_PORT || 443);

export const NEUROCLASS_TREASURY_ADDRESS = (
  import.meta.env.VITE_NEUROCLASS_TREASURY_ADDRESS ||
  'HYNRAYO4IGZRBJ6MWZTBIRAOVWQFZODFDQBSJNQNFSP3TRGV5IYOOAZN5A'
).trim();

const peraWallet = new PeraWalletConnect({
  chainId: 416002,
  shouldShowSignTxnToast: true,
});

let algodClient: algosdk.Algodv2 | null = null;
let connectedAddress: string | null = null;

const getAlgodClient = () => {
  if (!algodClient) algodClient = new algosdk.Algodv2('', ALGOD_SERVER, ALGOD_PORT);
  return algodClient;
};

const normalizeAccounts = (accounts: unknown): string[] => {
  if (!Array.isArray(accounts)) return [];
  return accounts.filter(
    (address): address is string => typeof address === 'string' && algosdk.isValidAddress(address),
  );
};

const createPeraX402Signer = (address: string): ClientAvmSigner => ({
  address,
  async signTransactions(txns: Uint8Array[], indexesToSign?: number[]) {
    const shouldSign = (index: number) =>
      !indexesToSign || indexesToSign.includes(index);

    const transactionGroup = txns.map((encoded, index) => ({
      txn: algosdk.decodeUnsignedTransaction(encoded),
      signers: shouldSign(index) ? [address] : [],
    }));

    const signed = await peraWallet.signTransaction([transactionGroup]);
    return signed.map((encoded) => encoded ?? null);
  },
});

const createX402Fetch = (address: string) => {
  const signer = createPeraX402Signer(address);
  const client = new x402Client().register(
    ALGORAND_TESTNET_CAIP2,
    new ExactAvmScheme(signer, { algodUrl: ALGOD_SERVER }),
  );

  return wrapFetchWithPayment(globalThis.fetch.bind(globalThis), client);
};

export const algoClient = {
  async reconnectWallet(): Promise<string | null> {
    try {
      const accounts = normalizeAccounts(await peraWallet.reconnectSession());
      connectedAddress = accounts[0] || null;
      return connectedAddress;
    } catch {
      connectedAddress = null;
      return null;
    }
  },

  async connectWallet(): Promise<string> {
    const accounts = normalizeAccounts(await peraWallet.connect());
    connectedAddress = accounts[0] || null;
    if (!connectedAddress) throw new Error('No Algorand account was returned by Pera Wallet');
    return connectedAddress;
  },

  async disconnectWallet() {
    await peraWallet.disconnect();
    connectedAddress = null;
  },

  getConnectedAddress() {
    return connectedAddress;
  },

  async fetchWithX402(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const address = connectedAddress || await this.connectWallet();
    return createX402Fetch(address)(input, init);
  },

  async resolveAccess<T = unknown>(response: Response): Promise<AccessResolution<T>> {
    if (response.status === 402) {
      const challengeHeader = response.headers.get('PAYMENT-REQUIRED') || response.headers.get('payment-required');
      const requirement = parsePaymentRequirementHeader(challengeHeader);
      if (requirement && challengeHeader) {
        return {
          status: 'payment_required',
          requirement,
          challengeHeader,
        };
      }
      return {
        status: 'failed',
        error: 'Payment requirement challenge missing or malformed',
        failureCode: 'MALFORMED_CHALLENGE',
        retryable: true,
      };
    }

    if (response.ok) {
      const receiptHeader = response.headers.get('PAYMENT-RESPONSE') || response.headers.get('payment-response');
      const receipt = parseSettlementReceiptHeader(receiptHeader);
      const data = await response.json().catch(() => null);
      const enrichedReceipt = data && typeof data === 'object' && 'x402' in data
        ? (data as { x402: Record<string, unknown> }).x402
        : null;

      if (receipt) {
        return {
          status: 'authorised',
          receipt: {
            ...receipt,
            explorerUrl: typeof enrichedReceipt?.explorerUrl === 'string' ? enrichedReceipt.explorerUrl : receipt.explorerUrl,
            serviceName: typeof enrichedReceipt?.serviceName === 'string' ? enrichedReceipt.serviceName : receipt.serviceName,
          },
          data: data as T,
        };
      }
      if (data && typeof data === 'object' && 'x402' in data) {
        const x402Obj = (data as { x402: Record<string, unknown> }).x402;
        return {
          status: 'authorised',
          receipt: {
            protocolVersion: Number(x402Obj.protocolVersion || 2),
            network: String(x402Obj.network || ''),
            asset: String(x402Obj.asset || ''),
            transactionId: String(x402Obj.transactionId || ''),
            payer: String(x402Obj.payer || ''),
            amount: String(x402Obj.amount || ''),
            receiptHeader: String(x402Obj.receiptHeader || ''),
            explorerUrl: typeof x402Obj.explorerUrl === 'string' ? x402Obj.explorerUrl : undefined,
            serviceName: typeof x402Obj.serviceName === 'string' ? x402Obj.serviceName : undefined,
          },
          data: data as T,
        };
      }

      return {
        status: 'failed',
        error: 'Authorised response was missing a valid settlement receipt',
        failureCode: 'RECEIPT_MISSING',
        retryable: false,
      };
    }

    const errBody = await response.json().catch(() => ({}));
    return {
      status: 'failed',
      error: errBody.error || `HTTP ${response.status} error`,
      failureCode: `HTTP_${response.status}`,
      retryable: response.status >= 500,
    };
  },

  async getBalance(address: string): Promise<number> {
    if (!algosdk.isValidAddress(address)) throw new Error('Invalid Algorand address');
    const accountInfo = await getAlgodClient().accountInformation(address).do();
    return Number(accountInfo.amount) / 1_000_000;
  },

  async waitForConfirmation(txId: string, rounds = 30): Promise<void> {
    const client = getAlgodClient();
    for (let attempt = 0; attempt < rounds; attempt += 1) {
      const pending = await client.pendingTransactionInformation(txId).do();
      if (pending['pool-error']) throw new Error(String(pending['pool-error']));
      if (Number(pending['confirmed-round'] || 0) > 0) return;
      await new Promise(resolve => setTimeout(resolve, 1_000));
    }
    throw new Error('Transaction was submitted but not confirmed within the expected time');
  },
};

peraWallet.connector?.on('disconnect', () => {
  connectedAddress = null;
});
