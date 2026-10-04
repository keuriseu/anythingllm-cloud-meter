# AnythingLLM Demo Stage Script

The whole demo takes about 4 minutes, plus about 2 for the optional router encore. Background and test results: [DEMO_PLAN.md](DEMO_PLAN.md).

## Before you walk on

Double-click **Demo Pre-show Reset** on the desktop (`preshow.cmd`). It resets the workspaces and chats, asks you to close apps, unplug and go into airplane mode, warms up both models, opens the cost meter on the second screen and the **Run of Show** window on the right of your main screen. Present from Run of Show: every prompt below has a copy button there (or press its number, or Space for the next one), then Ctrl+V in AnythingLLM. Then check:

- [ ] Charger unplugged, airplane mode on
- [ ] Spotify, Ollama and other heavy apps closed
- [ ] AnythingLLM open on **Quick Answers**
- [ ] Cost meter on the second screen, status green "Live · AnythingLLM", reset with `R`
- [ ] Questions ready to paste (exact wording below)

**Encore only:** `preshow.cmd` reported "The encore is ready." Keep `demo-kit\encore\hydrant-inspection-form.png` easy to find if you'll do R4.

## Opening (about 20 s)

**Say:**

- "This laptop is unplugged and in airplane mode. No internet, no cloud."
- "Everything you'll see runs on the Snapdragon chip right here, with AnythingLLM."
- "Our scenario: a sales team answering a water district's RFP. Six real-looking files: the RFP, the security policy, our product spec, pricing, customer interviews and a meeting transcript."
- "Three things to watch: it's private, it works offline, and it costs nothing per question."

## Beat 1: Embed the RFP live (about 30 s)

**Do:**

1. Open **Deal Room**, click the upload icon next to the workspace name.
2. Tick `MBWD_RFP_2026-14_Field_Inspection_Platform.pdf`.
3. Click **Move to Workspace**, then **Save and Embed**.

**Say while it embeds:**

- "The RFP just landed. I'm adding it to our deal workspace."
- "It's being read and indexed on this PC. The document never leaves the device."
- Point at the meter: "On a cloud API, that embedding costs money. Here it's zero."

## Beat 2: Three fast questions (about 60 s)

Switch to **Quick Answers**. Each answer arrives in under 5 seconds. Paste the questions exactly as written.

**Say first:** "This is the fast lane. It runs on the NPU, the chip's AI engine."

| # | Paste this question | Listen for | Say after |
| --- | --- | --- | --- |
| Q1 | According to the RFP, when exactly are written questions due and who should they be sent to? | October 9, 5:00 PM Pacific; Janet Okafor | "Instant, and it read the RFP we added seconds ago." |
| Q2 | How many customers complained about battery life, and how much battery do we use per hour with location on? | 4 of 6; 8% to 12% | "That's two different files, interviews and spec, in one answer." |
| Q3 | What is our total proposal price and how much room is left under the budget? | $995,520; $154,480 | "Pricing data that would never go to a public cloud." |

## Beat 3: Pre-warm and cost meter (about 30 s)

**Do:** The moment the Q3 answer appears, press **Ctrl+Alt+W**. Then turn to the meter.

**Say while it warms up:**

- "Look at the second screen. That's what these questions would cost on a cloud AI API."
- "On this PC: $0.00. No per-token fees, no subscription meter running."
- "Now scale it up." Point at the **At team scale** panel: "For a 1,000-person team, that's about $100,000 a year on the cheapest cloud tier."

**Wait for:** the taskbar to read **deal-room: READY** (about 30 s on battery). Don't ask the deep question before that.

## Beat 4: The deep question (about 60 s)

**Do:** Switch to **Deal Room** and paste:

> List every conflict between Corvane Inspect and the District's security policy ISP-07 as a table: policy section, what the policy requires, what our product does. No other text.

The first words appear in about 5 s and the full answer takes 35 to 50 s.

**Say while it writes:**

- "This is the deep lane: a bigger 16K-context model comparing our spec against their security policy."
- Open the Start menu or drag a window around: "The PC is still responsive. The AI uses about 3 of 18 cores."
- "This is the work a sales engineer spends an afternoon on."

**When the table is done:**

- "It found the conflicts, including ones the team missed."
- Point to **7.3** (support access from Dublin) and **9.2** (30-day cache purge) if they appear. The team missed both.
- Don't promise an exact count. The model usually finds 5 of the 6.

## Close (about 20 s)

**Do:** Point at the cost meter one last time.

**Say:**

- "Every question today: private, offline, and $0.00."
- "The cloud meter kept running. This laptop didn't charge a cent."
- "That's on-device AI on Snapdragon. Thank you."

## Encore: Model Router (optional, about 2 min)

Only after the close, never mid-demo. It needs the internet. Tested on 2026-10-03: routing worked 9 of 9 times, and the cloud reply takes 7 to 16 s. Skip it if the venue Wi-Fi is shaky.

**Do:**

1. Say "One more thing", then turn airplane mode off. Wait for Wi-Fi to connect.
2. Open **Bid Desk** in AnythingLLM. Ask the three prompts in this order only: R1, R2, R3. That keeps the confidential note out of the cloud request.

**Say first:**

- "Some work is worth sending to a bigger model. Most isn't. What if the PC decided, one message at a time?"
- "This workspace has a router. Private stays here, routine stays free, and only polished client writing goes to the cloud."

| # | Paste this prompt | Badge should show | Say after |
| --- | --- | --- | --- |
| R1 | According to the RFP, when exactly are written questions due and who should they be sent to? | Local (Qwen3 4B) | "A routine lookup. It stayed on this PC and cost nothing." |
| R2 | Write a one-page cover letter from Corvane to Janet Okafor for our response to RFP 2026-14. Polish it for a public agency. | Cloud: GPT-6.1 Sol via OpenRouter | Point at the meter: "That one went to GPT-6.1 Sol in the cloud, the same model the meter has been pricing all along. That's what it actually cost." |
| R3 | Write a confidential cover letter note to our team on our pricing strategy. | Local (Qwen3 4B) | "It says cover letter, but it also says confidential. The lock rule wins, so it never left the PC." |

**Optional R4 (about 10 s), if time allows:** attach `demo-kit\encore\hydrant-inspection-form.png` and ask "What does this form capture?" The badge should show GPT-6.1 Sol. Say: "The local model reads text only. Images go to a model that can see them."

**Close the encore:** "You set the rules. Private stays local, routine stays free, and you pay the cloud only when it earns it."

**Don't say** the cloud reply is private. It goes to OpenRouter and OpenAI, which is why this workspace only holds the District's public documents. **Don't add follow-ups**: each message carries the previous one, so a follow-up after R3 would send the confidential note to the cloud.

**If R2 errors, hangs past 20 s, or stops mid-sentence:** "The cloud's having a moment. That's the point: everything else kept working offline." Move on to R3. Don't re-ask.

## If something goes wrong

**Never click Stop on a reply.** It restarts the AI engine and costs you about 20 s.

| Problem | What to do | What to say |
| --- | --- | --- |
| An answer is slow | Wait. Keep talking. | "It's thinking it through, all locally." |
| An answer misses a fact | Move on. Don't re-ask. | "Real model, real documents, no script." |
| Deal Room isn't READY yet | Keep talking about the meter for another 10 s | "While that loads, look at the team-scale number." |
| Meter pill turns amber | Ignore it. Use hotkey `2` to add a question by hand if needed. | Nothing. The totals are kept. |
