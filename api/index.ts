import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../src/server/createApp.js";

const app = createApp();

export default function handler(req: any, res: any) {
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

  return new Promise((resolve) => {
    res.on("finish", resolve);
    res.on("close", resolve);
    app(req, res);
  });
}

