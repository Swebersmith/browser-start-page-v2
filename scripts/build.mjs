import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

const OUT_DIR = "dist";

await rm(OUT_DIR, { recursive: true, force: true });
await mkdir(OUT_DIR, { recursive: true });

await cp("index.html", path.join(OUT_DIR, "index.html"));
await cp("styles.css", path.join(OUT_DIR, "styles.css"));
await cp("script.js", path.join(OUT_DIR, "script.js"));

for (const file of ["manifest.json", "sw.js"]) {
  try { await cp(file, path.join(OUT_DIR, file)); } catch { /* optional */ }
}

try { await cp("assets", path.join(OUT_DIR, "assets"), { recursive: true }); } catch { /* optional */ }

console.log("Build complete: dist/ ready.");
