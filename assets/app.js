import { fetchCatalog } from "./csv.js";
import { getBuildingName, getBuildingDetails, searchBuildings } from "./buildings.js";
import { getLanguage, setLanguage, subscribeLanguage, translate, messages } from "./i18n.js";
import { findRoute, buildSteps, formatDistance, formatEta, formatArrival } from "./routing.js";
import {
  PLANT_WIDTH,
  PLANT_HEIGHT,
  METERS_PER_UNIT,
  MODE_SPEED,
  getCategoryLabel,
  getModeLabel,
  PLANT_IMAGE_URL,
} from "./plant.js";
import { getCurrentLocation, LocationError } from "./geolocation.js";

Object.assign(messages, {
  "Plant map": "Mapa da fábrica",
  "EXPLORE THE PLANT": "EXPLORE A FÁBRICA",
  "Where are you heading?": "Para onde você vai?",
  "Find a building. Plan your way.": "Encontre um prédio. Planeje seu caminho.",
  "Number, name, or description": "Número, nome ou descrição",
  Category: "Categoria",
  Show: "Mostrar",
  "All categories": "Todas as categorias",
  "All buildings": "Todos os prédios",
  "Download building CSV": "Baixar CSV de prédios",
  "Refresh data": "Atualizar dados",
  "Your plant, at a glance.": "Sua fábrica, em um só lugar.",
  "Interactive plant map": "Mapa interativo da fábrica",
  "Fit map": "Mostrar todo o mapa",
  "Drag to explore · Scroll to zoom": "Arraste para explorar · Role para ampliar",
  "Routes are approximate. Follow site signs.":
    "As rotas são aproximadas. Siga a sinalização local.",
  "Route guidance": "Orientação de rota",
  "Building details": "Detalhes do prédio",
  "Data updated": "Dados atualizados",
  "Updated at": "Atualizado às",
  "Unable to update building data. Try Refresh data.":
    "Não foi possível atualizar os dados. Tente Atualizar dados.",
  "Showing the last successfully loaded catalog.":
    "Exibindo os últimos dados carregados com sucesso.",
  "No saved buildings yet.": "Nenhum prédio salvo ainda.",
  "Save building": "Salvar prédio",
  "Unsave building": "Remover dos salvos",
  "Starting point": "Ponto de partida",
  "Travel mode": "Modo de transporte",
  Directions: "Instruções",
  "Simulation · 25× speed": "Simulação · velocidade 25×",
  "Restart simulation": "Reiniciar simulação",
  "Arrival confirmed on this device.": "Chegada confirmada neste dispositivo.",
  "Choose a different starting point to plan a route.":
    "Escolha outro ponto de partida para planejar uma rota.",
  "Destination unavailable. It may have been removed from the CSV.":
    "Destino indisponível. Ele pode ter sido removido do CSV.",
  "GPS coordinates cannot be placed on this uncalibrated drawing.":
    "As coordenadas GPS não podem ser posicionadas nesta planta sem calibração.",
  "Coordinates stay in your browser.": "As coordenadas permanecem no seu navegador.",
  "Map coordinates": "Coordenadas no mapa",
  "Simulation complete": "Simulação concluída",
  "Quick destinations": "Destinos rápidos",
  "Find a destination": "Encontre um destino",
  "Search results": "Resultados da busca",
});

/** @template {Element} T @param {string} selector @returns {T} */
const $ = (selector) => /** @type {T} */ (document.querySelector(selector));
const svg = /** @type {SVGSVGElement} */ ($("#plant-map"));
const search = /** @type {HTMLInputElement} */ ($("#search"));
const category = /** @type {HTMLSelectElement} */ ($("#category"));
const collection = /** @type {HTMLSelectElement} */ ($("#collection"));
const languageSelect = /** @type {HTMLSelectElement} */ ($("#language"));
const mapSearch = /** @type {HTMLInputElement} */ ($("#map-search"));
const directoryDialog = /** @type {HTMLDialogElement} */ ($("#directory-dialog"));
const tr = (key) => translate(key);
const escapeHTML = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character],
  );
