// Generates feeds, sitemap, robots, and security headers after the static export.
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import nextEnv from "@next/env";
import { readPost } from "../src/lib/post-source.mjs";
import { getSiteUrl } from "../src/lib/site-url.mjs";

nextEnv.loadEnvConfig(process.cwd());
const SITE = getSiteUrl(true);
const ROOT = process.cwd();
const OUT = path.join(ROOT, "out");
const POSTS_DIR = path.join(ROOT, "content", "posts");

if (!fs.existsSync(OUT)) {
  console.error("postbuild: out/ not found, run `next build` first");
  process.exit(1);
}

const posts = fs
  .readdirSync(POSTS_DIR)
  .filter((f) => f.endsWith(".mdx"))
  .map((f) => readPost(f.replace(/\.mdx$/, "")))
  .filter(Boolean)
  .map((post) => post.data)
  .sort((a, b) => (a.date < b.date ? 1 : -1));

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const feedItems = posts
  .map(
    (p) => `    <item>
      <title>${esc(p.title)}</title>
      <link>${esc(`${SITE}/blog/${p.slug}`)}</link>
      <guid>${esc(`${SITE}/blog/${p.slug}`)}</guid>
      <pubDate>${esc(new Date(`${p.date}T00:00:00Z`).toUTCString())}</pubDate>
      <description>${esc(p.description ?? "")}</description>
    </item>`
  )
  .join("\n");

const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Ayush Rai</title>
    <link>${esc(SITE)}</link>
    <description>Essays and notes by Ayush Rai.</description>
    <language>en</language>
${feedItems}
  </channel>
</rss>
`;

const staticRoutes = ["", "/blog"];
const urls = [
  ...staticRoutes.map((r) => `  <url><loc>${esc(`${SITE}${r}`)}</loc></url>`),
  ...posts.map(
    (p) => `  <url><loc>${esc(`${SITE}/blog/${p.slug}`)}</loc><lastmod>${esc(p.date)}</lastmod></url>`
  ),
].join("\n");

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

// Read all pages, including 404, so direct loads and error pages share one policy.
const hashes = new Set();
for (const name of fs.readdirSync(OUT, { recursive: true })) {
  if (!name.endsWith(".html")) continue;
  const html = fs.readFileSync(path.join(OUT, name), "utf8");
  for (const [, attributes, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!/\bsrc\s*=/i.test(attributes) && body) {
      hashes.add(`'sha256-${createHash("sha256").update(body).digest("base64")}'`);
    }
  }
}
if (!hashes.size) throw new Error("postbuild: no inline scripts found; check the exported HTML");
const csp = `default-src 'self'; script-src 'self' ${[...hashes].sort().join(" ")}; connect-src 'self' https://api.github.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'`;
const cspLine = `  Content-Security-Policy: ${csp}`;
// ponytail: one policy for this small site. Use per-page policies if hashes outgrow the host's 2000-character line limit.
if (cspLine.length > 2000) throw new Error("postbuild: CSP exceeds the host's 2000-character header line limit; use per-page policies");
const headers = fs.readFileSync(path.join(ROOT, "public", "_headers"), "utf8");
fs.writeFileSync(path.join(OUT, "_headers"), `${headers}  Content-Security-Policy: ${csp}\n`);
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(path.join(OUT, "feed.xml"), feed);
fs.writeFileSync(path.join(OUT, "sitemap.xml"), sitemap);
console.log(`postbuild: wrote feed.xml, sitemap.xml, robots.txt, and security headers (${posts.length} posts, site ${SITE})`);
