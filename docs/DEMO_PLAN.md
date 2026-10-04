# AnythingLLM Demo Plan (Snapdragon X)

Goal: show on-device AI that is private, offline and has no per-token cost. About 4 minutes on stage. The audience must never wait long.

Source files: `demo-kit/documents/` (six files, all fictional). Never embed `demo-kit/ANSWER_KEY.md`.

Setup is automated: `setup.cmd` (once per PC) and `preshow.cmd` (right before the show). See the repo README. This plan records what those scripts set up and why.

## Workspaces

### Quick Answers (fast lane)
- Model: the NPU-only GenieX model (4K context)
- Context snippets: 3 to 4
- Chat history: 0 to 1
- Temperature: 0.2
- Chat mode: query
- No agent use
- Documents: all six files

### Deal Room (deep lane)
- Model: a GGUF model on GenieX with 16K context or more
- Temperature: 0.2
- Documents: all six files, except the RFP PDF, which is embedded live on stage
- Pinned: `MBWD_ISP-07_Vendor_Security_Policy.pdf` and `Corvane_Inspect_6.2_Product_Specification.docx`

## Run of show
1. Embed `MBWD_RFP_2026-14_Field_Inspection_Platform.pdf` live in Deal Room.
2. Three quick questions in Quick Answers.
3. One deep question in Deal Room while showing that the PC stays responsive.
4. Close on the cloud cost meter.
5. Optional encore, with the internet on: the Model Router in Bid Desk (see "Encore: Model Router" below).

## Model switching (measured in Phase 1)
GenieX holds one model ready at a time. Every switch between the two workspaces costs about 16 s (NPU to GGUF restarts the engine; GGUF to NPU reloads the NPU model). A warm model answers a short prompt in 0.2 to 0.3 s. A cold NPU load from engine start takes about 19 s.

Decision: pre-warm Deal Room in the background. Right after the Q3 answer appears, press the pre-warm hotkey (Ctrl+Alt+W, set up below) and talk for about 25 seconds while moving to the next beat. Ask the deep question only when the taskbar button reads "deal-room: READY". In the Phase 3 smoke test the pre-warm took 20.8 s.

`setup.cmd` creates the "Pre-warm Deal Room" desktop shortcut with the Ctrl+Alt+W hotkey, run minimized. Test it: press Ctrl+Alt+W. A minimized window appears on the taskbar and its title changes to "deal-room: READY", then it closes after about 8 seconds.

Rules on stage:
- Never click Stop on a reply. Aborting a stream makes AnythingLLM restart GenieX.
- Before going on stage, the last warm-up must be on Quick Answers, so the fast lane starts warm.

## Questions and expected answers

### Fast lane (Quick Answers)
| # | Question | Expected facts |
|---|---|---|
| Q1 | According to the RFP, when exactly are written questions due and who should they be sent to? | October 9, 5:00 PM Pacific; Janet Okafor |
| Q2 | How many customers complained about battery life, and how much battery do we use per hour with location on? | 4 of 6; 8% to 12% |
| Q3 | What is our total proposal price and how much room is left under the budget? | $995,520; $154,480 |

### Deep lane (Deal Room)
Question: "List every conflict between Corvane Inspect and the District's security policy ISP-07 as a table: policy section, what the policy requires, what our product does. No other text."

Expected: six conflicts at ISP-07 sections 4.3, 5.2, 5.4, 6.1, 7.3 and 9.2 (details in `ANSWER_KEY.md`, Prompt B).

## Timing targets
| Lane | First token | Total |
|---|---|---|
| Fast | under 2 s | under 6 s |
| Deep | under 15 s | under 60 s |

## Setup scripts (`demo-kit/scripts/`)
`setup.cmd` and `preshow.cmd` in the repo root run these for you. To run one by hand, open a terminal in `demo-kit\scripts`. All of them read the API key from the `ANYTHINGLLM_API_KEY` user environment variable, which `setup.cmd` saves.

