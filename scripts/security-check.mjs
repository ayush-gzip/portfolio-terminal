import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { renderToStaticMarkup } from "react-dom/server";
import { compileMDX } from "next-mdx-remote/rsc";
import { safeHref } from "../src/lib/safe-href.mjs";
import { readPost } from "../src/lib/post-source.mjs";
import { getSiteUrl } from "../src/lib/site-url.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "portfolio-security-"));
const cwd = process.cwd();
const site = process.env.NEXT_PUBLIC_SITE_URL;
try {
  for (const url of ["//evil.invalid", "/\\evil.invalid", "\\\\evil.invalid", "/\t/evil.invalid", "/\n/evil.invalid", "javascript:alert(1)", "data:text/html,x", "https:evil.invalid", "", null]) {
    assert.equal(safeHref(url), "#", `blocked URL: ${JSON.stringify(url)}`);
  }
  for (const url of ["https://github.com/a", "HTTP://example.org", "mailto:a@example.org", "/blog", "./post", "../blog", "#section"]) {
    assert.equal(safeHref(` ${url} `), url);
  }

  delete process.env.NEXT_PUBLIC_SITE_URL;
  assert.equal(getSiteUrl(false), "http://localhost:3000");
  assert.throws(() => getSiteUrl(true), /NEXT_PUBLIC_SITE_URL/);
  for (const value of ["not-a-url", "javascript:alert(1)", "http://example.org", "https://user:pass@example.org", "https://example.org/blog", "https://example.org/?x=1", "https://example.org/#x"]) {
    process.env.NEXT_PUBLIC_SITE_URL = value;
    assert.throws(() => getSiteUrl(true), /NEXT_PUBLIC_SITE_URL/);
  }
  process.env.NEXT_PUBLIC_SITE_URL = "https://portfolio.invalid/";
  assert.equal(getSiteUrl(true), "https://portfolio.invalid");

  fs.mkdirSync(path.join(tmp, "content/posts"), { recursive: true });
  fs.mkdirSync(path.join(tmp, "out"));
  fs.mkdirSync(path.join(tmp, "public"));
  fs.copyFileSync(path.join(root, "public/_headers"), path.join(tmp, "public/_headers"));
  process.chdir(tmp);
  const source = (body) => fs.writeFileSync("content/posts/probe.mdx", body);
  const valid = '---\ntitle: "A & <B>"\ndate: "2024-02-29"\ndescription: "<img>&"\nslug: "../override"\n---\nHello';
  source(valid);
  assert.equal(readPost("probe").data.slug, "probe");
  assert.equal(readPost("probe").data.date, "2024-02-29");
  assert.equal(readPost("probe").content, "Hello");
  for (const slug of ["../probe", "/probe", "a&b", "UPPER", "a/b", "", "missing"]) assert.equal(readPost(slug), null);
  for (const engine of ["js", "javascript", "JS", "coffee", "coffeescript", "cson", "json", "__proto__", "constructor"]) {
    for (const bom of ["", "\uFEFF"]) {
      source(`${bom}---${engine}\n(globalThis.__frontmatterProbe = true, {title: "x"})\n---\nbody`);
      assert.throws(() => readPost("probe"), /only YAML/);
      assert.equal(globalThis.__frontmatterProbe, undefined);
    }
  }
  for (const opening of ["---", "---yaml", "--- yml"]) {
    source("\uFEFF" + valid.replace(/^---/, opening).replaceAll("\n", "\r\n"));
    assert.equal(readPost("probe").data.date, "2024-02-29");
  }
  for (const date of ['"2023-02-29"', '"2026-02-30"', '"2026-13-01"', '"2026-00-01"', '"<bad>&"', '""', "null", "2026-02-30"]) {
    source(valid.replace('"2024-02-29"', date));
    assert.throws(() => readPost("probe"), /valid.*calendar date/);
  }
  source("---\ndraft: true\n---\nDraft without date");
  assert.equal(readPost("probe"), null);
  source(valid);

  const inline = "self.__next_f=self.__next_f||[];";
  fs.writeFileSync("out/index.html", `<html><script>${inline}</script></html>`);
  const run = (env = {}) => spawnSync(process.execPath, [path.join(root, "scripts/postbuild.mjs")], {
    cwd: tmp, env: { ...process.env, NEXT_PUBLIC_SITE_URL: "https://portfolio.invalid", ...env }, encoding: "utf8",
  });
  const built = run();
  assert.equal(built.status, 0, built.stderr);
  const feed = fs.readFileSync("out/feed.xml", "utf8");
  const sitemap = fs.readFileSync("out/sitemap.xml", "utf8");
  assert.match(feed, /A &amp; &lt;B&gt;/);
  assert.match(feed, /&lt;img&gt;&amp;/);
  assert.match(feed, /Thu, 29 Feb 2024 00:00:00 GMT/);
  assert.match(sitemap, /https:\/\/portfolio.invalid\/blog\/probe/);
  assert.doesNotMatch(feed + sitemap, /override|Invalid Date|example.com/);
  const headers = fs.readFileSync("out/_headers", "utf8");
  const hash = createHash("sha256").update(inline).digest("base64");
  assert.ok(headers.includes(`'sha256-${hash}'`));
  assert.doesNotMatch(headers.match(/script-src[^;]+/)[0], /unsafe-inline|unsafe-eval/);
  assert.ok(headers.split("\n").every((line) => line.length <= 2000));
  assert.match(fs.readFileSync("out/robots.txt", "utf8"), /Sitemap: https:\/\/portfolio.invalid\/sitemap.xml/);
  assert.notEqual(run({ NEXT_PUBLIC_SITE_URL: "" }).status, 0);
  source(valid.replace('"2024-02-29"', '"2026-02-30"'));
  assert.notEqual(run().status, 0);
  source('---js\n(globalThis.__frontmatterProbe=true,{})\n---\nbody');
  assert.notEqual(run().status, 0);
  source(valid);
  fs.writeFileSync("out/index.html", Array.from({ length: 50 }, (_, i) => `<script>self.probe=${i}</script>`).join(""));
  const oversized = run();
  assert.notEqual(oversized.status, 0);
  assert.match(oversized.stderr, /2000-character/);

  const mdx = await compileMDX({ source: '# Safe\n\n{globalThis.__mdxProbe = "executed"}' });
  assert.match(renderToStaticMarkup(mdx.content), /Safe/);
  assert.equal(globalThis.__mdxProbe, undefined);
  console.log("Security checks passed: links, YAML engines, slugs, dates, site URL, XML, CSP generation, and MDX defaults.");
} finally {
  process.chdir(cwd);
  if (site === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = site;
  fs.rmSync(tmp, { recursive: true, force: true });
}