const e = escapeHTML;
const text = (key) => e(tr(key));
const catalogURL = new URL("../data/buildings.csv", import.meta.url);
const modes = ["pedestrian", "car", "truck", "forklift"];
let buildings = [],
  selectedId = "",
  originId = "",
  mode = "pedestrian",
  route = null;
let loading = false,
  loadedAt = null,
  errorMessage = "",
  snapshot = "";
let timer = null,
  simulationDistance = 0,
  arrived = false,
  location = null;
let locationBusy = false,
  locationError = "",
  noticeTimer;
const storageRead = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
};
const storageWrite = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Browsing still works without storage. */
  }
};
let favorites = storageRead("mb-favorites"),
  recent = storageRead("mb-recent");
const selected = () => buildings.find((building) => building.id === selectedId);
const isNavigation = () => window.location.hash.startsWith("#/nav/");

function notify(message) {
  clearTimeout(noticeTimer);
  $("#notice").textContent = message;
  $("#notice").removeAttribute("hidden");
  noticeTimer = setTimeout(() => $("#notice").setAttribute("hidden", ""), 4500);
}
function localize() {
  document.documentElement.lang = getLanguage();
  languageSelect.value = getLanguage();
  /** @type {HTMLSelectElement} */ ($("#directory-language")).value = getLanguage();
  document.querySelectorAll("[data-language]").forEach((element) => {
    element.setAttribute(
      "aria-pressed",
      String(element.getAttribute("data-language") === getLanguage()),
    );
  });
  document.title = tr("Mercedes SmartPlant Navigator — São Bernardo plant map");
  document
    .querySelector('meta[name="description"]')
    .setAttribute("content", tr("Plant map and route guidance for São Bernardo do Campo."));
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = tr(element.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-label]").forEach((element) => {
    element.setAttribute("aria-label", tr(element.getAttribute("data-label")));
  });
  document.querySelectorAll("[data-placeholder]").forEach((element) => {
    element.setAttribute("placeholder", tr(element.getAttribute("data-placeholder")));
  });
  render();
  renderLocation();
}
function renderCatalogState() {
  const element = $("#catalog-state");
  element.classList.toggle("error", Boolean(errorMessage));
  element.textContent = errorMessage
    ? `${tr("Unable to update building data. Try Refresh data.")} ${errorMessage}${buildings.length ? ` ${tr("Showing the last successfully loaded catalog.")}` : ""}`
    : loadedAt
      ? `${tr("Updated at")} ${loadedAt.toLocaleTimeString(getLanguage(), { hour: "2-digit", minute: "2-digit" })}`
      : tr("Loading buildings…");
  $("#directory").setAttribute("aria-busy", String(loading));
}
function filteredBuildings() {
  let list = buildings;
  if (category.value) list = list.filter((building) => building.category === category.value);
  if (collection.value === "favorites")
    list = list.filter((building) => favorites.includes(building.id));
  if (collection.value === "recent")
    list = recent.map((id) => list.find((building) => building.id === id)).filter(Boolean);
  return search.value.trim() ? searchBuildings(list, search.value, list.length) : list;
}
function renderDirectory() {
  const list = filteredBuildings();
  $("#count").textContent = `${list.length} / ${buildings.length}`;
  $("#directory").innerHTML = list.length
    ? list
        .map((building) => {
          const id = e(building.id),
            name = e(getBuildingName(building)),
            details = getBuildingDetails(building);
          const saved = favorites.includes(building.id);
          return `<article class="building-card${building.id === selectedId ? " selected" : ""}">
      <div class="card-image"><img src="${e(PLANT_IMAGE_URL)}" alt="" loading="lazy"/><span class="card-image-symbol" aria-hidden="true">▦</span><div class="card-badges"><span class="building-number ${e(building.category)}">${e(building.number)}</span><span class="card-category">${e(getCategoryLabel(building.category))}</span></div><button class="favorite" data-favorite="${id}" aria-pressed="${saved}" aria-label="${text(saved ? "Unsave building" : "Save building")} · ${name}">${saved ? "★" : "☆"}</button></div>
      <div class="card-body"><h3>${name}</h3><p class="card-description">${e(details.description || tr("No description is available for this building yet."))}</p><button class="card-directions" data-route="${id}"><span>⌖ ${text("Get directions")}</span><span aria-hidden="true">↗</span></button></div></article>`;
        })
        .join("")
    : `<p class="empty">${text(collection.value !== "all" && !search.value ? "No saved buildings yet." : "No buildings found")}</p>`;
  renderMarkers();
}
function renderMarkers(list = buildings) {
  const visible = new Map(list.map((building) => [building.id, building]));
  if (selected()) visible.set(selectedId, selected());
  if (isNavigation() && buildings.find((building) => building.id === originId))
    visible.set(
      originId,
      buildings.find((building) => building.id === originId),
    );
  $("#markers").innerHTML = [...visible.values()]
    .map(
      (building) =>
        `<g class="map-marker ${e(building.category)}${selectedId === building.id ? " selected" : ""}${isNavigation() && originId === building.id ? " origin" : ""}" role="button" tabindex="0" data-select="${e(building.id)}" aria-label="${e(building.number)} · ${e(getBuildingName(building))}" transform="translate(${building.x} ${building.y})"><title>${e(building.number)} · ${e(getBuildingName(building))}</title><g class="marker-icon"><circle r="34"/><text>${e(building.number)}</text></g></g>`,
    )
    .join("");
  updateMarkerScale();
}
function detailFields(building) {
  const details = getBuildingDetails(building);
  return `<p class="muted">${e(details.description || tr("No description is available for this building yet."))}</p><dl>${[
    ["Department", details.department],
    ["Responsible", details.responsible],
    ["Hours", details.hours],
    ["Dock", details.dock],
    ["Map coordinates", `${building.x}, ${building.y}`],
  ]
    .filter(([, value]) => value)
    .map(([key, value]) => `<dt>${text(key)}</dt><dd>${e(value)}</dd>`)
    .join("")}</dl>`;
}
function telephone(building) {
  return building.phone
    ? `<a class="button secondary" href="tel:${e(building.phone.replace(/[^+\d]/g, ""))}">${e(building.phone)}</a>`
    : "";
}
function renderDetails() {
  const building = selected(),
    element = $("#details");
  element.toggleAttribute("hidden", !building || isNavigation());
  if (!building || isNavigation()) return;
  element.innerHTML = `<div class="panel-heading"><h2>${e(building.number)} · ${e(getBuildingName(building))}</h2><a href="#/" class="close" aria-label="${text("Close")}">×</a></div>${detailFields(building)}<div class="panel-actions"><button class="button" data-route="${e(building.id)}">${text("Get directions")}</button>${telephone(building)}</div>`;
}
function renderRoute() {
  const panel = $("#route-panel"),
    building = selected();
  panel.toggleAttribute("hidden", !isNavigation() || !building);
  document.body.classList.toggle("navigating", isNavigation() && Boolean(building));
  $("#route-instruction").toggleAttribute(
    "hidden",
    !isNavigation() || !building || !route || arrived,
  );
  if (!building || !isNavigation()) {
    $("#route-layer").innerHTML = "";
    return;
  }
  const origin = buildings.find((item) => item.id === originId);
  panel.innerHTML = `<div class="panel-heading"><a href="#/" class="back-button" aria-label="${text("Back")}">←</a><span class="building-number ${e(building.category)}">${e(building.number)}</span><div class="destination-title"><span class="destination-category">${e(getCategoryLabel(building.category))}</span><h2>${e(getBuildingName(building))}</h2></div><a href="#/" class="close" aria-label="${text("End")}">×</a></div>
    <div class="route-fields"><label>${text("Starting point")}<select id="origin">${buildings.map((item) => `<option value="${e(item.id)}"${item.id === originId ? " selected" : ""}>${e(item.number)} · ${e(getBuildingName(item))}</option>`).join("")}</select></label><label>${text("Travel mode")}<select id="mode">${modes.map((value) => `<option value="${value}"${value === mode ? " selected" : ""}>${e(getModeLabel(value))}</option>`).join("")}</select></label></div>
    ${arrived ? `<p class="arrival">✓ ${text("Arrival confirmed on this device.")}</p>` : ""}
    ${
      route && origin?.id !== building.id
        ? `<div class="route-stats"><div><span>${text("Distance")}</span><strong id="remaining-distance">${e(formatDistance(route.distance))}</strong></div><div><span>${text("Time")}</span><strong>${e(formatEta(route.etaSeconds))}</strong></div><div><span>${text("Arrival")}</span><strong>${e(formatArrival(route.etaSeconds))}</strong></div></div><details><summary>${text("Directions")}</summary><ol class="steps">${buildSteps(
            route.path,
          )
            .map(
              (step) =>
                `<li>${e(step.text)}${step.distanceM ? `<small>${e(formatDistance(step.distanceM))}</small>` : ""}</li>`,
            )
            .join("")}</ol></details>
      <div class="panel-actions"><button class="button secondary" id="recalculate">${text("Recalculate")}</button><button class="button secondary" id="center-route">${text("Center")}</button><button class="button secondary" id="simulate">${text(timer ? "Pause" : simulationDistance ? "Restart simulation" : "Simulate route")}</button><button class="button" id="confirm-arrival">${text("Confirm arrival")}</button><a href="#/" class="button secondary">${text("End")}</a></div><p class="simulation-label">${text("Simulation · 25× speed")}</p>`
        : `<p class="muted">${text("Choose a different starting point to plan a route.")}</p>`
    }
    <details><summary>${text("Building details")}</summary>${detailFields(building)}<div class="panel-actions">${telephone(building)}</div></details>`;
  drawRoute();
  renderInstruction();
}
function renderInstruction(index = 0) {
  if (!route || !isNavigation()) return;
  const steps = buildSteps(route.path);
  const step = index ? steps.find((item) => item.atIndex > index) || steps.at(-1) : steps[0];
  $("#route-instruction").innerHTML =
    `<span class="turn-glyph" aria-hidden="true">${{ left: "↰", right: "↱", straight: "↑", arrive: "⚑" }[step?.turn || "straight"]}</span><div><strong>${text("Now")}</strong><span>${e(step?.text || tr("Calculating route…"))}</span></div><button class="instruction-center" id="center-on-route" aria-label="${text("Center")}">⌖</button>`;
}