| Command | What it does |
|---|---|
| `node setup-ai.mjs` | Downloads the two GenieX models if missing, sets the default provider to GenieX, checks the embedder is native. `--check` reports only. |
| `node setup-workspaces.mjs` | Creates or repairs both workspaces to this plan: settings, documents, pins. Removes the RFP from Deal Room if a rehearsal embedded it. `--check` reports only. |
| `node setup-encore.mjs` | Creates or repairs the Model Router encore: Bid Desk Router, its rules and the Bid Desk workspace. Needs an OpenRouter key saved in AnythingLLM first. |
| `node check-encore.mjs` | Checks the encore: default provider GenieX, OpenRouter timeout 15000, key saved, Bid Desk settings and documents, no Bid Desk chats left. Changes nothing. |
| `node reset-chats.mjs` | Lists chat history in Quick Answers, Deal Room and Bid Desk. Changes nothing. |
| `node reset-chats.mjs --yes` | Deletes all chat history in those three workspaces, including hidden API rehearsal chats. Never touches other workspaces. |
| `node prewarm.mjs deal-room` | Loads a workspace's model so the next question starts warm (the Ctrl+Alt+W shortcut runs this). |
| `node rehearse.mjs` | Timed rehearsal of every question (see Rehearsal below). |

Applied settings (Phase 2):

| Setting | Quick Answers | Deal Room |
|---|---|---|
| Model | `qualcomm/Qwen3-4B-Instruct-2507` (NPU, 4K) | `unsloth/Qwen3-4B-Instruct-2507-GGUF:Q4_0` (16K) |
| Temperature | 0.2 | 0.2 |
| Context snippets | 4 | 4, plus pinned files |
| Chat history | 0 | 0 |
| Chat mode | query | query |
| Documents | all 6 (the workbook appears as 4 sheet documents) | 5, no RFP; ISP-07 and spec pinned |

Chat history 0 does not turn history off in AnythingLLM 1.17.0; it behaves like the default of 20 earlier messages within a session (found 2026-10-03, see "Model Router findings"). Phase 3 passed with this behavior, so these two workspaces stay at 0.

## Rehearsal (Phase 3)
Run from `demo-kit\scripts`, on battery, in airplane mode:

```
node rehearse.mjs
```

