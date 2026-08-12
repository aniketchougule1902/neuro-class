import { Request, Response, NextFunction } from 'express';
import { algorandService, NEUROCLASS_TREASURY_ADDRESS } from '../services/algorandService';

export interface X402Request extends Request {
  x402Payment?: {
    txId: string;
    amountAlgo: number;
    verified: boolean;
  };
}

/**
 * Express Middleware enforcing x402 Payment Protocol for AI Services
 * @param priceAlgo Cost of the service in ALGO (default: 0.10 ALGO)
 */
export function requireX402Payment(priceAlgo: number = 0.10) {
  return async (req: X402Request, res: Response, next: NextFunction) => {
    // Check for transaction ID in custom header, Authorization header, or query params
    const txId = (
      req.headers['x-402-payment-txid'] as string ||
      req.headers['x-payment-txid'] as string ||
      (req.headers['authorization']?.startsWith('x402 ') ? req.headers['authorization'].split(' ')[1] : undefined) ||
      req.query.txId as string
    );

    if (!txId) {
      res.setHeader('WWW-Authenticate', `x402 realm="NeuroClass AI Marketplace", price="${priceAlgo} ALGO", receiver="${NEUROCLASS_TREASURY_ADDRESS}"`);
      res.setHeader('X-402-Price', `${priceAlgo} ALGO`);
      res.setHeader('X-402-Receiver', NEUROCLASS_TREASURY_ADDRESS);
      
      return res.status(402).json({
        status: 402,
        error: 'Payment Required',
        message: `This AI execution requires a micro-payment of ${priceAlgo} ALGO via the x402 Protocol.`,
        challenge: {
          protocol: 'x402',
          network: 'algorand-testnet',
          priceAlgo,
          receiver: NEUROCLASS_TREASURY_ADDRESS,
          service: req.originalUrl
        }
      });
    }

    // Verify the payment on Algorand Testnet
    const verification = await algorandService.verifyPaymentTx(txId, priceAlgo);

    if (!verification.valid) {
      res.setHeader('WWW-Authenticate', `x402 realm="NeuroClass AI Marketplace", price="${priceAlgo} ALGO", error="${verification.message}"`);
      return res.status(402).json({
        status: 402,
        error: 'Payment Verification Failed',
        message: verification.message,
        challenge: {
          protocol: 'x402',
          network: 'algorand-testnet',
          priceAlgo,
          receiver: NEUROCLASS_TREASURY_ADDRESS,
          service: req.originalUrl
        }
      });
    }

    // Payment valid -> attach x402 metadata and proceed
    req.x402Payment = {
      txId,
      amountAlgo: verification.amountAlgo ?? priceAlgo,
      verified: true
    };

    next();
  };
}
