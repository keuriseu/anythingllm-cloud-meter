// Rehearsal harness: times every demo question against its workspace and checks
// the answers for the expected facts.
//
//   node rehearse.mjs                 5 runs of every question, then the show sequence
//   node rehearse.mjs --runs 1        quick smoke test
//   node rehearse.mjs --only Q1,Q1a   selected questions only
//   node rehearse.mjs --no-show       skip the show sequence
//   node rehearse.mjs --no-rfp        leave the RFP out of Deal Room for the deep lane
//
// Before every timed run the workspace's model is warmed with a tiny chat-mode
// message, and every run uses its own session id, so no run sees another run's
// history (the workspaces also keep 0 history messages). Questions are grouped by
// lane so the NPU and GGUF models are not swapped between runs.
//
// As on stage, the RFP is embedded in Deal Room for the deep lane and the show
// sequence, then removed again at the end (pre-show state).
//
// The "show" sequence replays the run of show once per run: the fast questions
// in SHOW_ORDER back to back in Quick Answers, then the Deal Room pre-warm, then
// the deep question.
//
// Results: printed table plus results/rehearsal-<time>.csv and a .jsonl with
// full answers. Chats stay in AnythingLLM (hidden from the app's chat window)
// until reset-chats.mjs --yes is run.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import { streamChat, HERE, api, libraryDocs, FILES } from "./lib.mjs";
import { QUESTIONS, TARGETS, SHOW_ORDER, checkFacts } from "./questions.mjs";
import { prewarm } from "./prewarm.mjs";

const arg = (name, dflt) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : dflt; };
const RUNS = Number(arg("--runs", 5));
const ONLY = arg("--only", "") ? arg("--only").split(",") : null;
const SHOW = !process.argv.includes("--no-show") && !ONLY;
const WITH_RFP = !process.argv.includes("--no-rfp");
const STAMP = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);

