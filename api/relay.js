/**
 * MasterHttpRelayVPN — Vercel serverless function backend
 *
 * Drop-in protocol-compatible replacement for assets/apps_script/Code.gs.
 * See ../../PROTOCOL.md for the spec.
 *
 * This file lives at /api/relay so the deployed URL is:
 *   https://<your-project>.vercel.app/api/relay
 *
 * SETUP:
 *   1. Create a Vercel project from this folder (see DEPLOY.md).
 *   2. Set AUTH_KEY as a project environment variable.
 *      Use the SAME value as your Apps Script AUTH_KEY.
 *   3. Deploy.
 */

const SKIP_HEADERS = new Set([
  "host", "connection", "content-length",
  "transfer-encoding", "proxy-connection", "proxy-authorization",
  "priority", "te",
]);

const DISGUISE_HTML = `<!DOCTYPE html>
<html><head><title>My App</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:40px auto">
<h1>Welcome</h1><p>This application is running normally.</p>
</body></html>`;

// Vercel Node runtime. Node 18+ has global fetch.
export default async function handler(req, res) {
  // CORS — allow browser-based test page (test-backend.html) from any origin.
  // Relay is gated by AUTH_KEY, so wildcard origins have no security impact.
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method === "GET") {
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.status(200).send(DISGUISE_HTML);
    return;
  }

  if (req.method !== "POST") {
    return sendJson(res, { e: "method not allowed" });
  }

  const body = await readJsonBody(req);
  if (body === null) {
    return sendJson(res, { e: "bad json" });
  }

  const authKey = process.env.AUTH_KEY;
  if (!authKey) {
    return sendJson(res, { e: "server misconfigured: AUTH_KEY not set" });
  }
  if (body.k !== authKey) {
    return sendJson(res, { e: "unauthorized" });
  }

  try {
    if (Array.isArray(body.q)) {
      return sendJson(res, await doBatch(body.q));
    }
    return sendJson(res, await doSingle(body));
  } catch (err) {
    return sendJson(res, { e: String(err) });
  }
}

async function doSingle(req) {
  if (!req.u || typeof req.u !== "string" || !/^https?:\/\//i.test(req.u)) {
    return { e: "bad url" };
  }
  return await performFetch(req);
}

async function doBatch(items) {
  const results = await Promise.all(items.map(async (item) => {
    if (!item || typeof item !== "object") return { e: "bad item" };
    if (!item.u || typeof item.u !== "string" || !/^https?:\/\//i.test(item.u)) {
      return { e: "bad url" };
    }
    try {
      return await performFetch(item);
    } catch (err) {
      return { e: String(err) };
    }
  }));
  return { q: results };
}

async function performFetch(req) {
  const outHeaders = new Headers();
  if (req.h && typeof req.h === "object") {
    for (const [k, v] of Object.entries(req.h)) {
      if (typeof v !== "string") continue;
      if (SKIP_HEADERS.has(k.toLowerCase())) continue;
      outHeaders.set(k, v);
    }
  }

  const init = {
    method: (req.m || "GET").toUpperCase(),
    headers: outHeaders,
    redirect: req.r === false ? "manual" : "follow",
  };

  if (req.b && typeof req.b === "string") {
    init.body = Buffer.from(req.b, "base64");
    if (req.ct && !outHeaders.has("content-type")) {
      outHeaders.set("content-type", req.ct);
    }
  }

  const resp = await fetch(req.u, init);

  const responseHeaders = {};
  resp.headers.forEach((v, k) => {
    responseHeaders[k] = v;
  });

  const bodyBuf = Buffer.from(await resp.arrayBuffer());
  return {
    s: resp.status,
    h: responseHeaders,
    b: bodyBuf.toString("base64"),
  };
}

// -------- helpers --------

function sendJson(res, obj) {
  res.setHeader("content-type", "application/json");
  res.status(200).send(JSON.stringify(obj));
}

async function readJsonBody(req) {
  // Vercel's default Node runtime auto-parses JSON into req.body when
  // Content-Type is application/json, but we parse defensively in case the
  // client forgot the header.
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === "object") return req.body;
    if (typeof req.body === "string") {
      try { return JSON.parse(req.body); } catch { return null; }
    }
  }
  // Fallback: stream the body ourselves.
  const chunks = [];
  try {
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf8");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
