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
Unlike standard fiat gateways, NeuroClass uses the **x402 protocol** to gate paid AI agent services (Question Generator, AI Proctor, Answer Evaluator). 
- **HTTP 402 Payment Required**: Unauthenticated requests to paid endpoints return HTTP 402 with required fee metadata and recipient wallet addresses.
- **On-Chain Verification**: The backend validates Algorand transaction hashes against TestNet nodes (`algosdk`) ensuring settlement before executing LLM inference.
- **Agent Spending Governance**: AI autonomous agents operate under strict policy caps (e.g., maximum $0.05 per transaction, $1.00 daily limit).

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
   Copy `.env.example` to `.env` and supply production Supabase, Algorand Node, and Google GenAI API credentials.
2. **Build & Run with Docker**:
   ```bash
   docker-compose up --build -d
   ```
3. **Database Migration**:
   Execute `supabase/schema.sql` on your PostgreSQL / Supabase instance to provision tables, indexes, and RLS policies.

---
*Prepared by Manus AI for NeuroClass Project*
