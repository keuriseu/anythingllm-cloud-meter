// Loads a workspace's model so the next question starts warm.
//
//   node prewarm.mjs deal-room       (on stage, right after the Q3 answer)
//   node prewarm.mjs quick-answers   (last warm-up before going on stage)
//   add --no-wait to exit right away (used by preshow.cmd)
//
// Sends one tiny chat-mode message under a "warmup-" session id, so it never
// appears in the app's chat window. The console title shows progress, which
// is visible on the taskbar button even when the window is minimized.
import { pathToFileURL } from "node:url";
import { streamChat } from "./lib.mjs";

export async function prewarm(slug) {
  const r = await streamChat(slug, "Reply with the single word: ready", { sessionId: `warmup-${slug}-${Date.now()}`, mode: "chat" });
  if (r.error || !r.text) throw new Error(`warm-up failed: ${r.error || "empty reply"}`);
  return r;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const slug = process.argv[2] || "deal-room";
  process.title = `${slug}: warming up...`;
  console.log(`Warming up ${slug}...`);
  try {
    const r = await prewarm(slug);
    process.title = `${slug}: READY`;
    console.log(`READY in ${(r.total / 1000).toFixed(1)} s`);
  } catch (e) {
    process.title = `${slug}: FAILED`;
    console.log(`FAILED: ${e.message}`);
    process.exitCode = 1;
  }
  // Keep the READY title visible briefly on the taskbar (skipped with --no-wait).
  if (!process.argv.includes("--no-wait")) await new Promise((res) => setTimeout(res, 8000));
}