It runs every question 5 times (warm-up before each timed run, own session per run), then replays the run of show 5 times, and prints a pass/fail table. For the deep lane it embeds the RFP in Deal Room, as on stage, and removes it again at the end. Results go to `rehearsal\results\` as CSV plus a JSONL file with full answers. It takes about 15 minutes. Options: `--runs 1` for a quick check, `--only Q1,DEEP` for selected questions, `--no-rfp` to leave the RFP out.

### Phase 3 findings (2026-10-03)
- Timing passes everywhere with room to spare. On battery: fast lane first token 0.4 to 0.9 s, total 1.2 to 4.7 s; deep lane first token about 5.2 s, total 35 to 50 s. GenieX uses about 3 of 18 CPU cores during the deep answer (whole system about 19% CPU), so the PC stays responsive.
- Q1: the original wording ("When are written questions due, and who do we send them to?") failed 0/5. The answer sentence is split across two RFP chunks and the question pulled in the meeting transcript ("October 8, Priya Raman"). The new wording above passed 5/5.
- Q2 and Q3 passed every run.
- Deal Room pre-warm takes 27 to 31 s on battery (21 s on AC). Recommended: right after the Q3 answer, press Ctrl+Alt+W and use the time for the cost meter ($0.00 so far), then ask the deep question once the taskbar shows READY. Close on the meter again.
- Deep question: the 4B model usually finds 5 of the 6 conflicts. It most often drops or mislabels ISP-07 5.4 (AI Assist), sometimes calling it 7.4, the spec's section number. Rewording (DEEPb in `questions.mjs`, section-by-section prompts) and temperature 0 did not fix it; temperature 0 did not make answers repeatable either. Present it as "it found the conflicts, including ones the team missed" rather than promising exactly six. Sections 7.3 (Dublin support access) and 9.2 (30-day cache purge), both missed by the team, appear in most runs.

## Embedder: keep "native" (CPU)
The NPU embedder (`qnn-native`) was tried on 2026-10-03 and crashed the AnythingLLM backend on the first embedding call on this X2 Elite (it is built for the first-generation X Elite NPU). Do not switch the embedder in Settings: changing it also deletes all vectors in every workspace. If it is ever changed by accident, restart AnythingLLM, set it back to native, then run `node setup-workspaces.mjs`.

## Live RFP embed (step 1 of the run of show)
The RFP is already in the document library, and its vectors are cached from Quick Answers.
1. Open Deal Room and click the upload icon next to the workspace name.
2. In the library list, tick `MBWD_RFP_2026-14_Field_Inspection_Platform.pdf`.
3. Click **Move to Workspace**, then **Save and Embed**.

## Encore: Model Router (optional, needs the internet)
Tested on 2026-10-03 (findings below). Set up with `node setup-encore.mjs` (or step 6 of `setup.cmd`); check with `node check-encore.mjs`. Stage lines: `docs/STAGE_SCRIPT.md`; background: `docs/MODEL_ROUTER.md`.

The only manual step: save an OpenRouter API key in AnythingLLM (Settings, AI Providers, LLM, OpenRouter). The account needs credit. `setup-encore.mjs` then puts the default provider back on GenieX and the timeout at 15000, which saving that page resets.

AnythingLLM's Model Router (desktop v1.13.0 and later; tested on 1.17.0) sends each message to a local or cloud model by rules. The first matching rule wins, and a badge above each reply shows the model and rule. The developer API cannot create routers, but the app's own endpoints (`/api/model-routers`) can, and `setup-encore.mjs` uses them.

Run it only after the offline close: say "One more thing", turn airplane mode off, open Bid Desk. Never turn the network on mid-demo. Both local routes use the GGUF model, which Deal Room leaves loaded, so the first Bid Desk prompt needs no model switch.

Workspace **Bid Desk**: provider `anythingllm-router` with "Bid Desk Router", query mode, temperature 0.2, 4 snippets, **chat history 1**. Documents: only the RFP and ISP-07, which are the District's own public documents. Routed prompts carry retrieved chunks and the previous exchange to the cloud, so our pricing, interviews and transcript must never be in this workspace.

Cloud model: OpenAI GPT-6.1 Sol through OpenRouter (`openai/gpt-6.1-sol`, paid: $2.00 in / $10.00 out per 1M tokens, about $0.006 to $0.012 per cover letter). It is the same model the meter prices as its mid tier. The OpenRouter key is saved in AnythingLLM; the settings page does not redisplay it.

AnythingLLM settings that matter (check with `GET /api/v1/system`; saving the OpenRouter settings page resets both):
- `LLMProvider` must be `qnnengine` (GenieX). Saving the OpenRouter page makes OpenRouter the default.
- `OpenRouterTimeout` must be `15000`. At the default 3000 a cloud reply can stop mid-sentence with no error.

Router rules (calculated rules only, cache cooldown 0):

| Priority | Condition | Routes to |
|---|---|---|
| 1 | Prompt contains `confidential, internal, pricing, margin, discount, customer` | Local, GenieX `unsloth/Qwen3-4B-Instruct-2507-GGUF:Q4_0` |
| 2 | Prompt contains `cover letter, polish, rewrite, executive summary` | Cloud, OpenRouter `openai/gpt-6.1-sol` |
| 3 | An image is attached | Cloud, OpenRouter `openai/gpt-6.1-sol` |
| Fallback | No rule matched | Local, GenieX `unsloth/Qwen3-4B-Instruct-2507-GGUF:Q4_0` |

Ask in this order only, so the cloud request carries only R1's public exchange:

| # | Prompt | Expected route |
|---|---|---|
| R1 | According to the RFP, when exactly are written questions due and who should they be sent to? | Local (fallback) |
| R2 | Write a one-page cover letter from Corvane to Janet Okafor for our response to RFP 2026-14. Polish it for a public agency. | Cloud, GPT-6.1 Sol (rule 2) |
| R3 | Write a confidential cover letter note to our team on our pricing strategy. | Local (rule 1 beats rule 2) |
| R4 | (optional, attach `demo-kit\encore\hydrant-inspection-form.png`) What does this form capture? | Cloud, GPT-6.1 Sol (rule 3) |

Cost meter: a reply that ran on GPT-6.1 Sol switches the right card to "Actually paid, with the model router" with the real spend, and tags the feed row "Cloud · GPT-6.1 Sol via OpenRouter" with the amount paid. Say: "That one reply went to the cloud. That's what it cost. Everything else ran here for nothing." Details in `cloud-meter\README.md`.

### Model Router findings (2026-10-03)
- Routing works. 9 of 9 runs of R1, R2, R3 routed as expected, and R1 sent right after R2 went back to local (no sticky route). AnythingLLM records the provider as `QnnEngineLLM` or `OpenRouterLLM` and the model as "Qwen3 4B Instruct 2507" (local; NPU and GGUF look the same) or `openai/gpt-6.1-sol`. No field records which rule matched.
- Timing with GPT-6.1 Sol: R2 total 7.1 to 16.0 s over 9 runs (first token 1.6 to 8.1 s); 1 of 9 was over the 15 s target. R1 total 3.6 to 4.8 s. R3 writes about 400 tokens locally and takes 15.6 to 21.3 s. The first local reply after a model switch takes about 15 s more.
- "Chat history 0" does not turn history off. In both Bid Desk and Quick Answers a codename given in one message was recalled in the next with history set to 0; AnythingLLM appears to treat 0 as its default (20). History 1 carries one previous exchange. Bid Desk is set to 1, and the R1, R2, R3 order keeps R3 out of the cloud request. Quick Answers and Deal Room are still at 0, which in practice means up to 20 earlier messages within a session; their Phase 3 results were measured that way.
- R1 in its first wording ("When are written questions due under the RFP, and who receives them?") answered "not mentioned" twice, like the old Q1. The Q1 wording above passed 3 of 3.
- The free model `qwen/qwen3.8-27b:free` was dropped: one reply in three finished, it printed its `<think>` reasoning into the answer (73% of the text), and it returned 429 "Provider returned error" from its only provider. GPT-6.1 Sol shows no reasoning text in the answer.
- One GPT-6.1 Sol reply in three stopped mid-sentence after 5.6 s with no error and was saved with 0 tokens, while the OpenRouter timeout was at 3000 ms (saving the OpenRouter page had reset it, and made OpenRouter the default). After setting it back to 15000 and the default back to GenieX through the API, 3 of 3 R2 replies were complete with token counts. A reply with no token counts appears on the meter marked "est.".
- R4 passed: the attached form image routed to GPT-6.1 Sol and was described field by field in 5.4 s (2,626 tokens in, 180 out). The test image is `demo-kit\encore\hydrant-inspection-form.png`.
- R2 says "from Corvane": without it the letter used [Company Name] placeholders. With it, 3 of 3 letters named Corvane throughout; only the signature block keeps placeholders ([Authorized Officer Name], [Title], [Email], [Phone]), since no document names the signer.
- Not tested: offline behavior of the cloud route (skipped by decision; never run the encore offline), timing on venue Wi-Fi.
- Before the show, Bid Desk must have no chats: with history 1, a leftover rehearsal chat would ride along with R2 to the cloud. `reset-chats.mjs --yes` (run by `preshow.cmd`) clears them, and `check-encore.mjs` checks.

## Pre-show reset (do this last, after all rehearsals)
Double-click `preshow.cmd` (or the "Demo Pre-show Reset" desktop shortcut). It does this, stopping at the first problem:
1. `setup-workspaces.mjs`: restores both workspaces to this plan and removes the RFP from Deal Room.
2. `reset-chats.mjs --yes`: clears chats in Quick Answers, Deal Room and Bid Desk.
3. `check-encore.mjs`: reports whether the encore is ready (a warning only; fine if you skip the encore).
4. Asks you to close Ollama, Spotify and other heavy apps (free memory is tight), unplug the charger and turn on airplane mode.
5. Warms up Deal Room, then Quick Answers, so the fast lane starts warm.
6. `reset-chats.mjs --yes` again to remove the warm-up chats. This does not unload the model.
7. Starts the cost meter. Check that its status reads "Live · AnythingLLM" (green), then press `R`.

Prices in `cloud-meter\config.json` were verified against OpenAI's official API pricing on 2026-10-03. If the show is later, check them again at `developers.openai.com/api/docs/pricing` before going offline. The encore's cloud model (`openai/gpt-6.1-sol` on OpenRouter) is priced the same as OpenAI's direct price, checked in OpenRouter's model list the same day.
