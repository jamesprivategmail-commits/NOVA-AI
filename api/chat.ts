import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../src/server/createApp.js";

const app = createApp();

export default function handler(req: any, res: any) {
  req.url = "/api/chat";
  return new Promise((resolve) => {
    res.on("finish", resolve);
    res.on("close", resolve);
    app(req, res);
  });
}

