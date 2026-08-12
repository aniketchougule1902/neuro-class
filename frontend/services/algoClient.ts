import algosdk from 'algosdk';

const ALGOD_TOKEN = '';
const ALGOD_SERVER = 'https://testnet-api.algonode.cloud';
const ALGOD_PORT = 443;

export const NEUROCLASS_TREASURY_ADDRESS = 'V5KOUF7UUM6YHTP3Q3J3J6QGBJ366X44YZQOPOW4Y4W63XJIFXYJ5E7YHQ'; // Testnet Treasury

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
    return (accountInfo.amount as number) / 1000000;
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
        from: account.addr,
        to: NEUROCLASS_TREASURY_ADDRESS,
        amount,
        suggestedParams,
        note: new TextEncoder().encode("NeuroClass AI Request via x402 Protocol")
      });

      // Sign Transaction
      const signedTxn = txn.signTxn(account.sk);

      // Submit Transaction
      const { txId } = await client.sendRawTransaction(signedTxn).do();

      // Wait for confirmation (simplified for UI responsiveness, usually we should wait but API will verify)
      // For x402, returning the txId is sufficient since the backend API will verify it.
      
      return txId;
    } catch (e: any) {
      console.error('Algorand Tx Error:', e);
      throw new Error(e.message || 'Transaction failed');
    }
  }
};
