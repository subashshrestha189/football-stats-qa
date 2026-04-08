function createClassifierService({ modelClient }) {
  async function classify({ input }) {
    const result = await modelClient.classify({ input });

    if (result.intent === "refuse") {
      return {
        type: "refuse",
        refusalCode: result.refusal_code,
        message: result.refusal_message,
      };
    }

    if (result.confidence === "low" || !result.competition || !result.intent) {
      return {
        type: "clarify",
        clarificationPrompt: result.clarification_prompt,
      };
    }

    return {
      type: "answer",
      intent: result.intent,
      competition: result.competition,
      clarificationPrompt: result.clarification_prompt ?? null,
    };
  }

  return {
    classify,
  };
}

module.exports = {
  createClassifierService,
};
