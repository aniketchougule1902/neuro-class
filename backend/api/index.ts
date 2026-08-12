let app: any;

export default async function handler(req: any, res: any) {
  try {
    if (!app) {
      // Dynamic import inside try-catch to guarantee we catch Vercel boot errors
      const serverModule = await import("../server.js").catch(() => import("../server"));
      const createExpressApp = serverModule.createExpressApp || (serverModule as any).default?.createExpressApp;
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
