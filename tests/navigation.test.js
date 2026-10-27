import assert from "node:assert/strict";
import { test } from "node:test";
import {
  findRoute,
  buildSteps,
  formatDistance,
  formatArrival,
  projectOnSegment,
} from "../assets/routing.js";
import { translate, messages, detectLanguage, setLanguage, getLanguage } from "../assets/i18n.js";
import { getBuildingName, getBuildingDetails, searchBuildings } from "../assets/buildings.js";

for (const mode of ["pedestrian", "car", "truck", "forklift"]) {
  test(`${mode} uses the existing street graph and produces distance, ETA, and arrival guidance`, () => {
    const origin = { x: 292, y: 1664 },
      destination = { x: 2360, y: 740 };
    const route = findRoute(origin, destination, mode);
    assert.deepEqual(route.path[0], origin);
    assert.deepEqual(route.path.at(-1), destination);
    assert.ok(route.distance > 0);
    assert.ok(route.etaSeconds > 0);
    assert.equal(buildSteps(route.path).at(-1)?.turn, "arrive");
  });
}
test("route endpoints snap to street segments rather than cutting across buildings", () => {
  const route = findRoute({ x: 1000, y: 1400 }, { x: 2300, y: 950 }, "pedestrian");
  assert.deepEqual(route.path[0], { x: 1000, y: 1220 });
  assert.deepEqual(projectOnSegment({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 5 }).point, {
    x: 5,
    y: 0,
  });
});
test("language detection honors preference and instructions preserve Portuguese turns and formatting", () => {
  assert.equal(detectLanguage("en", ["pt-BR"]), "en");
  assert.equal(detectLanguage(null, ["pt-PT"]), "pt-BR");
  assert.equal(detectLanguage("invalid", ["en-US"]), "en");
  assert.deepEqual(
    buildSteps(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
      "pt-BR",
    ).map((step) => step.text),
    ["Siga em frente", "Vire à direita", "Você chegou ao seu destino"],
  );
  assert.equal(formatDistance(1250, "pt-BR"), "1,25 km");
  assert.match(formatArrival(0, "pt-BR"), /^\d{1,2}:\d{2}$/);
  for (const [en, pt] of Object.entries(messages)) {
    const placeholders = (value) =>
      [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
    assert.deepEqual(placeholders(en), placeholders(pt));
  }
  assert.equal(
    translate("{name} — Building {number}", { name: "João $&", number: 39 }, "pt-BR"),
    "João $& — Prédio 39",
  );
});
test("catalog fallback translation and search work in both languages", () => {
  const building = {
    number: "39",
    name_pt: "Fábrica de Motores",
    name_en: "Engine Factory",
    description: "Restaurante, ambulatório e escritórios",
    department: "Produção",
    hours: "24h",
  };
  assert.equal(getBuildingName(building, "en"), "Engine Factory");
  assert.equal(getBuildingDetails(building, "en").department, "Production");
  assert.equal(getBuildingDetails(building, "pt-BR").hours, "24 horas");
  for (const language of ["en", "pt-BR"]) {
    setLanguage(language);
    assert.equal(getLanguage(), language);
    for (const query of ["producao", "production", "fabrica", "engine"])
      assert.equal(searchBuildings([building], query)[0].number, "39");
  }
  assert.deepEqual(searchBuildings([building], ""), []);
  assert.deepEqual(searchBuildings([building], "unknown destination"), []);
});
