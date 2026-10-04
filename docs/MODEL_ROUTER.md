# Model Router Encore

AnythingLLM's Model Router (desktop v1.13.0 and later; tested on 1.17.0) sends each message to a local or cloud model based on rules you define. The first matching rule wins, and a badge above each reply shows which model and rule handled it. Stage lines are in [STAGE_SCRIPT.md](STAGE_SCRIPT.md); test results are in [DEMO_PLAN.md](DEMO_PLAN.md), "Model Router findings".

## The scenario: local by default, cloud by exception

The **Bid Desk** workspace uses a router instead of a single model. Most messages stay on the local model. Anything marked confidential is locked to the device, whatever else it asks. Only one kind of task goes to the cloud: polishing long outward-facing text, like a cover letter. The cloud model is OpenAI GPT-6.1 Sol through OpenRouter, the same model the cost meter prices as its mid tier. The audience sees the badge on each reply switch between local and cloud, and the meter's "Actually paid" figure moves only on the cloud reply.

**One design choice matters:** routing decides which model gets the prompt, but retrieved document chunks and the previous exchange go with it. So Bid Desk holds only the District's own documents (the RFP and the ISP-07 policy), which are public procurement documents. The pricing, interviews and meeting transcript stay in Quick Answers and Deal Room, which never route to the cloud.

## Router rules

Rules run top to bottom and the first match wins, so the privacy lock sits at the top. All rules are calculated (keyword or attachment checks), which add no extra model call and behave the same every run.

| Priority | Rule name | Condition | Routes to |
| --- | --- | --- | --- |
| 1 | `keep_it_on_the_device` | Prompt contains any of: `confidential, internal, pricing, margin, discount, customer` | Local: GenieX `unsloth/Qwen3-4B-Instruct-2507-GGUF:Q4_0` |
| 2 | `polish_for_the_client` | Prompt contains any of: `cover letter, polish, rewrite, executive summary` | Cloud: OpenRouter `openai/gpt-6.1-sol` |
| 3 | `read_an_image` | An image is attached | Cloud: OpenRouter `openai/gpt-6.1-sol` |
| Fallback | | No rule matched | Local: GenieX `unsloth/Qwen3-4B-Instruct-2507-GGUF:Q4_0` |

GPT-6.1 Sol costs $2.00 in / $10.00 out per 1M tokens on OpenRouter, about a cent per cover letter. Both local routes use the GGUF model, which Deal Room leaves loaded, so the encore needs no model switch after the main demo. The free model `qwen/qwen3.8-27b:free` was tried first and dropped: it failed or was cut off in two of three replies and printed its reasoning into the answer.

## Setup

1. Create an OpenRouter API key at https://openrouter.ai/keys. The account needs credit.
2. In AnythingLLM: **Settings, AI Providers, LLM**, choose OpenRouter, paste the key, pick `openai/gpt-6.1-sol`, **Save**.
3. Run `node setup-encore.mjs` in `demo-kit\scripts` (or answer "y" at step 6 of `setup.cmd`). It:
    - creates or repairs Bid Desk Router and its three rules, using AnythingLLM's own `/api/model-routers` endpoints;
    - creates or repairs the Bid Desk workspace: router, query mode, temperature 0.2, chat history 1, only the RFP and ISP-07;
    - puts the default LLM provider back on GenieX and the OpenRouter timeout at 15000 ms. Saving the OpenRouter page in step 2 changes both.
4. Check with `node check-encore.mjs`. `preshow.cmd` runs this check and clears Bid Desk's chats.

Chat history is 1, not 0: in AnythingLLM 1.17.0, 0 behaves like the default of 20 earlier messages.

## Run of show (about 90 s)

| # | Prompt | Expected route |
| --- | --- | --- |
| R1 | According to the RFP, when exactly are written questions due and who should they be sent to? | Local (fallback) |
| R2 | Write a one-page cover letter from Corvane to Janet Okafor for our response to RFP 2026-14. Polish it for a public agency. | Cloud (rule 2) |
| R3 | Write a confidential cover letter note to our team on our pricing strategy. | Local (rule 1 beats rule 2) |
| R4 (optional) | Attach `demo-kit\encore\hydrant-inspection-form.png`: What does this form capture? | Cloud (rule 3) |

Ask in this order only, so the cloud request carries only R1's public exchange.

## Where it fits in the main demo

The cloud route needs the internet, and the main demo runs in airplane mode. Either run it as an encore after the offline close ("One more thing", then turn airplane mode off), or keep the stage demo fully offline and run the router scenario at a booth afterwards. Don't turn the network on mid-demo; it undercuts the "no cloud" line you just made.

## Sources

- [What is the Model Router?](https://docs.anythingllm.com/model-router/overview), AnythingLLM docs
- [Setting up a Model Router](https://docs.anythingllm.com/model-router/setup), AnythingLLM docs
- [AnythingLLM v1.13.0 changelog](https://docs.anythingllm.com/changelog/v1.13.0)
- [OpenRouter model list](https://openrouter.ai/models) (`openai/gpt-6.1-sol` at $2.00 in / $10.00 out per 1M tokens, checked 2026-10-03)
