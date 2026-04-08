const { randomUUID } = require("node:crypto");
const { NextResponse } = require("next/server");
const { createChatHandler } = require("../../../src/lib/chat-handler.js");
const { getChatHandler } = require("../../../src/lib/runtime-services.js");

function getClientIp(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "127.0.0.1"
  );
}

async function POST(request) {
  try {
    const body = await request.json();
    const handler = getChatHandler();
    const response = await handler.handle({
      sessionId: body.sessionId ?? randomUUID(),
      ip: getClientIp(request),
      input: body.input ?? "",
    });

    const statusCode = response.status === "unavailable" ? 503 : 200;
    return NextResponse.json(response, { status: statusCode });
  } catch (_error) {
    return NextResponse.json(
      {
        status: "unavailable",
        answer_text: "Please try again later.",
      },
      { status: 503 }
    );
  }
}

module.exports = {
  POST,
  createChatHandler,
};
