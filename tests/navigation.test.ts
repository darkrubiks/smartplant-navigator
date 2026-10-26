import { strict as assert } from "node:assert";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

// Use Vite's transforms so tests exercise the same aliases and environment as the app.
const server = await createServer({
  configFile: false,
  resolve: {
    alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) },
  },
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://example.supabase.co"),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("sb_publishable_test"),
  },
  server: { middlewareMode: true, watch: null },
  appType: "custom",
});
after(() => server.close());

const { searchBuildings } = await server.ssrLoadModule("/src/lib/buildings.ts");
const { findRoute, buildSteps } = await server.ssrLoadModule("/src/lib/routing.ts");
const { supabase } = await server.ssrLoadModule("/src/integrations/supabase/client.ts");

const buildings = [
  {
    id: "motor",
    number: "39",
    name_pt: "Fábrica de Motores",
    name_en: "Engine Factory",
    department: "Produção",
    keywords: ["engines"],
  },
  {
    id: "logistics",
    number: "45",
    name_pt: "Logística",
    name_en: "Logistics",
    department: "Logística",
    keywords: ["deliveries"],
  },
];

test("building search finds numbers, English names, Portuguese departments and keywords", () => {
  for (const query of ["39", "engine factory", "Produção", "engines"]) {
    assert.equal(searchBuildings(buildings, query)[0]?.id, "motor");
  }
  assert.equal(searchBuildings(buildings, "deliveries")[0]?.id, "logistics");
});

test("empty and unmatched searches return no destinations", () => {
  for (const query of ["", "  ", "unknown destination"]) {
    assert.deepEqual(searchBuildings(buildings, query), []);
  }
});

for (const mode of ["pedestrian", "car", "truck", "forklift"]) {
  test(`${mode} guidance reaches the destination and ends with arrival instructions`, () => {
    const origin = { x: 292, y: 1664 };
    const destination = { x: 2360, y: 740 };
    const route = findRoute(origin, destination, mode);
    assert.deepEqual(route.path[0], origin);
    assert.deepEqual(route.path.at(-1), destination);
    assert.ok(route.distance > 0);
    assert.ok(route.etaSeconds > 0);
    assert.equal(buildSteps(route.path).at(-1)?.turn, "arrive");
  });
}

test("public database reads and arrival writes make no authentication requests", async () => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; headers: Headers; body: unknown }> = [];
  globalThis.fetch = async (input, init) => {
    requests.push({
      url: String(input),
      headers: new Headers(init?.headers),
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    const read = await supabase.from("buildings").select("*");
    const write = await supabase.from("arrivals").insert({ building_id: "motor", source: "web" });
    assert.equal(read.error, null);
    assert.equal(write.error, null);
    assert.equal(requests.length, 2);
    assert.ok(requests[0].url.includes("/rest/v1/buildings"));
    assert.ok(requests[1].url.includes("/rest/v1/arrivals"));
    for (const request of requests) {
      assert.equal(request.headers.get("apikey"), "sb_publishable_test");
      assert.equal(request.headers.has("Authorization"), false);
    }
    assert.deepEqual(requests[1].body, { building_id: "motor", source: "web" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
