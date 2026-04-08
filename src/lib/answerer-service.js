function buildFallback({ competition, intent, snapshotDate, data }) {
  if (intent === "standings" && data[0]) {
    return `${data[0].team} lead the ${competition} table with ${data[0].points} points. Data as of ${snapshotDate}.`;
  }

  if (intent === "top_scorers" && data[0]) {
    return `${data[0].player} has ${data[0].goals} goals in ${competition} top scorers. Data as of ${snapshotDate}.`;
  }

  return `Data as of ${snapshotDate}.`;
}

function createAnswererService({ modelClient }) {
  async function answer(payload) {
    const fallbackText = buildFallback(payload);

    try {
      const modelText = await modelClient.answer(payload);

      if (!modelText.includes(`Data as of ${payload.snapshotDate}.`)) {
        return {
          answerText: fallbackText,
          fallbackUsed: true,
        };
      }

      return {
        answerText: modelText,
        fallbackUsed: false,
      };
    } catch (_error) {
      return {
        answerText: fallbackText,
        fallbackUsed: true,
      };
    }
  }

  return {
    answer,
  };
}

module.exports = {
  createAnswererService,
};
