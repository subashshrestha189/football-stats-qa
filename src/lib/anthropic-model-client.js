const Anthropic = require("@anthropic-ai/sdk");

const CLASSIFY_SYSTEM_PROMPT = `You are a football query classifier. Given a user's question, extract:
- intent: one of "standings", "top_scorers", "recent_results", "upcoming_fixtures", or "refuse" (for out-of-scope questions)
- competition: one of "EPL" (English Premier League) or "UCL" (UEFA Champions League), or null if unclear
- confidence: "high" or "low"
- clarification_prompt: a question to ask the user if confidence is low or competition is unclear, otherwise null
- refusal_code: only set if intent is "refuse", use "unsupported_scope"
- refusal_message: only set if intent is "refuse", explain what is out of scope

Respond with valid JSON only, no markdown fences.`;

const ANSWER_SYSTEM_PROMPT = `You are a football stats assistant. You will be given structured data and must produce a concise, natural-language answer. Always end your response with "Data as of {snapshotDate}." where {snapshotDate} is the value from the input JSON.`;

function createAnthropicModelClient({ apiKey }) {
  const client = new Anthropic({ apiKey });

  async function classify({ input }) {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: CLASSIFY_SYSTEM_PROMPT,
      messages: [{ role: "user", content: input }],
    });

    return JSON.parse(message.content[0].text);
  }

  async function answer({ competition, intent, snapshotDate, data }) {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      system: ANSWER_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: JSON.stringify({ competition, intent, snapshotDate, data }),
        },
      ],
    });

    return message.content[0].text;
  }

  return { classify, answer };
}

module.exports = { createAnthropicModelClient };
