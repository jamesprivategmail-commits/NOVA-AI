import { createApp } from "../src/server/createApp.js";

const app = createApp();

export default async function handler(req: any, res: any) {
  // 1. Check for query param from Vercel rewrite
  if (req.query && req.query.__route) {
    req.url = Array.isArray(req.query.__route) ? req.query.__route[0] : req.query.__route;
  } else {
    // 2. Check headers
    const orig =
      (req.headers["x-vercel-original-url"] as string) ||
      (req.headers["x-forwarded-uri"] as string) ||
      (req.headers["x-original-url"] as string) ||
      (req.headers["x-rewrite-url"] as string) ||
      (req.headers["x-matched-path"] as string);

    if (orig && (orig.startsWith("/api") || orig.startsWith("/v1") || orig.startsWith("/auth") || orig.startsWith("/chat"))) {
      req.url = orig;
    }
  }

  if (typeof req.body === 'string' && req.body.trim().startsWith('{')) {
    try {
      req.body = JSON.parse(req.body);
    } catch (_) {}
  }

  return new Promise((resolve) => {
    let resolved = false;
    const safeResolve = () => {
      if (!resolved) {
        resolved = true;
        resolve(undefined);
      }
    };

    res.on("finish", safeResolve);
    res.on("close", safeResolve);
    res.on("error", safeResolve);

    try {
      app(req, res, (err: any) => {
        if (err) {
          console.error("[Vercel api/index error]:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: err?.message || "Internal server error" });
          }
        }
        safeResolve();
      });
    } catch (err: any) {
      console.error("[Vercel api/index fatal]:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message || "Internal server error" });
      }
      safeResolve();
    }
  });
}