function renderHome() {
  $("#total-count").textContent = String(buildings.length);
  $("#quick-destinations").innerHTML = ["P1", "39", "45", "118", "P2", "104"]
    .map((number) => buildings.find((building) => building.number === number))
    .filter(Boolean)
    .map(
      (building) =>
        `<button class="quick-destination" data-route="${e(building.id)}"><span class="building-number ${e(building.category)}">${e(building.number)}</span><span class="quick-name">${e(getBuildingName(building))}</span></button>`,
    )
    .join("");
  $("#recent-summary").toggleAttribute("hidden", !recent.length && !favorites.length);
  $("#recent-summary").innerHTML =
    `<span>↶ ${text("Recent")}: ${recent.length}</span><span>☆ ${text("Favorites")}: ${favorites.length}</span>`;
  renderSearchResults();
}
function renderSearchResults() {
  const query = mapSearch.value.trim();
  const panel = $("#search-results");
  const results = searchBuildings(buildings, query, 8);
  panel.toggleAttribute("hidden", !query || isNavigation());
  mapSearch.setAttribute("aria-expanded", String(Boolean(query) && !isNavigation()));
  panel.innerHTML = results.length
    ? results
        .map(
          (building) =>
            `<button class="search-result" data-route="${e(building.id)}"><span class="building-number ${e(building.category)}">${e(building.number)}</span><span><strong>${e(getBuildingName(building))}</strong><small>${e(getCategoryLabel(building.category))}</small></span><span aria-hidden="true">↗</span></button>`,
        )
        .join("")
    : `<p class="empty">${e(translate('No results for "{query}". Try a building number, name, or department.', { query }))}</p>`;
}
function drawRoute() {
  if (!route) {
    $("#route-layer").innerHTML = "";
    return;
  }
  const points = route.path.map((point) => `${point.x},${point.y}`).join(" ");
  $("#route-layer").innerHTML =
    `<polyline points="${points}" fill="none" stroke="white" stroke-width="12" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/><polyline points="${points}" fill="none" stroke="#155bc0" stroke-width="7" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>`;
}
function render() {
  renderDirectory();
  renderDetails();
  renderRoute();
  renderCatalogState();
  renderHome();
}
function stopSimulation() {
  clearInterval(timer);
  timer = null;
}
function resetSimulation() {
  stopSimulation();
  simulationDistance = 0;
  arrived = false;
  $("#traveler").setAttribute("hidden", "");
}
function calculateRoute() {
  resetSimulation();
  const origin = buildings.find((building) => building.id === originId),
    destination = selected();
  route =
    origin && destination && origin.id !== destination.id
      ? findRoute(origin, destination, mode)
      : null;
}
function routeURL(id, from = originId, travelMode = mode) {
  const params = new URLSearchParams();
  if (from) params.set("from", from);
  params.set("mode", travelMode);
  return `#/nav/${encodeURIComponent(id)}?${params}`;
}
function goTo(id) {
  mapSearch.value = "";
  renderSearchResults();
  window.location.hash = routeURL(id);
}
function applyHash(focus = true) {
  if (!buildings.length) return;
  const hash = window.location.hash || "#/";
  const match = hash.match(/^#\/(building|nav)\/([^?]+)(?:\?(.*))?$/);
  selectedId = "";
  if (match) {
    try {
      selectedId = decodeURIComponent(match[2]);
    } catch {
      /* Invalid URL is handled below. */
    }
    const params = new URLSearchParams(match[3]);
    originId = params.get("from") || originId;
    mode = modes.includes(params.get("mode")) ? params.get("mode") : mode;
    if (!selected()) {
      selectedId = "";
      notify(tr("Destination unavailable. It may have been removed from the CSV."));
    }
  } else if (hash !== "#/") notify(tr("This address does not exist. Return to the main map."));
  if (!buildings.some((building) => building.id === originId))
    originId = (buildings.find((building) => building.number === "P1") || buildings[0]).id;
  if (selectedId && isNavigation()) {
    recent = [selectedId, ...recent.filter((id) => id !== selectedId)].slice(0, 5);
    storageWrite("mb-recent", recent);
    calculateRoute();
  } else {
    resetSimulation();
    route = null;
    if (focus && !selectedId) setView({ x: 0, y: 0, w: PLANT_WIDTH, h: PLANT_HEIGHT });
  }
  render();
  if (selectedId && directoryDialog.open) directoryDialog.close();
  if (focus && selected()) {
    if (route)
      fitPoints([
        ...route.path,
        selected(),
        buildings.find((building) => building.id === originId),
      ]);
    else focusPoint(selected());
  }
}
async function loadCatalog(manual = false) {
  if (loading) return;
  loading = true;
  renderCatalogState();
  try {
    const next = await fetchCatalog(catalogURL);
    const nextSnapshot = JSON.stringify(next);
    const changed = snapshot !== nextSnapshot;
    buildings = next.sort((a, b) =>
      a.number.localeCompare(b.number, getLanguage(), { numeric: true }),
    );
    loadedAt = new Date();
    errorMessage = "";
    if (changed) {
      const firstLoad = !snapshot;
      snapshot = nextSnapshot;
      applyHash(firstLoad);
    }
    if (manual) notify(tr("Data updated"));
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  } finally {
    loading = false;
    renderCatalogState();
  }
}

// The drawing uses local x/y coordinates. GPS is displayed separately.
let view = { x: 0, y: 0, w: PLANT_WIDTH, h: PLANT_HEIGHT };
function updateMarkerScale() {
  const scale = svg.getScreenCTM()?.a;
  if (!scale) return;
  svg
    .querySelectorAll(".marker-icon")
    .forEach((element) => element.setAttribute("transform", `scale(${1 / (2 * scale)})`));
  svg.querySelector(".traveler-icon")?.setAttribute("transform", `scale(${20 / (29 * scale)})`);
}
new ResizeObserver(updateMarkerScale).observe(svg);
function setView(next) {
  next.w = Math.max(250, Math.min(PLANT_WIDTH * 1.3, next.w));
  next.h = Math.max(182, Math.min(PLANT_HEIGHT * 1.3, next.h));
  next.x = Math.max(-next.w / 2, Math.min(PLANT_WIDTH - next.w / 2, next.x));
  next.y = Math.max(-next.h / 2, Math.min(PLANT_HEIGHT - next.h / 2, next.y));
  view = next;
  svg.setAttribute("viewBox", `${view.x} ${view.y} ${view.w} ${view.h}`);
  updateMarkerScale();
}
function mapPoint(clientX, clientY) {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  return point.matrixTransform(svg.getScreenCTM().inverse());
}
function zoom(factor, center = { x: view.x + view.w / 2, y: view.y + view.h / 2 }) {
  if ((view.w <= 250 && factor < 1) || (view.w >= PLANT_WIDTH * 1.3 && factor > 1)) return;
  setView({
    x: center.x - (center.x - view.x) * factor,
    y: center.y - (center.y - view.y) * factor,
    w: view.w * factor,
    h: view.h * factor,
  });
}
function focusPoint(point) {
  setView({ x: point.x - 600, y: point.y - 437, w: 1200, h: 874 });
}
function fitPoints(points) {
  const xs = points.map((point) => point.x),
    ys = points.map((point) => point.y);
  const w = Math.max(650, Math.max(...xs) - Math.min(...xs) + 350),
    h = Math.max(500, Math.max(...ys) - Math.min(...ys) + 350);
  setView({
    x: (Math.max(...xs) + Math.min(...xs) - w) / 2,
    y: (Math.max(...ys) + Math.min(...ys) - h) / 2,
    w,
    h,
  });
}
let drag = null,
  moved = false;
const pointers = new Map();
let pinchDistance = 0;
svg.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  moved = false;
  drag = { x: event.clientX, y: event.clientY };
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
  }
});
svg.addEventListener("pointermove", (event) => {
  if (!pointers.has(event.pointerId) || !drag) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()],
      distance = Math.hypot(a.x - b.x, a.y - b.y);
    if (distance > 0 && pinchDistance > 0)
      zoom(pinchDistance / distance, mapPoint((a.x + b.x) / 2, (a.y + b.y) / 2));
    pinchDistance = distance;
    moved = true;
    return;
  }
  if (!moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 5) return;
  moved = true;
  svg.setPointerCapture(event.pointerId);
  svg.classList.add("dragging");
  const start = mapPoint(drag.x, drag.y),
    end = mapPoint(event.clientX, event.clientY);
  setView({ ...view, x: view.x + start.x - end.x, y: view.y + start.y - end.y });
  drag = { x: event.clientX, y: event.clientY };
});
function endPointer(event) {
  pointers.delete(event.pointerId);
  drag = null;
  pinchDistance = 0;
  svg.classList.remove("dragging");
  setTimeout(() => {
    moved = false;
  }, 0);
}
window.addEventListener("pointerup", endPointer);
window.addEventListener("pointercancel", endPointer);
svg.addEventListener(
  "wheel",
  (event) => {
    event.preventDefault();
    zoom(event.deltaY > 0 ? 1.15 : 1 / 1.15, mapPoint(event.clientX, event.clientY));
  },
  { passive: false },
);
svg.addEventListener("keydown", (event) => {
  if (event.target !== svg) return;
  if (["+", "=", "-", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "0"].includes(event.key))
    event.preventDefault();
  if (event.key === "+" || event.key === "=") zoom(0.8);
  if (event.key === "-") zoom(1.25);
  if (event.key === "0") setView({ x: 0, y: 0, w: PLANT_WIDTH, h: PLANT_HEIGHT });
  const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[
    event.key
  ];
  if (delta)
    setView({ ...view, x: view.x + delta[0] * view.w * 0.1, y: view.y + delta[1] * view.h * 0.1 });
});
$("#zoom-in").addEventListener("click", () => zoom(0.8));
$("#zoom-out").addEventListener("click", () => zoom(1.25));
$("#fit-map").addEventListener("click", () =>
  setView({ x: 0, y: 0, w: PLANT_WIDTH, h: PLANT_HEIGHT }),
);

