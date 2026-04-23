const { createRuleBasedModelClient } = require("../src/lib/rule-based-model-client");
const cases = require("./cases.json");

const client = createRuleBasedModelClient();
const results = [];
let passed = 0;

for (const c of cases) {
  const actual = client.classify({ input: c.input });

  const intentOk = actual.intent === c.expected_intent;
  const competitionOk = actual.competition === c.expected_competition;
  const confidenceOk = actual.confidence === c.expected_confidence;
  const ok = intentOk && competitionOk && confidenceOk;

  if (ok) passed++;

  results.push({
    id: c.id,
    type: c.type,
    input: c.input,
    pass: ok,
    expected: {
      intent: c.expected_intent,
      competition: c.expected_competition,
      confidence: c.expected_confidence,
    },
    actual: {
      intent: actual.intent,
      competition: actual.competition,
      confidence: actual.confidence,
    },
  });
}

console.log("=== Classifier Evaluation ===\n");
for (const r of results) {
  const status = r.pass ? "PASS" : "FAIL";
  console.log(`[${status}] Case ${r.id} (${r.type}): "${r.input}"`);
  if (!r.pass) {
    console.log(`       expected: intent=${r.expected.intent} competition=${r.expected.competition} confidence=${r.expected.confidence}`);
    console.log(`       actual:   intent=${r.actual.intent} competition=${r.actual.competition} confidence=${r.actual.confidence}`);
  }
}

const total = cases.length;
const accuracy = ((passed / total) * 100).toFixed(0);
console.log(`\nRouting accuracy: ${passed}/${total} = ${accuracy}%`);
