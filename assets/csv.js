import { PLANT_WIDTH, PLANT_HEIGHT } from "./plant.js";

// Quoted CSV with Excel UTF-8 BOM, CRLF, and semicolon export support.
export function parseCSV(source) {
  source = source.replace(/^\uFEFF/, "");
  const header = source.split(/\r?\n/, 1)[0];
  const delimiter = header.includes(";") && !header.includes(",") ? ";" : ",";
  const rows = [];
  let row = [],
    cell = "",
    quoted = false,
    closed = false;
  for (let i = 0; i < source.length; i++) {
    const character = source[i];
    if (quoted) {
      if (character === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += character;
    } else if (character === '"') {
      if (cell || closed) throw new Error(`Unexpected quote near row ${rows.length + 1}.`);
      quoted = true;
    } else if (character === delimiter || character === "\n" || character === "\r") {
      row.push(cell);
      cell = "";
      closed = false;
      if (character !== delimiter) {
        if (character === "\r" && source[i + 1] === "\n") i++;
        if (row.some((value) => value.trim())) rows.push(row);
        row = [];
      }
    } else {
      if (closed)
        throw new Error(`Unexpected text after closing quote near row ${rows.length + 1}.`);
      cell += character;
    }
  }
  if (quoted) throw new Error("Unclosed quoted cell in CSV.");
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

/** @typedef {{id: string, number: string, name_pt: string, name_en: string, category: string, x: number, y: number, keywords: string[], [key: string]: any}} Building */
/** @param {string} source @returns {Building[]} */
export function parseBuildings(source) {
  const [header, ...rows] = parseCSV(source);
  if (!header) throw new Error("The building CSV is empty.");
  const columns = header.map((value) => value.trim());
  if (new Set(columns).size !== columns.length) throw new Error("Duplicate CSV column names.");
  for (const key of ["id", "number", "name_pt", "name_en", "category", "x", "y"]) {
    if (!columns.includes(key)) throw new Error(`Missing CSV column: ${key}.`);
  }
  const ids = new Set(),
    numbers = new Set();
  const buildings = rows.map((cells, index) => {
    const error = (message) => {
      throw new Error(`CSV row ${index + 2}: ${message}`);
    };
    if (cells.length !== columns.length)
      error(
        `expected ${columns.length} cells, found ${cells.length}. Quote cells containing commas.`,
      );
    const building = Object.fromEntries(columns.map((key, i) => [key, cells[i].trim()]));
    for (const key of ["id", "number", "category", "x", "y"])
      if (!building[key]) error(`${key} is required.`);
    if (!building.name_pt && !building.name_en) error("provide a name in at least one language.");
    if (ids.has(building.id)) error(`duplicate id: ${building.id}.`);
    if (numbers.has(building.number)) error(`duplicate building number: ${building.number}.`);
    ids.add(building.id);
    numbers.add(building.number);
    if (!["industrial", "social", "auxiliary", "gate"].includes(building.category))
      error(`unknown category: ${building.category}.`);
    const x = Number(building.x),
      y = Number(building.y);
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < 0 ||
      y < 0 ||
      x > PLANT_WIDTH ||
      y > PLANT_HEIGHT
    )
      error(`x/y must be within 0–${PLANT_WIDTH} and 0–${PLANT_HEIGHT}.`);
    return /** @type {Building} */ ({
      ...building,
      x,
      y,
      keywords: (building.keywords || "")
        .split("|")
        .map((value) => value.trim())
        .filter(Boolean),
    });
  });
  if (!buildings.length) throw new Error("The CSV must contain at least one building.");
  return buildings;
}

export async function fetchCatalog(url, fetcher = fetch) {
  const response = await fetcher(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`Unable to load CSV (HTTP ${response.status}).`);
  return parseBuildings(await response.text());
}
