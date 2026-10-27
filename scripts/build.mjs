import { cp, mkdir, readFile, writeFile, rm, lstat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseBuildings } from "../assets/csv.js";

// Only these public files are published. Private environment/configuration is excluded.
const buildings = parseBuildings(
  await readFile(new URL("../data/buildings.csv", import.meta.url), "utf8"),
);
const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.resolve(root, "dist");
if (path.dirname(output) !== path.resolve(root) || path.basename(output) !== "dist")
  throw new Error("Unsafe output path.");
if ((await lstat(output).catch(() => null))?.isSymbolicLink())
  throw new Error("Refusing to clean a symlinked dist directory.");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(path.join(root, "index.html"), path.join(output, "index.html"));
await cp(path.join(root, "assets"), path.join(output, "assets"), { recursive: true });
await cp(path.join(root, "data"), path.join(output, "data"), { recursive: true });
await writeFile(path.join(output, ".nojekyll"), "");
console.log(
  `Static page ready in dist/ with ${buildings.length} validated buildings. No bundler or backend required.`,
);
