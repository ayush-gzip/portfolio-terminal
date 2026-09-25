import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

// Shared by the static pages and postbuild; never accept third-party MDX.
export function readPost(slug) {
  if (typeof slug !== "string" || !/^[a-z0-9-]+$/.test(slug)) return null;
  const file = path.join(process.cwd(), "content", "posts", `${slug}.mdx`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "");
  // gray-matter's language option does NOT disable ---js engine selection.
  if (raw.startsWith("---") && !/^---[ \t]*(?:yaml|yml)?[ \t]*\r?\n/.test(raw)) {
    throw new Error(`${slug}: only YAML frontmatter is allowed`);
  }
  const { data, content } = matter(raw, { language: "yaml" });
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`${slug}: frontmatter must be a YAML mapping`);
  }
  if (data.draft) return null;
  // Require a string: YAML timestamps can silently normalize invalid dates.
  const date = data.date;
  const parsed = typeof date === "string" ? new Date(`${date}T00:00:00Z`) : new Date(NaN);
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error(`${slug}: date must be a valid quoted YYYY-MM-DD calendar date`);
  }
  return { data: { ...data, title: String(data.title ?? slug), description: String(data.description ?? ""),
    tags: Array.isArray(data.tags) ? data.tags.map(String) : [], date, slug }, content };
}
