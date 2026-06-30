import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { build } from "esbuild";
import sharp from "sharp";

const PRETTY_JS = "script.js";
const PRETTY_CSS = "styles.css";
const HTML_SRC = "index.html";
const ASSETS_DIR = "assets";
const OUT_DIR = "dist";
const MANIFEST_SRC = "manifest.json";
const SW_SRC = "sw.js";

await rm(OUT_DIR, { recursive: true, force: true });
await mkdir(OUT_DIR, { recursive: true });

// 1. Minify JS and CSS with esbuild
for (const entry of [PRETTY_JS, PRETTY_CSS]) {
  const ext = entry.endsWith(".js") ? "js" : "css";
  const result = await build({
    entryPoints: [entry],
    bundle: false,
    minify: true,
    write: false,
    outdir: OUT_DIR,
  });

  const content = result.outputFiles[0].text;
  const hash = hashBytes(content, 10);
  const filename = `${path.parse(entry).name}.${hash}.${ext}`;
  await writeFile(path.join(OUT_DIR, filename), content, "utf-8");

  // Store mapping for HTML rewrite
  if (!globalThis._hashes) globalThis._hashes = {};
  globalThis._hashes[entry] = filename;
}

// 2. Convert PNG/JPG to WebP, copy originals as fallback
const sourceFiles = [];
async function collectAssets(dir) {
  const entries = await (await import("node:fs/promises")).readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectAssets(full);
    } else if (/\.(png|jpe?g)$/i.test(entry.name)) {
      sourceFiles.push(full);
    }
  }
}

await collectAssets(ASSETS_DIR);

// Copy all assets first
await cp(ASSETS_DIR, path.join(OUT_DIR, ASSETS_DIR), { recursive: true });

// Now generate WebP versions
for (const source of sourceFiles) {
  const ext = path.extname(source);
  const nameWithoutExt = source.slice(0, -ext.length);
  const webpDest = path.join(OUT_DIR, nameWithoutExt + ".webp");

  try {
    await sharp(source)
      .webp({ quality: 82 })
      .toFile(webpDest);
    console.log(`  WebP: ${path.relative(".", webpDest)}`);
  } catch (err) {
    console.warn(`  Skipping ${source}: ${err.message}`);
  }
}

// 3. Copy PWA files
for (const file of [MANIFEST_SRC, SW_SRC]) {
  try {
    await cp(file, path.join(OUT_DIR, file));
  } catch {
    // optional files
  }
}

// 4. Rewrite HTML with hashed filenames
let html = await readFile(HTML_SRC, "utf-8");
html = html.replace('src="./script.js"', `src="./${globalThis._hashes[PRETTY_JS]}"`);
html = html.replace('href="./styles.css"', `href="./${globalThis._hashes[PRETTY_CSS]}"`);
await writeFile(path.join(OUT_DIR, HTML_SRC), html, "utf-8");

console.log("Build complete.");

function hashBytes(content, length) {
  return createHash("sha256").update(content).digest("hex").slice(0, length);
}
