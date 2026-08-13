import { PeraWalletConnect } from '@perawallet/connect';
import algosdk from 'algosdk';

const ALGOD_SERVER = import.meta.env.VITE_ALGOD_SERVER_URL || 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = Number(import.meta.env.VITE_ALGORAND_PORT || 443);

export const NEUROCLASS_TREASURY_ADDRESS = (
  import.meta.env.VITE_NEUROCLASS_TREASURY_ADDRESS ||
  'HYNRAYO4IGZRBJ6MWZTBIRAOVWQFZODFDQBSJNQNFSP3TRGV5IYOOAZN5A'
).trim();

const peraWallet = new PeraWalletConnect({
  chainId: 416002,
  shouldShowSignTxnToast: true
});

let algodClient: algosdk.Algodv2 | null = null;
let connectedAddress: string | null = null;

const getAlgodClient = () => {
  if (!algodClient) algodClient = new algosdk.Algodv2('', ALGOD_SERVER, ALGOD_PORT);
  return algodClient;
};

const normalizeAccounts = (accounts: unknown): string[] => {
  if (!Array.isArray(accounts)) return [];
  return accounts.filter((address): address is string => typeof address === 'string' && algosdk.isValidAddress(address));
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

  async getBalance(address: string): Promise<number> {
    if (!algosdk.isValidAddress(address)) throw new Error('Invalid Algorand address');
    const accountInfo = await getAlgodClient().accountInformation(address).do();
    return Number(accountInfo.amount) / 1_000_000;
  },

  async payTreasury(amountAlgo: number, address = connectedAddress): Promise<string> {
    if (!address || !algosdk.isValidAddress(address)) throw new Error('Connect an Algorand wallet before paying');
    if (!Number.isFinite(amountAlgo) || amountAlgo <= 0 || amountAlgo > 100) throw new Error('Invalid payment amount');

    const suggestedParams = await getAlgodClient().getTransactionParams().do();
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: address,
      receiver: NEUROCLASS_TREASURY_ADDRESS,
      amount: Math.ceil(amountAlgo * 1_000_000),
      suggestedParams,
      note: new TextEncoder().encode('NeuroClass x402 AI service payment')
    });

    const signedTransactions = await peraWallet.signTransaction([[{ txn, signers: [address] }]]);
    if (!signedTransactions?.length) throw new Error('Wallet did not return a signed transaction');

    const { txid } = await getAlgodClient().sendRawTransaction(signedTransactions).do();
    await this.waitForConfirmation(txid);
    return txid;
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
  }
};

peraWallet.connector?.on('disconnect', () => {
  connectedAddress = null;
});
