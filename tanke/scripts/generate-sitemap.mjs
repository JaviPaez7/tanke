import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { allSitemapPaths, renderSitemapXml } from "../seo/html.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, "..", "public", "sitemap.xml");
const xml = renderSitemapXml(allSitemapPaths());
writeFileSync(out, xml);
console.log(`Wrote ${out} (${allSitemapPaths().length} urls)`);
