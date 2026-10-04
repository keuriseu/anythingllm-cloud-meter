// Sets up the two demo workspaces. Safe to re-run: creates missing workspaces,
// uploads only missing files,
// embeds only missing documents, and puts Deal Room back to its pre-show state
// (RFP not embedded, policy and spec pinned).
//
//   node setup-workspaces.mjs           set up or repair both workspaces
//   node setup-workspaces.mjs --check   report only, change nothing
//
// Touches only the "quick-answers" and "deal-room" workspaces.
import fs from "node:fs";
import path from "node:path";
import { api, getWorkspace, libraryDocs, MODELS, FILES, UPLOAD_DIR } from "./lib.mjs";

const CHECK = process.argv.includes("--check");

const WORKSPACES = {
  "quick-answers": {
    name: "Quick Answers",
    settings: { chatProvider: "qnnengine", chatModel: MODELS.npu, openAiTemp: 0.2, topN: 4, openAiHistory: 0, chatMode: "query" },
    docs: Object.values(FILES),
    pinned: []
  },
  "deal-room": {
    name: "Deal Room",
    settings: { chatProvider: "qnnengine", chatModel: MODELS.gguf, openAiTemp: 0.2, topN: 4, openAiHistory: 0, chatMode: "query" },
    docs: Object.values(FILES).filter((f) => f !== FILES.rfp),
    pinned: [FILES.policy, FILES.spec]
  }
};

// Library title for an uploaded file is its original filename. Spreadsheets
// become one document per sheet, titled "<file> - Sheet:<name>".
const isFromFile = (title, file) => title === file || String(title).startsWith(`${file} - `);
const byTitle = (lib, file) => lib.filter((d) => isFromFile(d.title, file));
const fileOf = (title) => Object.values(FILES).find((f) => isFromFile(title, f));

async function ensureUploaded() {
  let lib = await libraryDocs();
  for (const file of Object.values(FILES)) {
    if (byTitle(lib, file).length) continue;
    if (CHECK) { console.log(`  missing from library: ${file}`); continue; }
    const fd = new FormData();
    fd.append("file", new Blob([fs.readFileSync(path.join(UPLOAD_DIR, file))]), file);
    const t0 = performance.now();
    const j = await api("POST", "/document/upload", fd);
    console.log(`  uploaded ${file} in ${((performance.now() - t0) / 1000).toFixed(1)} s (${j.documents?.[0]?.token_count_estimate ?? "?"} tokens)`);
  }
  lib = await libraryDocs();
  return lib;
}

async function ensureWorkspace(slug, spec, lib) {
  console.log(`\n${slug}`);
  let ws = await getWorkspace(slug);
  if (!ws && CHECK) { console.log("  missing (run without --check to create it)"); return false; }
  if (!ws) {
    const j = await api("POST", "/workspace/new", { name: spec.name });
    if (j.workspace?.slug !== slug) throw new Error(`created workspace "${spec.name}" got slug ${j.workspace?.slug}, expected ${slug}`);
    console.log(`  created workspace "${spec.name}"`);
    ws = await getWorkspace(slug);
  }

  const drift = Object.entries(spec.settings).filter(([k, v]) => ws[k] !== v);
  if (drift.length && !CHECK) {
    await api("POST", `/workspace/${slug}/update`, spec.settings);
    console.log(`  settings updated: ${drift.map(([k]) => k).join(", ")}`);
  } else if (drift.length) console.log(`  settings differ: ${drift.map(([k, v]) => `${k}=${ws[k]} (want ${v})`).join(", ")}`);

  const embedded = (ws.documents || []).map((d) => ({ docpath: d.docpath, pinned: !!d.pinned, title: JSON.parse(d.metadata || "{}").title }));
  const want = spec.docs.flatMap((f) => byTitle(lib, f));
  const adds = want.filter((d) => !embedded.some((e) => e.docpath === d.docpath)).map((d) => d.docpath);
  const deletes = embedded.filter((e) => !want.some((d) => d.docpath === e.docpath)).map((e) => e.docpath);
  if ((adds.length || deletes.length) && !CHECK) {
    const t0 = performance.now();
    await api("POST", `/workspace/${slug}/update-embeddings`, { adds, deletes });
    console.log(`  embedded ${adds.length}, removed ${deletes.length} in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
  } else if (adds.length || deletes.length) console.log(`  would embed ${adds.length}, remove ${deletes.length}`);

  ws = await getWorkspace(slug);
  for (const d of ws.documents || []) {
    const title = JSON.parse(d.metadata || "{}").title;
    const wantPin = spec.pinned.includes(fileOf(title));
    if (!!d.pinned !== wantPin && !CHECK) await api("POST", `/workspace/${slug}/update-pin`, { docPath: d.docpath, pinStatus: wantPin });
  }

  ws = await getWorkspace(slug);
  const s = spec.settings;
  console.log(`  model ${ws.chatModel} | temp ${ws.openAiTemp} | snippets ${ws.topN} | history ${ws.openAiHistory} | mode ${ws.chatMode}`);
  for (const d of ws.documents || []) console.log(`  ${d.pinned ? "[pinned] " : "         "}${JSON.parse(d.metadata || "{}").title}`);
  const ok = Object.entries(s).every(([k, v]) => ws[k] === v)
    && (ws.documents || []).length === want.length
    && spec.docs.every((f) => (ws.documents || []).some((d) => fileOf(JSON.parse(d.metadata || "{}").title) === f))
    && (ws.documents || []).every((d) => !!d.pinned === spec.pinned.includes(fileOf(JSON.parse(d.metadata || "{}").title)));
  console.log(`  ${ok ? "OK" : "NOT AS PLANNED"}`);
  return ok;
}

const lib = await ensureUploaded();
let allOk = true;
for (const [slug, spec] of Object.entries(WORKSPACES)) allOk = (await ensureWorkspace(slug, spec, lib)) && allOk;
console.log(allOk ? "\nBoth workspaces match the plan." : "\nSomething does not match the plan. See above.");
process.exitCode = allOk ? 0 : 1;
