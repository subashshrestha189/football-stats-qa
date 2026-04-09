function createChatHandler({
  guardrails,
  classifier,
  retriever,
  answerer,
  sessions,
}) {
  async function handle({ sessionId, ip, input }) {
    try {
      const guardrailResult = guardrails.checkRequest({
        ip,
        input,
        now: new Date(),
      });

      if (!guardrailResult.ok) {
        return {
          status: "refuse",
          refusal_code: guardrailResult.code,
          answer_text: guardrailResult.message,
        };
      }

      const classification = await classifier.classify({ input });

      if (classification.type === "clarify") {
        sessions.setPendingClarification(sessionId, {
          originalInput: input,
        });

        return {
          status: "clarify",
          clarification_prompt: classification.clarificationPrompt,
        };
      }

      if (classification.type === "refuse") {
        sessions.clearAfterRefusal?.(sessionId);

        return {
          status: "refuse",
          refusal_code: classification.refusalCode,
          answer_text: classification.message,
        };
      }

      const retrieval = await retriever.retrieve({
        competition: classification.competition,
        intent: classification.intent,
      });

      if (retrieval.type !== "answer") {
        return {
          status: retrieval.type === "unavailable" ? "unavailable" : "refuse",
          refusal_code: retrieval.emptyReason,
          snapshot_date: retrieval.snapshotDate,
        };
      }

      const answer = await answerer.answer({
        competition: retrieval.competition,
        intent: retrieval.intent,
        snapshotDate: retrieval.snapshotDate,
        data: retrieval.data,
      });

      sessions.setLastResolvedCompetition?.(sessionId, {
        competition: retrieval.competition,
        intent: retrieval.intent,
      });

      return {
        status: "answered",
        answer_text: answer.answerText,
        competition: retrieval.competition,
        intent: retrieval.intent,
        snapshot_date: retrieval.snapshotDate,
        fallback_used: answer.fallbackUsed,
      };
    } catch (error) {
      console.error("chat-handler caught error:", error?.message, error?.stack);
      return {
        status: "unavailable",
        answer_text: "Please try again later.",
      };
    }
  }

  return {
    handle,
  };
}

module.exports = {
  createChatHandler,
};
