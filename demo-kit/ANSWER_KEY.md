# Demo Document Set: Answer Key and Prompt Script

**Do not upload this file to AnythingLLM.** Upload only the six files in `upload/`.

All companies, people and numbers are invented. Every document carries a small "fictional sample" footer.

## The scenario

Corvane Systems (a fictional field inspection software vendor) is responding to an RFP from the Marlow Basin Water District (a fictional water utility). The documents are a realistic deal room. The gaps and conflicts between them are deliberate, so every demo question has a definite, checkable answer.

| File | Type | Size | What it holds |
|---|---|---|---|
| `MBWD_RFP_2026-14_Field_Inspection_Platform.pdf` | PDF | 7 pages | Customer RFP: 26 requirements (21 mandatory), budget, schedule, evaluation rules |
| `MBWD_ISP-07_Vendor_Security_Policy.pdf` | PDF | 4 pages | Customer security policy that the RFP makes part of the contract |
| `Corvane_Inspect_6.2_Product_Specification.docx` | Word | 7 pages | Your product's real capabilities, limits and roadmap |
| `Corvane_MBWD_Pricing_Model_FY27.xlsx` | Excel | 4 tabs | Base price, gap closure costs, budget headroom, discount scenarios |
| `Corvane_Customer_Interviews_Q3_2026.pptx` | PowerPoint | 9 slides | Voice of customer: battery, offline, photos, Spanish UI |
| `Deal_Review_Meeting_Transcript_2026-10-02.txt` | Text | ~1,700 words | Internal deal review: decisions and action items (for the meeting beat) |

## Setup tips

- **Pre-embed five files, embed one live.** Embed everything except the RFP before the show, then drag the RFP in during Beat 2 so the audience sees the NPU working on a real 7-page document.
- **Retrieval settings.** Cross-document questions need several chunks at once. In the workspace settings, raise the number of context snippets (8 to 12 is a good start) and lower the similarity threshold if answers miss a document. A model with a 4K context will struggle here; use a GGUF model with 16K or more.
- **Rehearse every prompt below on the exact model.** Small local models vary. If one prompt is unreliable, use the narrower fallback listed under it.
- **Meeting beat.** The transcript can be read aloud by two presenters (about 10 minutes) for the meeting assistant, or uploaded as a document for the summary question.

---

## Beat 3: The cross-document question

### Prompt A (main)
> Which mandatory requirements in the Marlow Basin RFP does Corvane Inspect 6.2 not meet, and what would it cost to close those gaps? Are we still within the District's budget?

**Expected answer**

| Req. | Gap | Cost to close (3 years) |
|---|---|---|
| R-06 | Offline: product does 24 hours, RFP requires 72 hours | $85,000 |
| R-10 | English-only UI, RFP requires Spanish UI | $38,500 ($32,000 acceleration + $6,500 form translation) |
| R-14 | No SCIM 2.0, only just-in-time and CSV provisioning | $40,000 |
| R-17 | Vendor-managed keys only, RFP requires customer-managed keys | $174,000 ($120,000 one-time + $18,000 per year) |
| R-20 | Incident notice in 5 business days, RFP requires 72 hours | $0 (contract change, needs Legal approval) |

- Total gap closure: **$337,500**. Base proposal: **$658,020**. Total proposal: **$995,520**.
- District budget (not to exceed): **$1,150,000**. Headroom: **$154,480**. Yes, within budget.
- Good answers also note R-19 (7-year retention) is met only with the Archive add-on, which is already priced in.

Sources: RFP Sections 4 and 5; spec Sections 4, 7.2, 8.1, 8.6 and 10; pricing workbook, Gap Closure and Summary tabs.

**Fallbacks:** "List the mandatory RFP requirements that Corvane Inspect does not meet." then "What is the total cost on the Gap Closure tab, and how does the total proposal compare with the District's budget?"

---

## The "wow" question: what the team missed

This is the strongest moment in the demo. The deal team reviewed security in their meeting but caught only three of six policy conflicts. The model can find the rest by reading the policy against the spec.

### Prompt B
> Compare Corvane Inspect 6.2 against the District's security policy ISP-07. List every conflict and cite the policy section.

**Expected answer: six conflicts**

| # | ISP-07 section | Policy requires | Corvane Inspect 6.2 | Discussed in deal review? |
|---|---|---|---|---|
| 1 | 4.3 | Automated deprovisioning (SCIM or equivalent), access removed within 24 hours; CSV not acceptable | JIT and CSV only; device sessions stay valid up to 7 days | Yes |
| 2 | 5.2 | Customer-managed keys for Confidential data | Vendor-managed keys only | Yes |
| 3 | 6.1 | Incident notice within 72 hours, **24 hours if Confidential data** | 5 business days | Partly (team planned 72 hours only) |
| 4 | **5.4** | No third-party generative AI on District data without CISO approval; such features off by default | **AI Assist sends data to a third-party LLM and is on by default** | **No** |
| 5 | **7.3** | No access to production data by staff outside the US without CISO approval | **Tier 2 support engineers in Dublin, Ireland can access production tenants** | **No** |
| 6 | **9.2** | Purge cached device data after **14 days** without sync | **Fixed at 30 days** | **No** |

