// Deletes all chat history (including API session chats from rehearsals) in the
// demo workspaces only: Quick Answers, Deal Room and, if it exists, Bid Desk
// (the Model Router encore). Other workspaces are never touched.
//
//   node reset-chats.mjs         dry run: list what would be deleted
//   node reset-chats.mjs --yes   delete
//
// Uses the same internal endpoints as the app's Workspace Chats settings page.
// They need no API key while AnythingLLM runs in single-user mode.
const ROOT = (process.env.ANYTHINGLLM_BASE_URL || "http://127.0.0.1:3001/api/v1").replace(/\/v1$/, "");
const SLUGS = ["quick-answers", "deal-room", "bid-desk"];
const YES = process.argv.includes("--yes");

async function allChats() {
  const out = [];
  for (let offset = 0; ; offset++) {
    const r = await fetch(`${ROOT}/system/workspace-chats`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ offset, limit: 100 })
    });
    if (!r.ok) throw new Error(`listing chats -> HTTP ${r.status}`);
    const j = await r.json();
    out.push(...j.chats);
    if (!j.hasPages) return out;
  }
}

const chats = (await allChats()).filter((c) => SLUGS.includes(c.workspace?.slug));
for (const slug of SLUGS) {
  const ids = chats.filter((c) => c.workspace.slug === slug).map((c) => c.id);
  console.log(`${slug}: ${ids.length} chat(s)${ids.length ? ` (ids ${ids.join(", ")})` : ""}`);
  if (!YES || !ids.length) continue;
  const r = await fetch(`${ROOT}/workspace/${slug}/delete-chats`, {
    method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chatIds: ids })
  });
  console.log(`  ${r.ok ? "deleted" : `FAILED (HTTP ${r.status})`}`);
}
if (YES) {
  const left = (await allChats()).filter((c) => SLUGS.includes(c.workspace?.slug)).length;
  console.log(left ? `${left} chat(s) still present.` : "The demo workspaces have no chat history.");
  process.exitCode = left ? 1 : 0;
} else console.log("Dry run. Re-run with --yes to delete.");
