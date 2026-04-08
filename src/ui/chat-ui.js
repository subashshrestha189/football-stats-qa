function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderChatComposer() {
  return `
    <form class="chat-composer">
      <textarea maxlength="300" placeholder="Ask a football question"></textarea>
      <button type="submit">Send</button>
    </form>
  `;
}

function renderClarificationBubble(prompt) {
  return `<div class="clarification-bubble">${escapeHtml(prompt)}</div>`;
}

function renderCitationBlock({ competition, snapshot_date }) {
  return `<div class="citation-block">${escapeHtml(
    competition
  )} · Data as of ${escapeHtml(snapshot_date)}</div>`;
}

function renderAssumptionBanner({ competition }) {
  return `<div class="assumption-banner">Assumed competition: ${escapeHtml(
    competition
  )}</div>`;
}

function renderResponse(response) {
  if (response.status === "clarify") {
    return renderClarificationBubble(response.clarification_prompt);
  }

  if (response.status === "answered") {
    return `<div class="response answered">${escapeHtml(
      response.answer_text
    )}</div>`;
  }

  if (response.status === "refuse") {
    return `<div class="response refuse">${escapeHtml(
      response.answer_text
    )}</div>`;
  }

  return `<div class="response unavailable">${escapeHtml(
    response.answer_text
  )}</div>`;
}

module.exports = {
  renderChatComposer,
  renderResponse,
  renderCitationBlock,
  renderAssumptionBanner,
  renderClarificationBubble,
};
