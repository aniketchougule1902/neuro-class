import algosdk from 'algosdk';

const ALGOD_TOKEN = '';
const ALGOD_SERVER = 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = 443;

export const NEUROCLASS_TREASURY_ADDRESS = 'ECQ2Y3ZDYKG65YV2VI37AXDK5C26NVVUFN4CU2UFKMF2CHS25T2N53YPCI'; // Testnet Treasury

let algodClient: algosdk.Algodv2 | null = null;

export const getAlgodClient = () => {
  if (!algodClient) {
    algodClient = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT);
  }
  return algodClient;
};

export const algoClient = {
  /**
   * Reconstruct account from mnemonic
   */
  getAccountFromMnemonic(mnemonic: string) {
    try {
      return algosdk.mnemonicToSecretKey(mnemonic);
    } catch (e) {
      throw new Error('Invalid mnemonic phrase');
    }
  },

  /**
   * Fetch current balance in ALGO
   */
  async getBalance(address: string): Promise<number> {
    const client = getAlgodClient();
    const accountInfo = await client.accountInformation(address).do();
    return Number(accountInfo.amount) / 1000000;
  },

  /**
   * Send payment and return transaction ID
   */
  async payTreasury(mnemonic: string, amountAlgo: number): Promise<string> {
    try {
      const client = getAlgodClient();
      const account = this.getAccountFromMnemonic(mnemonic);
      
      const suggestedParams = await client.getTransactionParams().do();
      
      // Amount in microAlgos
      const amount = Math.floor(amountAlgo * 1000000); 

      // Create Payment Transaction
      const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        sender: account.addr,
        receiver: NEUROCLASS_TREASURY_ADDRESS,
        amount,
        suggestedParams,
        note: new TextEncoder().encode("NeuroClass AI Request via x402 Protocol")
      });

      // Sign Transaction
      const signedTxn = txn.signTxn(account.sk);

      // Submit Transaction
      await client.sendRawTransaction(signedTxn).do();

      // For x402, returning the txId is sufficient since the backend API will verify it.
      return txn.txID().toString();
    } catch (e: any) {
      console.error('Algorand Tx Error:', e);
      throw new Error(e.message || 'Transaction failed');
    }
  }
};
