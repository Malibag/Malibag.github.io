const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = 8744;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

http
  .createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split("?")[0]);
    if (urlPath.endsWith("/")) urlPath += "index.html";
    let filePath = path.join(root, urlPath);
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        if (!path.extname(filePath)) {
          fs.readFile(path.join(root, urlPath, "index.html"), (err2, data2) => {
            if (err2) {
              fs.readFile(path.join(root, "404.html"), (err3, data3) => {
                res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
                res.end(err3 ? "Not found" : data3);
              });
              return;
            }
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(data2);
          });
          return;
        }
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(port, () => console.log(`Serving ${root} at http://localhost:${port}/`));
