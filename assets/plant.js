// Plant map metadata and the street graph used for internal navigation.
// Coordinates use the official map at 2x its native 1349 x 982 resolution.
// Leaflet uses CRS.Simple, so points are converted directly to [y, x].
export const PLANT_IMAGE_URL = new URL("./planta-sbc.jpg", import.meta.url).href;
export const PLANT_WIDTH = 2698;
export const PLANT_HEIGHT = 1964;
// Approximate real-world scale from the printed scale bar.
export const METERS_PER_UNIT = 0.645;
export const toLatLng = (x, y) => [PLANT_HEIGHT - y, x];
// Street centerlines measured against the current plant drawing. Nodes sit in
// paved corridors, never in building footprints. The router projects arbitrary
// origins and destinations onto these segments before calculating a path.
export const WAYPOINTS = [
  // West gate and west perimeter road
  { id: "w_gate", x: 292, y: 1664 },
  { id: "w_curve_s", x: 330, y: 1570 },
  { id: "w_curve_m", x: 400, y: 1400 },
  { id: "w_curve_n", x: 500, y: 1240 },
  // North side of the main industrial halls
  { id: "in_w0", x: 600, y: 1220 },
  { id: "in_w1", x: 850, y: 1220 },
  { id: "in_w2", x: 1100, y: 1220 },
  { id: "in_w3", x: 1440, y: 1220 },
  { id: "in_w4", x: 1760, y: 1220 },
  { id: "in_e", x: 1980, y: 1220 },
  // South side of the main industrial halls
  { id: "is_w0", x: 600, y: 1620 },
  { id: "is_w1", x: 850, y: 1620 },
  { id: "is_w2", x: 1100, y: 1620 },
  { id: "is_w3", x: 1440, y: 1620 },
  { id: "is_w4", x: 1760, y: 1620 },
  { id: "is_e", x: 1950, y: 1620 },
  // Safe lanes at the west and east edges of the industrial block
  { id: "iv_w_m", x: 600, y: 1420 },
  { id: "iv_e_m", x: 1760, y: 1420 },
  // Main north-south boulevard
  { id: "c_south", x: 1950, y: 1760 },
  { id: "c_lower", x: 1950, y: 1620 },
  { id: "c_mid_s", x: 1980, y: 1500 },
  { id: "c_mid", x: 1980, y: 1380 },
  { id: "c_roundabout", x: 1995, y: 1250 },
  { id: "c_60", x: 1995, y: 1160 },
  { id: "c_45_mid", x: 1995, y: 900 },
  { id: "c_north", x: 1995, y: 740 },
  // Building 60 / 45 access road and east side lane
  { id: "e_60", x: 2360, y: 1160 },
  { id: "e_45_mid", x: 2360, y: 900 },
  { id: "e_45_north", x: 2360, y: 740 },
  // North campus loop around Buildings 147, 131, 103 and 104
  { id: "n_a", x: 1920, y: 650 },
  { id: "n_b", x: 1820, y: 610 },
  { id: "n_c", x: 1700, y: 640 },
  { id: "n_d", x: 1600, y: 720 },
  { id: "n_e", x: 1640, y: 820 },
  { id: "n_f", x: 1780, y: 900 },
  // South and east perimeter road
  { id: "s_w0", x: 220, y: 1750 },
  { id: "s_w1", x: 420, y: 1750 },
  { id: "s_1", x: 650, y: 1760 },
  { id: "s_2", x: 1100, y: 1760 },
  { id: "s_3", x: 1500, y: 1760 },
  { id: "s_4", x: 1950, y: 1760 },
  { id: "s_e1", x: 2180, y: 1740 },
  { id: "s_e2", x: 2350, y: 1680 },
  { id: "s_e3", x: 2470, y: 1560 },
  { id: "s_e4", x: 2520, y: 1360 },
  { id: "s_e5", x: 2480, y: 1200 },
];
const rawEdges = [
  // West approach
  ["w_gate", "w_curve_s"],
  ["w_curve_s", "w_curve_m"],
  ["w_curve_m", "w_curve_n"],
  ["w_curve_n", "in_w0"],
  ["w_gate", "s_w0"],
  // Industrial north road
  ["in_w0", "in_w1"],
  ["in_w1", "in_w2"],
  ["in_w2", "in_w3"],
  ["in_w3", "in_w4"],
  ["in_w4", "in_e"],
  // Industrial south road
  ["is_w0", "is_w1"],
  ["is_w1", "is_w2"],
  ["is_w2", "is_w3"],
  ["is_w3", "is_w4"],
  ["is_w4", "is_e"],
  // Side lanes around the industrial halls
  ["in_w0", "iv_w_m"],
  ["iv_w_m", "is_w0"],
  ["in_w4", "iv_e_m"],
  ["iv_e_m", "is_w4"],
  // Main boulevard
  ["in_e", "c_roundabout"],
  ["c_roundabout", "c_mid"],
  ["c_mid", "c_mid_s"],
  ["c_mid_s", "c_lower"],
  ["c_lower", "c_south"],
  ["is_e", "c_lower"],
  ["c_roundabout", "c_60"],
  ["c_60", "c_45_mid"],
  ["c_45_mid", "c_north"],
  // Building 60 / 45 loop
  ["c_60", "e_60"],
  ["e_60", "e_45_mid"],
  ["e_45_mid", "e_45_north"],
  ["e_45_north", "c_north"],
  ["e_60", "s_e5"],
  // North campus loop
  ["c_north", "n_a"],
  ["n_a", "n_b"],
  ["n_b", "n_c"],
  ["n_c", "n_d"],
  ["n_d", "n_e"],
  ["n_e", "n_f"],
  ["n_f", "c_45_mid"],
  // South and east perimeter
  ["s_w0", "s_w1"],
  ["s_w1", "s_1"],
  ["s_1", "s_2"],
  ["s_2", "s_3"],
  ["s_3", "s_4"],
  ["s_4", "s_e1"],
  ["s_e1", "s_e2"],
  ["s_e2", "s_e3"],
  ["s_e3", "s_e4"],
  ["s_e4", "s_e5"],
  ["s_1", "is_w0"],
  ["s_2", "is_w2"],
  ["s_4", "c_south"],
];
export const EDGES = rawEdges.map(([a, b]) => ({
  a,
  b,
  modes: ["pedestrian", "car", "truck", "forklift"],
}));
import { translate } from "./i18n.js";
const CATEGORY_LABEL = {
  industrial: "Industrial",
  social: "Social",
  auxiliary: "Auxiliary",
  gate: "Gate",
};
const MODE_LABEL = {
  pedestrian: "Walking",
  car: "Car",
  truck: "Truck",
  forklift: "Forklift",
};
export const getCategoryLabel = (category) => translate(CATEGORY_LABEL[category]);
export const getModeLabel = (mode) => translate(MODE_LABEL[mode]);
export const MODE_SPEED = {
  // meters per second (approximate)
  pedestrian: 1.3,
  car: 8,
  truck: 6,
  forklift: 3,
};
