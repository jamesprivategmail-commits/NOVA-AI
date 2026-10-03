import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../src/server/createApp.js";

const app = createApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const xForwardedUri = req.headers["x-forwarded-uri"] as string;
  const xMatchedPath = req.headers["x-matched-path"] as string;
  const orig = xForwardedUri || xMatchedPath;
  if (orig && (orig.startsWith("/api") || orig.startsWith("/v1") || orig.startsWith("/auth") || orig.startsWith("/chat"))) {
    req.url = orig;
  }
  return app(req, res);
}