const ps = (cmd) => { try { return execSync(`powershell -NoProfile -c "${cmd}"`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return ""; } };

function environment() {
  const battery = ps("(Get-CimInstance Win32_Battery | Select -First 1).BatteryStatus");
  const charge = ps("(Get-CimInstance Win32_Battery | Select -First 1).EstimatedChargeRemaining");
  const netUp = ps("@(Get-NetAdapter -Physical | Where-Object Status -eq 'Up').Count");
  return {
    power: battery === "1" ? "battery" : battery ? "AC" : "unknown",
    charge: charge ? `${charge}%` : "?",
    networkAdaptersUp: Number(netUp || 0)
  };
}

function geniexCpu() {
  const out = ps("$p=Get-Process geniex -EA SilentlyContinue | Select -First 1; if($p){'{0}|{1}' -f $p.Id,$p.TotalProcessorTime.TotalSeconds}");
  const [pid, cpu] = out.split("|");
  return { pid, cpu: Number(cpu) };
}

function systemCpuTimes() {
  let idle = 0, total = 0;
  for (const c of os.cpus()) { idle += c.times.idle; total += Object.values(c.times).reduce((a, b) => a + b, 0); }
  return { idle, total };
}

const rows = [];
const answersPath = path.join(HERE, "results", `rehearsal-${STAMP}.jsonl`);
fs.mkdirSync(path.dirname(answersPath), { recursive: true });

async function timedRun(q, run, lane = q.lane) {
  const g0 = geniexCpu(), c0 = systemCpuTimes();
  const sessionId = `rehearsal-${STAMP}-${q.id}-${lane}-${run}`;
  let r;
  try { r = await streamChat(q.workspace, q.text, { sessionId }); }
  catch (e) { r = { ttft: null, total: 0, text: "", metrics: null, error: e.message, sources: [] }; }
  const g1 = geniexCpu(), c1 = systemCpuTimes();
  const t = TARGETS[q.lane];
  const { found, missing } = checkFacts(q, r.text);
  const ttft = r.ttft === null ? null : r.ttft / 1000, total = r.total / 1000;
  const row = {
    time: new Date().toISOString(), lane, question: q.id, run, workspace: q.workspace,
    ttft_s: ttft === null ? "" : +ttft.toFixed(2), total_s: +total.toFixed(2),
    prompt_tokens: r.metrics?.prompt_tokens ?? "", output_tokens: r.metrics?.completion_tokens ?? "",
    output_tps: r.metrics?.outputTps ? +r.metrics.outputTps.toFixed(1) : "",
    sources: r.sources.length,
    facts_found: found.length, facts_total: found.length + missing.length, missing: missing.join("; "),
    facts_pass: missing.length === 0,
    ttft_pass: ttft !== null && ttft < t.ttft, total_pass: total < t.total,
    system_cpu_pct: +(100 * (1 - (c1.idle - c0.idle) / Math.max(1, c1.total - c0.total))).toFixed(0),
    geniex_cores: g0.pid && g0.pid === g1.pid ? +((g1.cpu - g0.cpu) / Math.max(0.01, total)).toFixed(2) : "",
    geniex_restarted: g0.pid !== g1.pid,
    error: r.error || ""
  };
  row.pass = row.facts_pass && row.ttft_pass && row.total_pass && !row.error;
  rows.push(row);
  fs.appendFileSync(answersPath, JSON.stringify({ ...row, sessionId, answer: r.text }) + "\n");
  const mark = (b) => (b ? "ok" : "FAIL");
  console.log(`  ${lane.padEnd(4)} ${q.id.padEnd(4)} run ${run}: first token ${row.ttft_s === "" ? "none" : row.ttft_s + " s"} (${mark(row.ttft_pass)}), total ${row.total_s} s (${mark(row.total_pass)}), facts ${row.facts_found}/${row.facts_total} (${mark(row.facts_pass)})${row.error ? `, ERROR ${row.error}` : ""}${missing.length ? `, missing ${row.missing}` : ""}`);
  return row;
}

async function warm(slug) {
  try { await prewarm(slug); } catch (e) { console.log(`  warm-up of ${slug} failed: ${e.message}`); }
}

// ---------- run ----------
const env = environment();
console.log(`Rehearsal ${STAMP} | power: ${env.power} (${env.charge}) | network adapters up: ${env.networkAdaptersUp}`);
if (env.power !== "battery") console.log("  NOTE: not on battery power.");
if (env.networkAdaptersUp > 0) console.log("  NOTE: a network adapter is up (airplane mode off?).");
const startedAt = new Date();

// The live embed on stage puts the RFP in Deal Room before the deep question.
const rfpDocs = WITH_RFP ? (await libraryDocs()).filter((d) => d.title === FILES.rfp).map((d) => d.docpath) : [];
let rfpEmbedded = false;
async function setRfp(on) {
  if (!rfpDocs.length || on === rfpEmbedded) return;
  await api("POST", "/workspace/deal-room/update-embeddings", on ? { adds: rfpDocs, deletes: [] } : { adds: [], deletes: rfpDocs });
  rfpEmbedded = on;
  console.log(on ? "  (RFP embedded in Deal Room, as after the live embed)" : "\nRFP removed from Deal Room again (pre-show state).");
}

const selected = QUESTIONS.filter((q) => !ONLY || ONLY.includes(q.id));
try {
for (const lane of ["fast", "deep"]) {
  const qs = selected.filter((q) => q.lane === lane);
  if (!qs.length) continue;
  if (lane === "deep") await setRfp(true);
  console.log(`\nLane: ${lane} (${qs[0].workspace})`);
  await warm(qs[0].workspace); // absorbs any model switch before timing starts
  for (let run = 1; run <= RUNS; run++) {
    for (const q of qs) { await warm(q.workspace); await timedRun(q, run); }
  }
}

if (SHOW) {
  console.log("\nShow sequence (run of show, back to back)");
  const byId = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
  for (let run = 1; run <= RUNS; run++) {
    await warm("quick-answers");
    for (const id of SHOW_ORDER.fast) await timedRun(byId[id], run, "show");
    const t0 = performance.now();
    let pwErr = "";
    try { await prewarm("deal-room"); } catch (e) { pwErr = e.message; }
    const pw = (performance.now() - t0) / 1000;
    console.log(`  show PREWARM run ${run}: Deal Room ready in ${pw.toFixed(1)} s${pwErr ? ` ERROR ${pwErr}` : ""}`);
    rows.push({ time: new Date().toISOString(), lane: "show", question: "PREWARM", run, workspace: "deal-room", total_s: +pw.toFixed(2), error: pwErr, pass: !pwErr && pw < TARGETS.prewarm });
    await setRfp(true);
    await timedRun(byId[SHOW_ORDER.deep], run, "show");
  }
}
} finally {
  await setRfp(false).catch((e) => console.log(`Could not remove the RFP from Deal Room: ${e.message}. Run setup-workspaces.mjs.`));
}

// ---------- display driver resets during the rehearsal ----------
// System event 4101 is logged when the display driver stops responding and recovers.
// (Windows Error Reporting "LiveKernelEvent" entries are not counted: Windows files
// older reports in batches, so they do not show when a problem happened.)
const since = startedAt.toISOString();
const driverResets = ps(`@(Get-WinEvent -FilterHashtable @{LogName='System'; Id=4101; StartTime=[datetime]'${since}'} -EA SilentlyContinue).Count`);

// ---------- summary ----------
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : NaN; };
const fmt = (v) => (Number.isFinite(v) ? v.toFixed(1) : "-");
console.log(`\nSummary (targets: fast first token < 2 s, total < 6 s; deep first token < 15 s, total < 60 s; pre-warm < ${TARGETS.prewarm} s)`);
const header = ["Lane", "Question", "Runs", "First token med/max", "Total med/max", "Out tok med", "Facts ok", "Timing ok", "Result"];
const table = [];
for (const key of [...new Set(rows.map((r) => `${r.lane}|${r.question}`))]) {
  const rs = rows.filter((r) => `${r.lane}|${r.question}` === key);
  const tt = rs.map((r) => r.ttft_s).filter((v) => v !== "" && v !== undefined);
  const tot = rs.map((r) => r.total_s);
  const isPrewarm = rs[0].question === "PREWARM";
  table.push([
    rs[0].lane, rs[0].question, String(rs.length),
    isPrewarm ? "-" : `${fmt(median(tt))} / ${fmt(Math.max(...tt))} s`,
    `${fmt(median(tot))} / ${fmt(Math.max(...tot))} s`,
    isPrewarm ? "-" : String(median(rs.map((r) => Number(r.output_tokens) || 0))),
    isPrewarm ? "-" : `${rs.filter((r) => r.facts_pass).length}/${rs.length}`,
    isPrewarm ? `${rs.filter((r) => r.pass).length}/${rs.length}` : `${rs.filter((r) => r.ttft_pass && r.total_pass).length}/${rs.length}`,
    rs.every((r) => r.pass) ? "PASS" : "FAIL"
  ]);
}
const widths = header.map((h, i) => Math.max(h.length, ...table.map((r) => r[i].length)));
const line = (cells) => "| " + cells.map((c, i) => c.padEnd(widths[i])).join(" | ") + " |";
console.log(line(header));
console.log("|" + widths.map((w) => "-".repeat(w + 2)).join("|") + "|");
for (const r of table) console.log(line(r));

