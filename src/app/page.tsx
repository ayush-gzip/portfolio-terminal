import fs from "node:fs";
import path from "node:path";
import { Terminal } from "@/components/Terminal";
import { getAllPosts, getPost } from "@/lib/posts";
import type { TermPost } from "@/lib/commands";

export default function Home() {
  const posts: TermPost[] = getAllPosts().flatMap((meta) => {
    const post = getPost(meta.slug);
    if (!post) return [];
    return [
      {
        slug: meta.slug,
        title: meta.title,
        date: meta.date,
        description: meta.description,
        readingMinutes: meta.readingMinutes,
        content: post.content,
      },
    ];
  });

  const readme = fs.readFileSync(path.join(process.cwd(), "content", "readme.md"), "utf8");

  return <Terminal posts={posts} readme={readme} />;
}
