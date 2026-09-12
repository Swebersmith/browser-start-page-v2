import { cp, mkdir, readFile, rm, stat } from "node:fs/promises";
import { dirname, join } from "node:path";

const files = ["index.html", "styles.css", "script.js", "README.md", "sw.js"];

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

for (const file of files) {
  await cp(file, `dist/${file}`);
}

/*
 * assets/ 里还留着制作头像用的原始大图（header_*.png、custom/*.jpg，合计约 3MB），
 * 它们不会被页面加载，全量复制进 dist 只会让每次部署白白多传这些文件。
 * 这里改成扫描页面实际引用到的资源，按需复制。
 */
const sources = ["index.html", "styles.css", "script.js"];
const referenced = new Set();

for (const file of sources) {
  const text = await readFile(file, "utf8");
  for (const match of text.matchAll(/["'(]\.?\/?(assets\/[\w./-]+)["')]/g)) {
    referenced.add(match[1]);
  }
}

let copied = 0;
for (const path of [...referenced].sort()) {
  try {
    await stat(path);
  } catch {
    console.warn(`skip missing asset: ${path}`);
    continue;
  }
  const target = join("dist", path);
  await mkdir(dirname(target), { recursive: true });
  await cp(path, target);
  copied += 1;
}

console.log(`assets: copied ${copied}/${referenced.size} referenced file(s)`);
