// Demo questions, expected facts and timing targets.
// Each fact passes if any of its patterns matches the answer.

export const TARGETS = {
  fast: { ttft: 2, total: 6 },
  deep: { ttft: 15, total: 60 },
  prewarm: 35 // seconds of stage talk available while Deal Room loads
};

const pct = (a, b) => new RegExp(`\\b${a}\\s*%?\\s*(to|-|\\u2013|and|through)\\s*${b}\\s*%`, "i");

export const QUESTIONS = [
  {
    // Original wording "When are written questions due, and who do we send them to?"
    // retrieved the meeting transcript and failed 0/5 (Phase 3).
    id: "Q1", lane: "fast", workspace: "quick-answers",
    text: "According to the RFP, when exactly are written questions due and who should they be sent to?",
    facts: {
      "October 9": [/October\s+9\b/i, /\bOct\.?\s*9\b/i],
      "5:00 PM": [/\b5(:00)?\s*(PM|p\.m\.)/i],
      "Pacific": [/Pacific|\bPT\b|\bPDT\b/i],
      "Janet Okafor": [/Okafor/i]
    }
  },
  {
    id: "Q2", lane: "fast", workspace: "quick-answers",
    text: "How many customers complained about battery life, and how much battery do we use per hour with location on?",
    facts: {
      "4 of 6": [/\b(4|four)\s*(of|out of)\s*(the\s*)?(6|six)\b/i, /\b(4|four)\s+(customers|of the six|of six)/i],
      "8% to 12%": [pct(8, 12)]
    }
  },
  {
    id: "Q3", lane: "fast", workspace: "quick-answers",
    text: "What is our total proposal price and how much room is left under the budget?",
    facts: {
      "$995,520": [/995,?520/],
      "$154,480": [/154,?480/]
    }
  },
  {
    id: "DEEP", lane: "deep", workspace: "deal-room",
    text: "List every conflict between Corvane Inspect and the District's security policy ISP-07 as a table: policy section, what the policy requires, what our product does. No other text.",
    facts: Object.fromEntries(["4.3", "5.2", "5.4", "6.1", "7.3", "9.2"].map((s) => [`Section ${s}`, [new RegExp(`(^|[^\\d.])${s.replace(".", "\\.")}([^\\d]|$)`)]]))
  },
  {
    id: "DEEPb", lane: "deep", workspace: "deal-room", variantOf: "DEEP",
    text: "List every conflict between Corvane Inspect and the District's security policy ISP-07 as a table: ISP-07 section number (from the policy, not from our product spec), what the policy requires, what our product does. No other text."
  }
];

// Order used by the show sequence in rehearse.mjs.
export const SHOW_ORDER = { fast: ["Q1", "Q2", "Q3"], deep: "DEEP" };

// Variants inherit the facts of the question they replace.
for (const q of QUESTIONS) if (q.variantOf) q.facts = QUESTIONS.find((p) => p.id === q.variantOf).facts;

export function checkFacts(q, answer) {
  const found = [], missing = [];
  for (const [name, patterns] of Object.entries(q.facts)) (patterns.some((p) => p.test(answer)) ? found : missing).push(name);
  return { found, missing };
}
