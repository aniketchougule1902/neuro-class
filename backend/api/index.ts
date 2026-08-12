import { createExpressApp } from "../server";

let app: any;

export default function handler(req: any, res: any) {
  try {
    if (!app) {
      app = createExpressApp();
    }
    return app(req, res);
  } catch (err: any) {
    console.error("Vercel Serverless Function Invocation Error:", err);
    return res.status(500).json({
      error: "Serverless Function Invocation Error",
      message: err?.message || String(err),
      stack: process.env.NODE_ENV === "development" ? err?.stack : undefined
    });
  }
}