function simulate() {
  if (timer) {
    stopSimulation();
    renderRoute();
    return;
  }
  if (!route || route.path.length < 2) return;
  simulationDistance = 0;
  arrived = false;
  const path = route.path,
    lengths = path.slice(1).map((point, i) => Math.hypot(point.x - path[i].x, point.y - path[i].y));
  const total = lengths.reduce((sum, value) => sum + value, 0);
  let previous = performance.now();
  timer = setInterval(() => {
    const now = performance.now();
    simulationDistance = Math.min(
      total,
      simulationDistance +
        ((Math.min(now - previous, 1000) / 1000) * MODE_SPEED[mode] * 25) / METERS_PER_UNIT,
    );
    previous = now;
    let distance = simulationDistance,
      index = 0;
    while (index < lengths.length - 1 && distance > lengths[index]) {
      distance -= lengths[index];
      index++;
    }
    const a = path[index],
      b = path[index + 1],
      fraction = lengths[index] ? distance / lengths[index] : 1;
    const x = a.x + (b.x - a.x) * fraction,
      y = a.y + (b.y - a.y) * fraction;
    $("#traveler").removeAttribute("hidden");
    $("#traveler").setAttribute(
      "transform",
      `translate(${x} ${y}) rotate(${(Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90})`,
    );
    renderInstruction(index);
    if ($("#remaining-distance"))
      $("#remaining-distance").textContent = formatDistance(
        Math.round((total - simulationDistance) * METERS_PER_UNIT),
      );
    if (simulationDistance >= total) {
      stopSimulation();
      renderRoute();
      notify(tr("Simulation complete"));
    }
  }, 100);
  renderRoute();
}

