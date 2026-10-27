import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { parseCSV, parseBuildings, fetchCatalog } from "../assets/csv.js";
import { searchBuildings, getBuildingName, getBuildingDescription } from "../assets/buildings.js";

const header = "id,number,name_pt,name_en,category,x,y,description_pt,description_en,keywords";
const row =
  'engine,45,Fábrica de Motores,Engine Factory,industrial,120,450,"Motores, câmbios",Engines and transmissions,motor|engine';
test("CSV preserves quoted commas, quotes, multiline descriptions, BOM, CRLF, and blank lines", () => {
  assert.deepEqual(parseCSV('\uFEFFid,description\r\na,"A, B; ""C""\r\nSecond line"\r\n\r\n'), [
    ["id", "description"],
    ["a", 'A, B; "C"\r\nSecond line'],
  ]);
  assert.deepEqual(parseCSV('id;description\na;"Hello; world"'), [
    ["id", "description"],
    ["a", "Hello; world"],
  ]);
});
test("catalog coordinates become numbers while building numbers remain text", () => {
  const building = parseBuildings(`${header}\n${row}`)[0];
  assert.equal(building.x, 120);
  assert.equal(building.y, 450);
  assert.equal(building.number, "45");
  assert.deepEqual(building.keywords, ["motor", "engine"]);
  assert.equal(getBuildingName(building, "en"), "Engine Factory");
  assert.equal(getBuildingDescription(building, "pt-BR"), "Motores, câmbios");
  for (const query of ["45", "fabrica", "engine", "cambios"])
    assert.equal(searchBuildings([building], query)[0].id, "engine");
});
test("invalid catalogs fail with row-specific feedback rather than silently hiding buildings", () => {
  for (const [source, message] of [
    ["", /empty/],
    [`${header}\n`, /at least one/],
    ["id,name\nx,Name", /Missing CSV column/],
    [`${header}\n${row}\n${row}`, /row 3: duplicate id/],
    [`${header}\n${row}\n${row.replace("engine,45", "another,45")}`, /duplicate building number/],
    [`${header}\n${row.replace("industrial", "unknown")}`, /unknown category/],
    [`${header}\n${row.replace(",120,450,", ",NaN,450,")}`, /x\/y/],
    [`${header}\n${row.replace(",120,450,", ",2699,450,")}`, /x\/y/],
    [`${header}\n${row.replace(",120,450,", ",120,-1,")}`, /x\/y/],
    [`${header}\n${row.replace(",120,450,", ",,450,")}`, /x is required/],
    [`${header}\n${row},extra`, /expected 10 cells/],
    [`${header}\n${row.replace('"Motores, câmbios"', "Motores, câmbios")}`, /expected 10 cells/],
    [header + ",id\n" + row + ",engine", /Duplicate CSV column/],
  ])
    assert.throws(() => parseBuildings(source), message);
  for (const value of ['id,name\na,"broken', 'id,name\na,"hello"oops', 'id,name\na,he"llo'])
    assert.throws(() => parseCSV(value), /quote|quoted/);
});
test("CSV edits immediately change fetched names, positions, descriptions, additions, and removals", async () => {
  const url = new URL("https://example.test/project/data/buildings.csv");
  let csv = `${header}\n${row}`;
  const fetcher = async (input, options) => {
    assert.equal(input, url);
    assert.equal(options.cache, "no-store");
    return new Response(csv);
  };
  assert.equal((await fetchCatalog(url, fetcher))[0].x, 120);
  csv = `${header}\n${row.replace("Engine Factory", "New name").replace(",120,450,", ",800,900,").replace("Engines and transmissions", "New description")}\n${row.replace("engine,45", "new,46")}`;
  const changed = await fetchCatalog(url, fetcher);
  assert.equal(changed.length, 2);
  assert.equal(changed[0].name_en, "New name");
  assert.equal(changed[0].x, 800);
  assert.equal(changed[0].description_en, "New description");
  csv = `${header}\n${row.replace("engine,45", "new,46")}`;
  assert.deepEqual(
    (await fetchCatalog(url, fetcher)).map((building) => building.id),
    ["new"],
  );
  await assert.rejects(
    fetchCatalog(url, async () => new Response("missing", { status: 404 })),
    /HTTP 404/,
  );
});
test("shipped CSV is valid for deployment without fixing the number or identity of editable rows", async () => {
  const buildings = parseBuildings(
    await readFile(new URL("../data/buildings.csv", import.meta.url), "utf8"),
  );
  assert.ok(buildings.length > 0);
  for (const building of buildings) {
    assert.equal(typeof building.id, "string");
    assert.equal(typeof building.number, "string");
    assert.ok(Number.isFinite(building.x) && Number.isFinite(building.y));
  }
});
