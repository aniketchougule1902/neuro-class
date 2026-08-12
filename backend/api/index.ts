let app: any;

export default async function handler(req: any, res: any) {
  try {
    if (!app) {
      const { createExpressApp } = await import("../server");
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
