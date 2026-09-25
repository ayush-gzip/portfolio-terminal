import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/posts";

export const metadata: Metadata = {
  title: "Posts",
  description: "Essays and notes by Ayush Rai.",
};

export default function BlogIndex() {
  const posts = getAllPosts();
  return (
    <div className="reader min-h-dvh">
      <div className="mx-auto max-w-2xl px-6 py-10 sm:px-8">
        <div className="mb-6 text-sm">
          <Link href="/" className="tx-link">← back to terminal</Link>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-accent)" }}>
          ~/blog
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--color-muted)" }}>
          Essays and notes by Ayush Rai.
        </p>
        <ul className="mt-8 space-y-6">
          {posts.map((p) => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`} className="group block">
                <h2 className="text-lg font-bold group-hover:underline" style={{ color: "var(--color-ink)" }}>
                  {p.title}
                </h2>
                <p className="mt-1 text-xs" style={{ color: "var(--color-muted)" }}>
                  {formatDate(p.date)} · {p.readingMinutes} min read
                </p>
                <p className="mt-1.5 text-sm" style={{ color: "var(--color-ink)" }}>{p.description}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