const deepRows = rows.filter((r) => r.question === "DEEP" && r.geniex_cores !== "");
if (deepRows.length) console.log(`\nDeep lane load: GenieX used ${fmt(median(deepRows.map((r) => r.geniex_cores)))} CPU cores on average, whole system ${fmt(median(deepRows.map((r) => r.system_cpu_pct)))}% CPU (${os.cpus().length} cores).`);
if (rows.some((r) => r.geniex_restarted)) console.log(`GenieX restarted during ${rows.filter((r) => r.geniex_restarted).length} timed run(s).`);
console.log(`Display driver resets (System event 4101) during rehearsal: ${driverResets || "0"}`);

const cols = ["time", "lane", "question", "run", "workspace", "ttft_s", "total_s", "prompt_tokens", "output_tokens", "output_tps", "sources", "facts_found", "facts_total", "missing", "facts_pass", "ttft_pass", "total_pass", "pass", "system_cpu_pct", "geniex_cores", "geniex_restarted", "error"];
const csvCell = (v) => { const s = v === undefined ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const csvPath = path.join(HERE, "results", `rehearsal-${STAMP}.csv`);
fs.writeFileSync(csvPath, [`# power=${env.power} charge=${env.charge} network_adapters_up=${env.networkAdaptersUp}`, cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\n") + "\n");
console.log(`\nSaved ${path.relative(process.cwd(), csvPath)} and full answers in ${path.relative(process.cwd(), answersPath)}`);
