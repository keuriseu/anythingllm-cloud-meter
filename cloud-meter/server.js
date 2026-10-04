#!/usr/bin/env node
// Local helper for the AI cost meter. Zero dependencies, Node 18+.
// Serves the meter page, keeps today's usage events, and (optionally)
// pulls real usage from AnythingLLM through adapters/anythingllm.js.
// Binds to 127.0.0.1 only, so it keeps working in airplane mode.

"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, "config.json"), "utf8")); }
  catch (e) { console.error("config.json could not be read:", e.message); return {}; }
}
const config = loadConfig();
const PORT = Number(process.env.PORT || (config.server && config.server.port) || 7777);
const HOST = "127.0.0.1";

// ---------- Event store (one JSONL file per day) ----------
const KINDS = new Set(["embed", "chat", "agent", "transcribe"]);
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
let day = today();
let events = [];
let ids = new Set();
const logPath = () => path.join(DATA_DIR, `events-${day}.jsonl`);

function loadDay() {
  events = []; ids = new Set();
  let text = "";
  try { text = fs.readFileSync(logPath(), "utf8"); } catch { return; }
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try { const e = JSON.parse(line); if (!ids.has(e.id)) { ids.add(e.id); events.push(e); } } catch { /* skip bad line */ }
  }
}
loadDay();

function rollDay() {
  if (today() !== day) { day = today(); loadDay(); return true; }
  return false;
}

function sanitize(e) {
  if (!e || typeof e !== "object" || !KINDS.has(e.kind)) return null;
  const num = (v) => (Number.isFinite(+v) && +v >= 0 ? +v : 0);
  const out = {
    id: String(e.id || `ev-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`).slice(0, 200),
    ts: num(e.ts) || Date.now(),
    kind: e.kind,
    label: String(e.label || "").slice(0, 160),
    inputTokens: num(e.inputTokens),
    outputTokens: num(e.outputTokens),
    embedTokens: num(e.embedTokens),
    audioMinutes: num(e.audioMinutes),
    estimated: !!e.estimated,
    source: String(e.source || "manual").slice(0, 20)
  };
  // Model Router: where the reply ran. Events without a route count as local.
  if (e.route === "cloud") out.route = "cloud";
  if (e.model) out.model = String(e.model).slice(0, 80);
  if (e.provider) out.provider = String(e.provider).slice(0, 40);
  if (num(e.pages)) out.pages = num(e.pages);
  if (num(e.steps)) out.steps = num(e.steps);
  return out;
}

function addEvents(list) {
  rollDay();
  let added = 0;
  for (const raw of Array.isArray(list) ? list : [list]) {
    const e = sanitize(raw);
    if (!e || ids.has(e.id)) continue;
    ids.add(e.id); events.push(e);
    fs.appendFileSync(logPath(), JSON.stringify(e) + "\n");
    added++;
  }
  return added;
}

// ---------- Adapter ----------
let adapterStatus = { ok: true, msg: "manual events only" };
const setStatus = (s) => { adapterStatus = s; };
if (config.live && config.live.enabled) {
  try {
    require("./adapters/anythingllm.js").start({ config: { ...config.live, tiers: config.tiers, cloudModels: config.cloudModels }, addEvents, setStatus, log: console });
  } catch (e) {
    setStatus({ ok: false, msg: "adapter failed to start" });
    console.error("Adapter failed to start:", e);
  }
}

// ---------- HTTP ----------
const STATIC = { "/": "index.html", "/index.html": "index.html", "/config.json": "config.json", "/show": "show.html", "/show.html": "show.html" };
const TYPES = { ".html": "text/html; charset=utf-8", ".json": "application/json; charset=utf-8" };

function send(res, code, body, type = "application/json; charset=utf-8") {
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://${HOST}:${PORT}`);

  if (req.method === "GET" && STATIC[u.pathname]) {
    const file = path.join(ROOT, STATIC[u.pathname]);
    fs.readFile(file, (err, buf) => err ? send(res, 404, { error: "not found" }) : send(res, 200, buf, TYPES[path.extname(file)]));
    return;
  }

  if (req.method === "GET" && u.pathname === "/api/events") {
    const rolled = rollDay();
    let since = Number(u.searchParams.get("since") || 0);
    let reset = rolled;
    if (!Number.isFinite(since) || since < 0 || since > events.length) { since = 0; reset = true; }
    send(res, 200, { day, reset, cursor: events.length, events: events.slice(since), adapter: adapterStatus });
    return;
  }

  if (req.method === "POST" && u.pathname === "/api/events") {
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on("end", () => {
      try {
        const j = JSON.parse(body || "{}");
        const added = addEvents(j.events || j);
        send(res, 200, { added, cursor: events.length });
      } catch { send(res, 400, { error: "invalid JSON" }); }
    });
    return;
  }

  if (req.method === "GET" && u.pathname === "/api/health") {
    send(res, 200, { ok: true, day, events: events.length, adapter: adapterStatus });
    return;
  }

  send(res, 404, { error: "not found" });
});

server.listen(PORT, HOST, () => {
  console.log(`AI cost meter running at http://localhost:${PORT}`);
  console.log(`Mode in config.json: ${config.mode || "sim"} | AnythingLLM adapter: ${config.live && config.live.enabled ? "on" : "off"}`);
});
