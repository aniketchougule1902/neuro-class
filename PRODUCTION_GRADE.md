# NeuroClass Production-Grade Architecture & Implementation Guide

## Executive Summary

NeuroClass is a next-generation AI-powered educational platform integrated with the **x402 Micropayment Protocol** and **Algorand TestNet** blockchain settlement. To transform the repository's basic structure into a **production-grade enterprise application**, we have engineered a robust architectural framework encompassing rigorous error handling, secure biometric proctoring, verifiable micropayment validation, automated AI agents with strict spending limits, and containerized deployment readiness.

---

## 1. System Architecture Overview

The production architecture decouples the client-side futuristic UI from resilient backend microservices, which govern AI intelligence and cryptographic settlement via Algorand.

```
┌────────────────────────────────────────────────────────┐
│                   Frontend (React / Vite)              │
│       Dashboard | Classrooms | AI Marketplace | Wallet │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS / REST / JSON-RPC
                            ▼
┌────────────────────────────────────────────────────────┐
│             Backend API Gateway (Node.js / Express)    │
│      Auth & Session | Error Middleware | Rate Limiting │
└───────┬───────────────────┬────────────────────┬───────┘
        │                   │                    │
        ▼                   ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌────────────────┐
│  AI Service  │    │  x402 Layer  │    │ Supabase / SQL │
│ (Google GenAI│    │ & Verification│   │  (PostgreSQL)  │
│  / OpenAI)   │    └──────┬───────┘    └────────────────┘
└──────────────┘           │
                           ▼
                 ┌──────────────────┐
                 │ Algorand TestNet │
                 │ Smart Settlement │
                 └──────────────────┘
```

---

## 2. Key Production Enhancements

### A. Algorand x402 Micropayment Verification Gateway
NeuroClass uses the **x402 protocol** to gate paid AI generation services on Algorand Testnet.

- **HTTP 402 Payment Required**: Protected AI routes return a challenge containing the exact ALGO price, Testnet network, service path, and configured treasury address.
- **Non-custodial wallet signing**: The frontend uses `@perawallet/connect`; users approve the payment in Pera Wallet. NeuroClass never generates, stores, or accepts a browser mnemonic.
- **On-chain verification**: The backend validates the transaction ID through the Algorand Testnet Indexer, including payment type, exact treasury receiver, and minimum amount.
- **Replay protection**: Every consumed transaction ID is claimed once in `x402_payments.tx_hash`, with the unique database constraint protecting concurrent retries.
- **Refund path**: If AI execution fails after payment is consumed, the backend attempts a treasury refund and marks the ledger row `refunded` or `refund_pending`.

### B. Enterprise-Grade Security & Error Handling
- **Centralized Error Middleware**: Standardized JSON error responses with operational vs. programming error classification.
- **Row-Level Security (RLS)**: Enforced PostgreSQL policies on Supabase for data isolation across teachers, students, and classrooms.
- **Biometric Integrity**: Face-ID embedding verification logs for proctoring sessions with tamper-evident violation tracking.

### C. DevOps & Containerization
- **Multi-Stage Dockerfile**: Optimized container build supporting Node.js 20+ runtime for backend and API services.
- **Docker Compose Orchestration**: Seamless local and staging deployment integrating PostgreSQL, Redis cache, and Node services.
- **GitHub Actions CI/CD**: Automated workflows for TypeScript compilation, unit testing, linting, and staging deployment.

---

## 3. Production Deployment Instructions

1. **Environment Configuration**:
   Configure the backend with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `NEUROCLASS_TREASURY_ADDRESS`, `ALGOD_SERVER_URL`, and `ALGORAND_INDEXER_URL`. Keep `TREASURY_MNEMONIC` server-only and configure it only when automatic refunds are enabled. Set `X402_REQUIRE_LEDGER=true` in production. For local development only, `X402_ALLOW_DEMO_PAYMENTS=true` may be used; never enable it in production.

   Configure the frontend with `VITE_BACKEND_URL`, `VITE_ALGOD_SERVER_URL`, and `VITE_NEUROCLASS_TREASURY_ADDRESS`. Fund a Pera Testnet account from the Algorand Testnet dispenser before using paid AI features.
2. **Build & Run with Docker**:
   ```bash
   docker-compose up --build -d
   ```
3. **Database Migration**:
   Execute `supabase/schema.sql` on your PostgreSQL / Supabase instance. The payment ledger is server-managed; do not restore anonymous SELECT or INSERT policies for `x402_payments`.
4. **Wallet flow**:
   Open the Protocol Dashboard, connect Pera Wallet on Testnet, and approve the displayed amount. The signed transaction must be confirmed before it is sent to the paid API route.
5. **Validation**:
   ```bash
   npm run lint
   npm run build
   (cd backend && npm run build)
   ```

---
*Prepared by Manus AI for NeuroClass Project*
