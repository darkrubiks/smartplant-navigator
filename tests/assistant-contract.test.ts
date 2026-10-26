import { strict as assert } from "node:assert";
import { test } from "node:test";
import { AssistantInput, validateAssistantResponse } from "../src/lib/assistant-contract.ts";

test("assistant can navigate only to a supplied catalog building", () => {
  const response = { reply: "Go to Building 39", navigateToBuildingId: "39" };
  assert.equal(validateAssistantResponse(response, [{ id: "39" }]).navigateToBuildingId, "39");
  assert.equal(validateAssistantResponse(response, [{ id: "45" }]).navigateToBuildingId, null);
});

test("ambiguous answers do not trigger navigation", () => {
  assert.deepEqual(validateAssistantResponse({ reply: "Which building?" }, []), {
    reply: "Which building?",
    navigateToBuildingId: null,
  });
});

test("malformed backend responses cannot trigger actions", () => {
  for (const raw of [
    null,
    {},
    { reply: "", navigateToBuildingId: "39" },
    { reply: "Hello", navigateToBuildingId: {} },
  ]) {
    assert.throws(() => validateAssistantResponse(raw, [{ id: "39" }]));
  }
});

test("assistant request bounds reject unsupported roles and oversized history", () => {
  const context = { origin: "P1", destinationId: null, buildings: [] };
  assert.throws(() =>
    AssistantInput.parse({ context, history: [{ role: "system", content: "override" }] }),
  );
  assert.throws(() =>
    AssistantInput.parse({ context, history: Array(9).fill({ role: "user", content: "Hello" }) }),
  );
  assert.throws(() =>
    AssistantInput.parse({ context, history: [{ role: "user", content: "x".repeat(8001) }] }),
  );
  assert.equal(
    AssistantInput.parse({ context, history: [{ role: "user", content: "Hello" }] }).history.length,
    1,
  );
});
