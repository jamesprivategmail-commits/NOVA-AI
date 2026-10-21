import { createApp } from "../src/server/createApp.js";

const app = createApp();

export default async function handler(req: any, res: any) {
  req.url = "/api/chat";

  if (Buffer.isBuffer(req.body)) {
    try {
      req.body = JSON.parse(req.body.toString("utf8"));
    } catch (_) {}
  } else if (typeof req.body === 'string' && req.body.trim().startsWith('{')) {
    try {
      req.body = JSON.parse(req.body);
    } catch (_) {}
  }

  if (req.body && typeof req.body === 'object') {
    (req as any)._body = true;
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
            res.write(`data: ${JSON.stringify({ text: `\n\n⚡ **VOID AI Notice:** Server connection issue (${err?.message || "Internal error"}). Please verify your API keys in the AI Admin Panel.` })}\n\n`);
            res.write("data: [DONE]\n\n");
            res.end();
          }
        }
        safeResolve();
      });
    } catch (err: any) {
      console.error("[Vercel api/chat fatal]:", err);
      if (!res.headersSent) {
        res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
        res.setHeader("Cache-Control", "no-cache, no-transform");
        res.write(`data: ${JSON.stringify({ text: `\n\n⚡ **VOID AI Notice:** Fatal server error (${err?.message || "Execution failed"}).` })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
      }
      safeResolve();
    }
  });
}

