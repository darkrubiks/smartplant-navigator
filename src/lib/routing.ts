// Client-side routing over the plant street-centerline graph.
// Origins and destinations are projected onto routable street segments before
// Dijkstra runs, so the rendered path never draws straight shortcuts through
// building footprints.
import { translate, getLanguage, getLocale, type Language } from "./i18n";

import {
  EDGES,
  METERS_PER_UNIT,
  MODE_SPEED,
  WAYPOINTS,
  type Edge,
  type TransportMode,
} from "./plant";

export type Point = { x: number; y: number };
export type Block = { x: number; y: number; radius: number };

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
export const pxDistance = dist;

const isBlocked = (p: Point, blocks: Block[]) => blocks.some((b) => dist(p, b) < b.radius);

const isEdgeBlocked = (a: Point, b: Point, blocks: Block[]) => {
  const steps = Math.max(2, Math.ceil(dist(a, b) / 25));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    if (isBlocked(p, blocks)) return true;
  }
  return false;
};

type RoutableEdge = {
  aId: string;
  bId: string;
  a: Point;
  b: Point;
};

type StreetProjection = {
  edge: RoutableEdge;
  point: Point;
  t: number;
  distance: number;
};

function nearestStreetProjection(
  point: Point,
  edges: RoutableEdge[],
  blocks: Block[],
): StreetProjection {
  let best: StreetProjection | null = null;
  for (const edge of edges) {
    const projection = projectOnSegment(edge.a, edge.b, point);
    if (isBlocked(projection.point, blocks)) continue;
    if (!best || projection.distance < best.distance) {
      best = { edge, ...projection };
    }
  }

  // The permanent graph always has edges. This fallback is defensive for a
  // future transport mode that may intentionally disable every corridor.
  if (!best) {
    const edge = edges[0];
    const projection = projectOnSegment(edge.a, edge.b, point);
    return { edge, ...projection };
  }
  return best;
}

export function findRoute(
  origin: Point,
  destination: Point,
  mode: TransportMode,
  blocks: Block[] = [],
): { path: Point[]; distance: number; etaSeconds: number } {
  const wpById = new Map(WAYPOINTS.map((w) => [w.id, w]));
  const pointsById = new Map<string, Point>(WAYPOINTS.map((w) => [w.id, w]));
  const adj = new Map<string, Array<{ to: string; w: number }>>();
  const routableEdges: RoutableEdge[] = [];

  for (const wp of WAYPOINTS) adj.set(wp.id, []);
  for (const edge of EDGES as Edge[]) {
    if (!edge.modes.includes(mode)) continue;
    const a = wpById.get(edge.a)!;
    const b = wpById.get(edge.b)!;
    if (isEdgeBlocked(a, b, blocks)) continue;
    const weight = dist(a, b);
    adj.get(a.id)!.push({ to: b.id, w: weight });
    adj.get(b.id)!.push({ to: a.id, w: weight });
    routableEdges.push({ aId: a.id, bId: b.id, a, b });
  }

  if (!routableEdges.length) {
    // Blocks represent temporary closures. If every segment is blocked, use
    // the permanent street graph rather than drawing an off-road shortcut.
    if (blocks.length) return findRoute(origin, destination, mode);
    return { path: [origin], distance: 0, etaSeconds: 0 };
  }

  const start = nearestStreetProjection(origin, routableEdges, blocks);
  const goal = nearestStreetProjection(destination, routableEdges, blocks);
  const startId = "__route_start__";
  const goalId = "__route_goal__";

  pointsById.set(startId, start.point);
  pointsById.set(goalId, goal.point);
  adj.set(startId, []);
  adj.set(goalId, []);

  const connect = (from: string, to: string, weight: number) => {
    adj.get(from)!.push({ to, w: weight });
    adj.get(to)!.push({ to: from, w: weight });
  };

  connect(startId, start.edge.aId, dist(start.point, start.edge.a));
  connect(startId, start.edge.bId, dist(start.point, start.edge.b));
  connect(goalId, goal.edge.aId, dist(goal.point, goal.edge.a));
  connect(goalId, goal.edge.bId, dist(goal.point, goal.edge.b));

  // Two locations on the same uninterrupted street can be joined directly.
  const sameEdge = start.edge.aId === goal.edge.aId && start.edge.bId === goal.edge.bId;
  if (sameEdge) connect(startId, goalId, dist(start.point, goal.point));

  // Dijkstra with a binary min-heap: O(E log V).
  const dists = new Map<string, number>();
  const prev = new Map<string, string | null>();
  for (const id of adj.keys()) {
    dists.set(id, Infinity);
    prev.set(id, null);
  }
  dists.set(startId, 0);

  const heap: Array<{ id: string; d: number }> = [{ id: startId, d: 0 }];
  const push = (item: { id: string; d: number }) => {
    heap.push(item);
    let i = heap.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent].d <= heap[i].d) break;
      [heap[parent], heap[i]] = [heap[i], heap[parent]];
      i = parent;
    }
  };
  const pop = () => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;
        if (left < heap.length && heap[left].d < heap[smallest].d) smallest = left;
        if (right < heap.length && heap[right].d < heap[smallest].d) smallest = right;
        if (smallest === i) break;
        [heap[smallest], heap[i]] = [heap[i], heap[smallest]];
        i = smallest;
      }
    }
    return top;
  };

  const visited = new Set<string>();
  while (heap.length) {
    const { id: currentId, d: currentDistance } = pop();
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    if (currentId === goalId) break;
    for (const { to, w } of adj.get(currentId) ?? []) {
      const alternative = currentDistance + w;
      if (alternative < (dists.get(to) ?? Infinity)) {
        dists.set(to, alternative);
        prev.set(to, currentId);
        push({ id: to, d: alternative });
      }
    }
  }

  if (!Number.isFinite(dists.get(goalId))) {
    if (blocks.length) return findRoute(origin, destination, mode);
    return { path: [start.point], distance: 0, etaSeconds: 0 };
  }

  const streetPath: Point[] = [];
  let current: string | null = goalId;
  while (current) {
    const point = pointsById.get(current)!;
    streetPath.unshift({ x: point.x, y: point.y });
    current = prev.get(current) ?? null;
  }

  // Virtual nodes can coincide with graph vertices. Removing zero-length
  // duplicates keeps turn instructions and route rendering clean.
  const path = streetPath.filter(
    (point, index) => index === 0 || dist(point, streetPath[index - 1]) > 0.01,
  );

  let distanceUnits = 0;
  for (let i = 1; i < path.length; i++) {
    distanceUnits += dist(path[i - 1], path[i]);
  }
  const meters = Math.round(distanceUnits * METERS_PER_UNIT);
  const etaSeconds = Math.round(meters / MODE_SPEED[mode]);
  return { path, distance: meters, etaSeconds };
}

