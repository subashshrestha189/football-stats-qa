function createChatGuardrails() {
  const requestsByIp = new Map();

  function checkRequest({ ip, input, now }) {
    if (input.length > 300) {
      return {
        ok: false,
        statusCode: 400,
        code: "input_too_long",
        message: "Questions must be 300 characters or fewer.",
      };
    }

    const requestTime = now.getTime();
    const hourAgo = requestTime - 60 * 60 * 1000;
    const minuteAgo = requestTime - 60 * 1000;
    const previousRequests = requestsByIp.get(ip) ?? [];
    const recentRequests = previousRequests.filter((timestamp) => timestamp > hourAgo);
    const requestsLastMinute = recentRequests.filter((timestamp) => timestamp > minuteAgo);

    if (requestsLastMinute.length >= 10 || recentRequests.length >= 50) {
      requestsByIp.set(ip, recentRequests);

      return {
        ok: false,
        statusCode: 429,
        code: "rate_limited",
        message: "Please try again shortly.",
      };
    }

    recentRequests.push(requestTime);
    requestsByIp.set(ip, recentRequests);

    return {
      ok: true,
    };
  }

  return {
    checkRequest,
  };
}

module.exports = {
  createChatGuardrails,
};
