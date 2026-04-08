const OpenAI = require("openai");

const CLASSIFY_SYSTEM_PROMPT = `You are a football query classifier. Given a user's question, extract:
- intent: one of "standings", "top_scorers", "recent_results", "upcoming_fixtures", or "refuse" (for out-of-scope questions)
- competition: one of "EPL" (English Premier League) or "UCL" (UEFA Champions League), or null if unclear
- confidence: "high" or "low"
- clarification_prompt: a question to ask the user if confidence is low or competition is unclear, otherwise null
- refusal_code: only set if intent is "refuse", use "unsupported_scope"
- refusal_message: only set if intent is "refuse", explain what is out of scope

Respond with valid JSON only, no markdown.`;

const ANSWER_SYSTEM_PROMPT = `You are a football stats assistant. You will be given structured data and must produce a concise, natural-language answer. Always end your response with "Data as of {snapshotDate}." where {snapshotDate} is provided in the input.`;

function createOpenAiModelClient({ apiKey }) {
  const client = new OpenAI({ apiKey });

  async function classify({ input }) {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CLASSIFY_SYSTEM_PROMPT },
        { role: "user", content: input },
      ],
      temperature: 0,
    });

    return JSON.parse(response.choices[0].message.content);
  }

  async function answer({ competition, intent, snapshotDate, data }) {
    const userContent = JSON.stringify({ competition, intent, snapshotDate, data });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: ANSWER_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      temperature: 0.3,
    });

    return response.choices[0].message.content;
  }

  return { classify, answer };
}

module.exports = { createOpenAiModelClient };
