// Shared helpers for the demo scripts. Talks only to AnythingLLM on localhost.
// The API key is read from the ANYTHINGLLM_API_KEY environment variable
// (process first, then the Windows user environment). It is never written anywhere.
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const BASE = process.env.ANYTHINGLLM_BASE_URL || "http://127.0.0.1:3001/api/v1";
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_DIR = path.resolve(HERE, "..", "documents");
// AnythingLLM's own app endpoints (no /v1). In single-user mode they need no key.
export const INTERNAL = BASE.replace(/\/v1$/, "");

export const MODELS = {
  npu: "qualcomm/Qwen3-4B-Instruct-2507",
  gguf: "unsloth/Qwen3-4B-Instruct-2507-GGUF:Q4_0"
};

export const FILES = {
  rfp: "MBWD_RFP_2026-14_Field_Inspection_Platform.pdf",
  policy: "MBWD_ISP-07_Vendor_Security_Policy.pdf",
  spec: "Corvane_Inspect_6.2_Product_Specification.docx",
  pricing: "Corvane_MBWD_Pricing_Model_FY27.xlsx",
  interviews: "Corvane_Customer_Interviews_Q3_2026.pptx",
  transcript: "Deal_Review_Meeting_Transcript_2026-10-02.txt"
};

// On Windows the saved user variable wins, because terminals opened before it
// was last set still carry the old value in their own environment.
function readKey() {
  if (process.platform === "win32") {
    try {
      const k = execSync(`powershell -NoProfile -c "[Environment]::GetEnvironmentVariable('ANYTHINGLLM_API_KEY','User')"`).toString().trim();
      if (k) return k;
    } catch { /* fall through */ }
  }
  if (process.env.ANYTHINGLLM_API_KEY) return process.env.ANYTHINGLLM_API_KEY;
  console.error("ANYTHINGLLM_API_KEY is not set. Run setup.cmd in the repo folder, or set it as a user environment variable.");
  process.exit(1);
}
export const KEY = readKey();

export async function api(method, p, body) {
  const opts = { method, headers: { Authorization: `Bearer ${KEY}`, Accept: "application/json" } };
  if (body instanceof FormData) opts.body = body;
  else if (body !== undefined) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
  const r = await fetch(BASE + p, opts);
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${p} -> HTTP ${r.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

export async function getWorkspace(slug) {
  const j = await api("GET", `/workspace/${slug}`);
  return Array.isArray(j.workspace) ? j.workspace[0] : j.workspace;
}

// Library documents, flattened: [{ docpath: "folder/file.json", title, tokens }]
export async function libraryDocs() {
  const j = await api("GET", "/documents");
  const out = [];
  for (const folder of j.localFiles?.items || []) {
    for (const d of folder.items || []) out.push({ docpath: `${folder.name}/${d.name}`, title: d.title, tokens: d.token_count_estimate });
  }
  return out;
}

// Streams one chat. Returns timings in ms, the text, and the final metrics.
// Always reads the stream to the end: aborting makes AnythingLLM restart GenieX.
export async function streamChat(slug, message, { sessionId, mode } = {}) {
  const t0 = performance.now();
  let ttft = null, text = "", metrics = null, error = null, sources = [];
  const r = await fetch(`${BASE}/workspace/${slug}/stream-chat`, {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ message, sessionId, ...(mode ? { mode } : {}) })
  });
  if (!r.ok) throw new Error(`stream-chat ${slug} -> HTTP ${r.status}`);
  const dec = new TextDecoder();
  let buf = "";
  const handle = (line) => {
    line = line.replace(/^data: ?/, "").trim();
    if (!line) return;
    let j; try { j = JSON.parse(line); } catch { return; }
    if (j.error) error = String(j.error);
    if (j.textResponse) { if (ttft === null) ttft = performance.now() - t0; text += j.textResponse; }
    if (j.sources?.length) sources = j.sources;
    if (j.metrics && Object.keys(j.metrics).length) metrics = j.metrics;
  };
  for await (const chunk of r.body) {
    buf += dec.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) { handle(buf.slice(0, i)); buf = buf.slice(i + 2); }
  }
  handle(buf);
  return { ttft, total: performance.now() - t0, text, metrics, error, sources };
}

// Calls AnythingLLM's own app endpoints (the ones its settings pages use).
export async function internal(method, p, body) {
  const opts = { method, headers: { Accept: "application/json" } };
  if (body !== undefined) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
  const r = await fetch(INTERNAL + p, opts);
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${p} -> HTTP ${r.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}
