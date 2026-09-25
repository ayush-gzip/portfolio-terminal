import fs from "node:fs";
import path from "node:path";
import { readPost } from "./post-source.mjs";

const POSTS_DIR = path.join(process.cwd(), "content", "posts");

export type PostMeta = {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  description: string;
  tags: string[];
  readingMinutes: number;
};

export type Post = { meta: PostMeta; content: string };

function parseFile(slug: string): Post | null {
  const post = readPost(slug);
  if (!post) return null;
  const { data, content } = post;
  const words = content.split(/\s+/).filter(Boolean).length;
  return {
    meta: {
      slug,
      title: String(data.title ?? slug),
      date: String(data.date ?? ""),
      description: String(data.description ?? ""),
      tags: Array.isArray(data.tags) ? data.tags.map(String) : [],
      readingMinutes: Math.max(1, Math.ceil(words / 220)),
    },
    content,
  };
}

export function getAllPosts(): PostMeta[] {
  return fs
    .readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => parseFile(f.replace(/\.mdx$/, "")))
    .filter((p): p is Post => p !== null)
    .map((p) => p.meta)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getPost(slug: string): Post | null {
  return parseFile(slug);
}