function renderLocation() {
  const panel = $("#location-panel");
  if (!location && !locationBusy && !locationError) {
    panel.setAttribute("hidden", "");
    return;
  }
  panel.removeAttribute("hidden");
  panel.innerHTML = `<div class="panel-heading"><h2>${text("Your current location")}</h2><button class="close" id="close-location" aria-label="${text("Close")}">×</button></div>${locationBusy ? `<p>${text("Finding your location…")}</p>` : locationError ? `<p>${e(tr(locationError))}</p><button class="button secondary" id="retry-location">${text("Try again")}</button>` : `<svg class="coordinate-map" viewBox="0 0 300 125" role="img" aria-label="${text("Your current location")}"><circle cx="150" cy="63" r="45" fill="#155bc015" stroke="#155bc0"/><circle cx="150" cy="63" r="7" fill="#155bc0" stroke="white" stroke-width="3"/></svg><p>${text("Coordinate map · no street basemap")}</p><dl><dt>${text("Latitude")}</dt><dd>${location.latitude.toFixed(6)}</dd><dt>${text("Longitude")}</dt><dd>${location.longitude.toFixed(6)}</dd></dl><p>${e(translate("Accuracy: {meters} m", { meters: Math.round(location.accuracy) }))}</p><p class="muted">${text("GPS coordinates cannot be placed on this uncalibrated drawing.")} ${text("Coordinates stay in your browser.")}</p>`}`;
  $("#locate").toggleAttribute("disabled", locationBusy);
}
let locationRequest = 0;
async function locate() {
  const request = ++locationRequest;
  locationBusy = true;
  locationError = "";
  renderLocation();
  try {
    const result = await getCurrentLocation();
    if (request === locationRequest) location = result;
  } catch (error) {
    if (request === locationRequest)
      locationError = error instanceof LocationError ? error.messageKey : String(error);
  } finally {
    if (request === locationRequest) {
      locationBusy = false;
      renderLocation();
    }
  }
}
document.addEventListener("click", (event) => {
  const target = /** @type {Element} */ (event.target);
  const select = target.closest("[data-select]"),
    navigate = target.closest("[data-route]"),
    favorite = target.closest("[data-favorite]");
  if (select && !moved)
    window.location.hash = `#/building/${encodeURIComponent(select.getAttribute("data-select"))}`;
  if (navigate) goTo(navigate.getAttribute("data-route"));
  if (favorite) {
    const id = favorite.getAttribute("data-favorite");
    favorites = favorites.includes(id)
      ? favorites.filter((item) => item !== id)
      : [...favorites, id];
    storageWrite("mb-favorites", favorites);
    renderDirectory();
    renderHome();
  }
  const language = target.closest("[data-language]");
  if (language) setLanguage(language.getAttribute("data-language"));
  if (target.closest("#center-route, #center-on-route") && route) fitPoints(route.path);
  if (target.closest("#simulate")) simulate();
  if (target.closest("#recalculate")) {
    calculateRoute();
    renderRoute();
    if (route) fitPoints(route.path);
  }
  if (target.closest("#confirm-arrival")) {
    stopSimulation();
    arrived = true;
    renderRoute();
    notify(tr("Arrival confirmed on this device."));
  }
  if (target.closest("#close-location")) {
    locationRequest++;
    location = null;
    locationBusy = false;
    locationError = "";
    $("#locate").removeAttribute("disabled");
    renderLocation();
  }
  if (target.closest("#retry-location")) void locate();
});
document.addEventListener("keydown", (event) => {
  const target = /** @type {Element} */ (event.target);
  if ((event.key === "Enter" || event.key === " ") && target.matches(".map-marker")) {
    event.preventDefault();
    window.location.hash = `#/building/${encodeURIComponent(target.getAttribute("data-select"))}`;
  }
});
document.addEventListener("change", (event) => {
  const target = /** @type {HTMLSelectElement} */ (event.target);
  if ((target.id === "origin" || target.id === "mode") && selected()) {
    window.location.hash = routeURL(
      selectedId,
      target.id === "origin" ? target.value : originId,
      target.id === "mode" ? target.value : mode,
    );
  }
});
search.addEventListener("input", renderDirectory);
mapSearch.addEventListener("input", renderSearchResults);
mapSearch.addEventListener("focus", renderSearchResults);
mapSearch.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    mapSearch.value = "";
    renderSearchResults();
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    /** @type {HTMLButtonElement} */ ($("#search-results button"))?.focus();
  }
});
$("#open-directory").addEventListener("click", () => directoryDialog.showModal());
$("#close-directory").addEventListener("click", () => directoryDialog.close());
directoryDialog.addEventListener("click", (event) => {
  if (event.target !== directoryDialog) return;
  const bounds = directoryDialog.getBoundingClientRect();
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    directoryDialog.close();
});
document.addEventListener("click", (event) => {
  if (!(/** @type {Element} */ (event.target).closest(".map-search-container"))) {
    $("#search-results").setAttribute("hidden", "");
    mapSearch.setAttribute("aria-expanded", "false");
  }
});
category.addEventListener("change", renderDirectory);
collection.addEventListener("change", renderDirectory);
languageSelect.addEventListener("change", () => setLanguage(languageSelect.value));
$("#directory-language").addEventListener("change", (event) =>
  setLanguage(/** @type {HTMLSelectElement} */ (event.target).value),
);
subscribeLanguage(localize);
window.addEventListener("hashchange", () => applyHash());
window.addEventListener("storage", (event) => {
  if (["mb-favorites", "mb-recent", null].includes(event.key)) {
    favorites = storageRead("mb-favorites");
    recent = storageRead("mb-recent");
    renderDirectory();
  }
});
$("#refresh").addEventListener("click", () => void loadCatalog(true));
$("#locate").addEventListener("click", () => void locate());
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) void loadCatalog();
});
setInterval(() => {
  if (!document.hidden) void loadCatalog();
}, 60000);
localize();
void loadCatalog();