Sources: ISP-07 Sections 4.3, 5.2, 5.4, 6.1, 7.3 and 9.2; spec Sections 4, 7.2, 7.4, 8.1, 8.5 and 8.6, and Appendix A (subprocessors).

### Prompt C (follow-up)
> Which of these conflicts did the team miss in the October 2 deal review?

**Expected:** #4 AI Assist, #5 Dublin support access, #6 the 30-day cache purge, plus the 24-hour notice for Confidential data in #3.

### Prompt D (bonus insight)
> Will the District's data in our platform include anything classified as Confidential?

**Expected:** Very likely yes. RFP Appendix C and ISP-07 Section 3.2 classify the locations of treatment plants and pump stations as Confidential, and R-04 syncs GIS asset layers into the platform. Under ISP-07 Section 3.3, a dataset containing any Confidential element is treated as Confidential as a whole. So customer-managed keys (R-17) are probably required, the 24-hour incident notice applies, and Section 10.2 says no exception will be granted for either. This answers the clarifying question the team planned to ask in the meeting.

---

## Customer interview question

### Prompt E
> What did customers say about battery life, and how does it affect RFP requirement R-25?

**Expected**
- 4 of 6 customers raised it: Ridgeway, Lakeport, Sutter Bend and Pine Hollow.
- Tablets with background location on are typically empty by about 2:00 PM. Workarounds: power banks, turning off background location, spare tablets at lunch.
- Spec: 8% to 12% battery per hour with background location on. Low-power location mode (6.3, Q1 2027) targets 4% to 6%.
- R-25 (Desirable) asks for a full 10-hour shift with location on; 6.2 likely falls short. Low-power mode lands close to go-live.
- Bonus: the deck recommends briefing Ridgeway before using them as a reference, because they will raise battery life.

---

## Meeting beat

### Prompt F
> Summarize the October 2 deal review meeting and list the action items with owners and due dates.

**Expected decisions:** commit to all five mandatory gaps; price customer-managed keys while asking the District about scope; total price before discount $995,520 against a $1,150,000 budget; recommend an 8% subscription discount pending margin review.

**Expected action items**

| Owner | Action | Due |
|---|---|---|
| Marcus Oyelaran | Send clarifying questions to Janet Okafor (CMK scope, R-25 tablet model) | Oct 9 |
| Lena Ortiz | Draft 72-hour incident clause, get Legal review | Oct 7 |
| Priya Raman | Written confirmation of offline estimate and timeline; SCIM sign-off; ask whether CMK can run in parallel | Oct 8 |
| Tom Kessler | Confirm margin at 8% discount with VP Sales | Oct 9 |
| Dana Whitfield | Confirm references, brief Ridgeway, schedule exec sponsor call | Oct 10 |

Next review: Tuesday, October 13 at 10:00 AM.

---

## Agent beat

### Prompt G
> Draft an email from Marcus Oyelaran to Janet Okafor at the District with our clarifying questions on the RFP. Keep it under 200 words.

**A strong draft includes:** the October 9, 5:00 PM Pacific deadline; whether customer-managed keys (R-17) apply only to Confidential data and whether Confidential data will be stored in the platform; the tablet model for R-25. Bonus if it also asks how to request CISO approval for AI Assist (or offers to disable it) and an exception for Dublin-based support.

### Prompt H
> Build a compliance matrix table for all 26 RFP requirements with columns: ID, Mandatory or Desirable, Corvane response, notes.

**Expected:** 21 mandatory and 5 desirable. Mandatory gaps: R-06, R-10, R-14, R-17, R-20. R-19 met with the Archive add-on. Desirable partials: R-25 (battery) and R-26 (support hours are Monday to Friday, the RFP asks for Saturday too). R-24 met (16-week standard implementation against a 120-day limit, tight if CMK takes 16 weeks).

---

## Pricing follow-up

### Prompt I
> What happens to our total price and budget headroom with an 8% subscription discount, and who needs to approve it?

**Expected:** discount of $32,817.60 (8% of $410,220 in user subscriptions). Total **$962,702.40**, headroom **$187,297.60**. No extra approval needed: VP Sales approval applies only above 10%, and 15% is the maximum.

---

## Key numbers cheat sheet

| Item | Value |
|---|---|
| Field users / office users | 240 / 35 |
| Field / office subscription | $38 / $65 per user per month |
| Base proposal, 3 years | $658,020 |
| Gap closure, 3 years | $337,500 ($283,500 one-time + $18,000 per year) |
| Total proposal | $995,520 |
| Budget (not to exceed) | $1,150,000 |
| Headroom | $154,480 |
| Year 1 / Year 2 / Year 3 invoices | $616,040 / $189,740 / $189,740 |
| Key dates | Questions Oct 9, proposals Nov 6, award Jan 14, go-live within 120 days |
| Offline: product vs. required | 24 hours vs. 72 hours |
| Battery with background location | 8% to 12% per hour |
| NPS | 41 (up from 33) |
