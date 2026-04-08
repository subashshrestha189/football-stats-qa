const { NextResponse } = require("next/server");
const { createDebugHandler } = require("../../../src/lib/debug-handler.js");
const { getDebugHandler } = require("../../../src/lib/runtime-services.js");

async function GET(request) {
  try {
    const handler = getDebugHandler();
    const response = await handler.handle({
      headers: {
        "x-debug-key": request.headers.get("x-debug-key") ?? "",
      },
    });

    return NextResponse.json(response.body, { status: response.statusCode });
  } catch (_error) {
    return NextResponse.json(
      {
        error: "Debug data unavailable",
      },
      { status: 503 }
    );
  }
}

module.exports = {
  GET,
  createDebugHandler,
};
