import { createApp } from "../src/server/createApp.js";

const app = createApp();

export default async function handler(req: any, res: any) {
  req.url = "/api/chat";

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
          console.error("[Vercel api/chat error]:", err);
          if (!res.headersSent) {
            res.status(500).json({ error: err?.message || "Internal server error" });
          }
        }
        safeResolve();
      });
    } catch (err: any) {
      console.error("[Vercel api/chat fatal]:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message || "Internal server error" });
      }
      safeResolve();
    }
  });
}

