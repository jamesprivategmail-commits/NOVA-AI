import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../src/server/createApp.js";

const app = createApp();

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return app(req, res);
}
