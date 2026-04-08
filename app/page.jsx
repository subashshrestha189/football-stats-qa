"use client";

import { useState } from "react";

const MAX_INPUT_LENGTH = 300;

function ResponseCard({ response }) {
  if (!response) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-600">
        Ask about standings, recent results, top scorers, or upcoming fixtures
        for EPL or the Champions League.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {response.assumption_used ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Assumption used for this answer. Check the competition label below to
          confirm it matches what you meant.
        </div>
      ) : null}

      {response.status === "answered" ? (
        <div className="rounded-3xl border border-emerald-200 bg-white p-6 shadow-sm">
          <p className="text-base leading-7 text-slate-900">
            {response.answer_text}
          </p>
          <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <p className="font-medium text-slate-800">Citation</p>
            <p>
              {response.competition ?? "Competition unavailable"} | Data as of{" "}
              {response.snapshot_date ?? "unknown"}
            </p>
          </div>
        </div>
      ) : null}

      {response.status === "clarify" ? (
        <div className="max-w-xl rounded-[1.75rem] border border-sky-200 bg-sky-50 px-5 py-4 text-sm font-medium text-sky-950">
          {response.clarification_prompt}
        </div>
      ) : null}

      {response.status === "refuse" ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-950">
          {response.answer_text}
        </div>
      ) : null}

      {response.status === "unavailable" ? (
        <div className="rounded-3xl border border-slate-300 bg-slate-100 px-5 py-4 text-sm leading-7 text-slate-700">
          {response.answer_text}
        </div>
      ) : null}
    </div>
  );
}

export default function HomePage() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const remainingCharacters = MAX_INPUT_LENGTH - input.length;

  async function handleSubmit(event) {
    event.preventDefault();

    if (!input.trim() || isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      const apiResponse = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: input.trim(),
        }),
      });

      const payload = await apiResponse.json();
      setResponse(payload);
    } catch (_error) {
      setResponse({
        status: "unavailable",
        answer_text: "Please try again later.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.18),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl flex-col gap-8 rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur md:p-10">
        <header className="space-y-4">
          <div className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Football Stats Q&amp;A
          </div>
          <div className="space-y-3">
            <h1 className="max-w-3xl font-serif text-4xl leading-tight text-slate-950 md:text-6xl">
              Ask grounded football questions without guessing.
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              Daily snapshot answers for the Premier League and Champions
              League. No live scores, no rumors, just cited results from the
              latest completed pipeline.
            </p>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <form
            className="flex flex-col gap-4 rounded-[1.75rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-lg"
            onSubmit={handleSubmit}
          >
            <label
              className="text-sm font-medium text-slate-200"
              htmlFor="question"
            >
              Your question
            </label>
            <textarea
              id="question"
              value={input}
              maxLength={MAX_INPUT_LENGTH}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Who is top of the EPL table?"
              className="min-h-40 rounded-[1.25rem] border border-white/10 bg-white/5 px-4 py-3 text-base leading-7 text-white outline-none transition placeholder:text-slate-400 focus:border-sky-300 focus:ring-2 focus:ring-sky-400/40"
            />
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-slate-400">
                {remainingCharacters} characters remaining
              </p>
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="rounded-full bg-sky-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-500 disabled:text-slate-200"
              >
                {isLoading ? "Asking..." : "Submit"}
              </button>
            </div>
          </form>

          <div className="flex flex-col gap-4 rounded-[1.75rem] border border-slate-200 bg-white/80 p-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Response
              </h2>
              {isLoading ? (
                <span className="inline-flex items-center gap-2 text-xs font-medium text-sky-700">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-sky-500" />
                  Waiting for /api/chat
                </span>
              ) : null}
            </div>
            <ResponseCard response={response} />
          </div>
        </section>
      </div>
    </main>
  );
}
