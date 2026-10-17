import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../src/server/createApp.js";

const app = createApp();

export default function handler(req: any, res: any) {
  const pathParam = req.query?.path;
  if (Array.isArray(pathParam)) {
    req.url = "/api/" + pathParam.join("/");
  } else if (typeof pathParam === "string") {
    req.url = "/api/" + pathParam;
  }

  return new Promise((resolve) => {
    res.on("finish", resolve);
    res.on("close", resolve);
    app(req, res);
  });
}