export function formatEta(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${h}h ${rem}m`;
}

export function formatDistance(meters: number, language: Language = getLanguage()) {
  if (meters < 1000) return `${new Intl.NumberFormat(getLocale(language)).format(meters)} m`;
  return `${new Intl.NumberFormat(getLocale(language), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(meters / 1000)} km`;
}

export function formatArrival(sec: number, language: Language = getLanguage()) {
  const d = new Date(Date.now() + sec * 1000);
  return d.toLocaleTimeString(getLocale(language), { hour: "numeric", minute: "2-digit" });
}

// Turn-by-turn instructions derived from bearing changes.
export type Turn = "left" | "right" | "straight" | "arrive";
export type Step = {
  turn: Turn;
  text: string;
  atIndex: number;
  distanceM: number;
};

const bearingDeg = (a: Point, b: Point) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;

export function buildSteps(path: Point[], language: Language = getLanguage()): Step[] {
  if (path.length < 2) return [];
  const steps: Step[] = [];
  let lastIdx = 0;
  const push = (turn: Turn, text: string, idx: number) => {
    let distanceUnits = 0;
    for (let k = lastIdx + 1; k <= idx; k++) {
      distanceUnits += dist(path[k - 1], path[k]);
    }
    steps.push({
      turn,
      text,
      atIndex: idx,
      distanceM: Math.round(distanceUnits * METERS_PER_UNIT),
    });
    lastIdx = idx;
  };

  push("straight", translate("Continue straight", {}, language), 0);
  for (let i = 1; i < path.length - 1; i++) {
    const incoming = bearingDeg(path[i - 1], path[i]);
    const outgoing = bearingDeg(path[i], path[i + 1]);
    let difference = outgoing - incoming;
    while (difference > 180) difference -= 360;
    while (difference < -180) difference += 360;
    if (Math.abs(difference) < 25) continue;
    // Map y increases downward, so a positive delta is a right turn.
    const turn: Turn = difference > 0 ? "right" : "left";
    push(turn, translate(turn === "right" ? "Turn right" : "Turn left", {}, language), i);
  }
  push("arrive", translate("You have arrived at your destination", {}, language), path.length - 1);
  return steps;
}

// Project point p onto segment ab and return the closest point, its parameter,
// and the distance from p.
export function projectOnSegment(a: Point, b: Point, p: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const point = { x: a.x + t * dx, y: a.y + t * dy };
  return { point, t, distance: dist(point, p) };
}

export function closestOnPath(path: Point[], p: Point) {
  let best = {
    point: path[0],
    segIndex: 0,
    t: 0,
    distance: Infinity,
  };
  for (let i = 1; i < path.length; i++) {
    const projection = projectOnSegment(path[i - 1], path[i], p);
    if (projection.distance < best.distance) {
      best = {
        point: projection.point,
        segIndex: i - 1,
        t: projection.t,
        distance: projection.distance,
      };
    }
  }
  return best;
}

export function remainingMeters(path: Point[], segIndex: number, t: number) {
  if (path.length < 2) return 0;
  const a = path[segIndex];
  const b = path[segIndex + 1] ?? path[segIndex];
  let distanceUnits = dist({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }, b);
  for (let i = segIndex + 1; i < path.length - 1; i++) {
    distanceUnits += dist(path[i], path[i + 1]);
  }
  return Math.round(distanceUnits * METERS_PER_UNIT);
}

export function metersToNextTurn(path: Point[], segIndex: number, t: number, turnAtIndex: number) {
  if (turnAtIndex <= segIndex) return 0;
  const a = path[segIndex];
  const b = path[segIndex + 1] ?? path[segIndex];
  let distanceUnits = dist({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }, b);
  for (let i = segIndex + 1; i < turnAtIndex; i++) {
    distanceUnits += dist(path[i], path[i + 1]);
  }
  return Math.round(distanceUnits * METERS_PER_UNIT);
}

export function bearingBetween(a: Point, b: Point) {
  return bearingDeg(a, b);
}
