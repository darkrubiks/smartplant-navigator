import { strict as assert } from "node:assert";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { readFileSync, readdirSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import react from "@vitejs/plugin-react";
import { createServer } from "vite";

// Use Vite's transforms so tests exercise the same aliases and environment as the app.
const server = await createServer({
  configFile: false,
  cacheDir: "node_modules/.vite-tests",
  plugins: [react()],
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
const { translate, messages, detectLanguage, setLanguage, getLanguage, subscribeLanguage } =
  await server.ssrLoadModule("/src/lib/i18n.ts");
const { getBuildingName, getBuildingDescription, getBuildingDetails } =
  await server.ssrLoadModule("/src/lib/buildings.ts");
const { translateCatalogText } = await server.ssrLoadModule("/src/lib/catalog-translations.ts");
const { formatDistance, formatArrival } = await server.ssrLoadModule("/src/lib/routing.ts");
const { BuildingCard } = await server.ssrLoadModule("/src/components/BuildingCard.tsx");
const { LanguageSwitcher } = await server.ssrLoadModule("/src/components/LanguageSwitcher.tsx");

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

test("language detection honors a saved preference and supported browser languages", () => {
  assert.equal(detectLanguage("en", ["pt-BR"]), "en");
  assert.equal(detectLanguage("pt-BR", ["en-US"]), "pt-BR");
  assert.equal(detectLanguage(null, ["fr-FR", "pt-PT"]), "pt-BR");
  assert.equal(detectLanguage("invalid", ["en-GB", "pt-BR"]), "en");
  assert.equal(detectLanguage(null, ["de-DE"]), "en");
});

test("every translation preserves placeholders and interpolates without modifying values", () => {
  const placeholders = (value: string) =>
    [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
  for (const [english, portuguese] of Object.entries(messages)) {
    assert.ok(String(portuguese).trim(), english);
    assert.deepEqual(placeholders(english), placeholders(String(portuguese)), english);
  }
  assert.equal(
    translate("{name} — Building {number}", { number: 39, name: "João $&" }, "pt-BR"),
    "João $& — Prédio 39",
  );
});

test("language changes are saved and notify the interface even if storage is blocked", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  let saved: string | null = null;
  let notifications = 0;
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => saved,
      setItem: (_key: string, value: string) => {
        saved = value;
      },
    },
  });
  const unsubscribe = subscribeLanguage(() => {
    notifications++;
  });
  try {
    setLanguage("pt-BR");
    assert.equal(saved, "pt-BR");
    assert.equal(getLanguage(), "pt-BR");
    assert.equal(notifications, 1);
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get: () => {
        throw new Error("Storage blocked");
      },
    });
    assert.doesNotThrow(() => setLanguage("en"));
    assert.equal(getLanguage(), "en");
    assert.equal(notifications, 2);
  } finally {
    unsubscribe();
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else Reflect.deleteProperty(globalThis, "localStorage");
    setLanguage("en");
  }
});

test("catalog names, descriptions, departments and dock labels follow the language", () => {
  const building = {
    ...buildings[0],
    description: "Restaurante, ambulatório e escritórios",
    responsible: "Recepção",
    hours: "24h",
    dock: "Doca M1",
  };
  assert.equal(getBuildingName(building, "pt-BR"), "Fábrica de Motores");
  assert.equal(getBuildingName(building, "en"), "Engine Factory");
  assert.equal(
    getBuildingName({ name_pt: "Prédio 106", name_en: "Prédio 106" }, "en"),
    "Building 106",
  );
  assert.equal(getBuildingDescription(building, "en"), "Restaurant, medical clinic and offices");
  assert.equal(
    getBuildingDescription({ ...building, description_en: "Custom English description" }, "en"),
    "Custom English description",
  );
  assert.equal(getBuildingDetails(building, "en").department, "Production");
  assert.equal(getBuildingDetails(building, "en").responsible, "Reception");
  assert.equal(getBuildingDetails(building, "en").dock, "Dock M1");
  assert.equal(getBuildingDetails(building, "pt-BR").hours, "24 horas");
});

test("all descriptions in the shipped building catalog have English translations", () => {
  const directory = new URL("../supabase/migrations/", import.meta.url);
  let count = 0;
  for (const file of readdirSync(directory)) {
    const sql = readFileSync(new URL(file, directory), "utf8");
    for (const row of sql.matchAll(
      /\('([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'(industrial|social|auxiliary|gate)'\s*,\s*'([^']+)'/g,
    )) {
      const description = row[5];
      assert.notEqual(
        translateCatalogText(description, "en"),
        description,
        `${row[1]}: ${description}`,
      );
      count++;
    }
  }
  assert.ok(count > 60);
});

test("search accepts English and accent-free Portuguese regardless of the interface language", () => {
  for (const language of ["en", "pt-BR"]) {
    setLanguage(language);
    for (const query of ["producao", "production", "fabrica", "engine"]) {
      assert.equal(searchBuildings(buildings, query)[0]?.id, "motor");
    }
  }
  setLanguage("en");
});

test("route instructions and regional number and time formats follow the language", () => {
  const path = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
  ];
  assert.deepEqual(
    buildSteps(path, "pt-BR").map((step: { text: string }) => step.text),
    ["Siga em frente", "Vire à direita", "Você chegou ao seu destino"],
  );
  assert.equal(buildSteps(path, "en")[1].text, "Turn right");
  assert.equal(formatDistance(1250, "en"), "1.25 km");
  assert.equal(formatDistance(1250, "pt-BR"), "1,25 km");
  assert.match(formatArrival(0, "pt-BR"), /^\d{1,2}:\d{2}$/);
});

test("rendered building cards and the language switch update in both languages", () => {
  const building = {
    ...buildings[0],
    category: "social",
    description: "Restaurante, ambulatório e escritórios",
  };
  try {
    setLanguage("pt-BR");
    let card = renderToStaticMarkup(createElement(BuildingCard, { building, onSelect: () => {} }));
    assert.ok(card.includes("Ver rota"));
    assert.ok(card.includes("Fábrica de Motores"));
    assert.ok(card.includes("Restaurante, ambulatório e escritórios"));
    assert.ok(
      renderToStaticMarkup(createElement(LanguageSwitcher)).includes('aria-label="Idioma"'),
    );
    setLanguage("en");
    card = renderToStaticMarkup(createElement(BuildingCard, { building, onSelect: () => {} }));
    assert.ok(card.includes("Get directions"));
    assert.ok(card.includes("Engine Factory"));
    assert.ok(card.includes("Restaurant, medical clinic and offices"));
    assert.ok(
      renderToStaticMarkup(createElement(LanguageSwitcher)).includes('aria-label="Language"'),
    );
  } finally {
    setLanguage("en");
  }
});
