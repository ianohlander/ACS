import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = normalize(process.cwd());
const port = Number(process.env.PORT ?? 4173);
const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".map", "application/json; charset=utf-8"]
]);

createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const requestPath = url.pathname === "/" ? "apps/web/index.html" : url.pathname.replace(/^\/+/, "");
  const localPath = normalize(join(root, requestPath));

  if (!localPath.startsWith(root) || !existsSync(localPath) || statSync(localPath).isDirectory()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, { "Content-Type": mimeTypes.get(extname(localPath)) ?? "application/octet-stream" });
  createReadStream(localPath).pipe(response);
}).listen(port, () => {
  console.log(`ACS demo server running at http://localhost:${port}/`);
});
