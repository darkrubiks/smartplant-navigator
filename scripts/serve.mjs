import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const port = Number(args[args.indexOf("--port") + 1]) || 4173;
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : "/";
const directory = path.resolve(args.includes("--dist") ? "dist" : ".");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
};
export const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (!pathname.startsWith(base)) {
      response.writeHead(404).end("Not found");
      return;
    }
    const relative = pathname.slice(base.length) || "index.html";
    if (relative.includes("\\") || relative.split("/").some((part) => part.startsWith("."))) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    // The local server exposes the same public files as the deployment.
    if (
      relative !== "index.html" &&
      !relative.startsWith("assets/") &&
      !relative.startsWith("data/")
    ) {
      response.writeHead(404).end("Not found");
      return;
    }
    const file = path.resolve(directory, relative);
    if (!file.startsWith(directory + path.sep)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const contents = await readFile(file);
    response
      .writeHead(200, {
        "Content-Type": types[path.extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
      })
      .end(contents);
  } catch {
    response.writeHead(404).end("Not found");
  }
});
server.listen(port, "127.0.0.1", () => console.log(`Local: http://127.0.0.1:${port}${base}`));
