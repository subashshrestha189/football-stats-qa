function createEmptySession() {
  return {
    pendingClarification: null,
    lastResolvedCompetition: null,
  };
}

function createSessionStore() {
  const sessions = new Map();

  function ensureSession(sessionId) {
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, createEmptySession());
    }

    return sessions.get(sessionId);
  }

  function getSession(sessionId) {
    return ensureSession(sessionId);
  }

  function setPendingClarification(sessionId, clarification) {
    const session = ensureSession(sessionId);
    session.pendingClarification = clarification;
  }

  function resolveClarification(sessionId, competition) {
    const session = ensureSession(sessionId);
    const pending = session.pendingClarification;

    if (!pending) {
      return null;
    }

    session.pendingClarification = null;

    return {
      ...pending,
      competition,
    };
  }

  function setLastResolvedCompetition(sessionId, payload) {
    const session = ensureSession(sessionId);
    session.lastResolvedCompetition = {
      ...payload,
      reusable: true,
    };
  }

  function getReusableCompetition(sessionId, { intent }) {
    const session = ensureSession(sessionId);
    const last = session.lastResolvedCompetition;

    if (!last || !last.reusable || last.intent !== intent) {
      return null;
    }

    last.reusable = false;
    return last.competition;
  }

  function clearAfterRefusal(sessionId) {
    sessions.set(sessionId, createEmptySession());
  }

  return {
    getSession,
    setPendingClarification,
    resolveClarification,
    setLastResolvedCompetition,
    getReusableCompetition,
    clearAfterRefusal,
  };
}

module.exports = {
  createSessionStore,
};
