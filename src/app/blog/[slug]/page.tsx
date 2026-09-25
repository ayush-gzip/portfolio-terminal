import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";
import { getAllPosts, getPost } from "@/lib/posts";

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllPosts().map(({ slug }) => ({ slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.meta.title,
    description: post.meta.description,
    openGraph: {
      title: post.meta.title,
      description: post.meta.description,
      type: "article",
      publishedTime: post.meta.date,
      images: [{ url: "/og.png", width: 1200, height: 630 }],
    },
  };
}

export default async function PostPage({ params }: Params) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  return (
    <div className="reader min-h-dvh">
      <article className="mx-auto max-w-2xl px-6 py-10 sm:px-8">
        <div className="mb-6 flex items-center justify-between text-sm">
          <Link href="/blog" className="tx-link">← all posts</Link>
          <Link href={`/?cmd=blog%20${post.meta.slug}`} className="tx-link">open in terminal ↗</Link>
        </div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-accent)" }}>
          {post.meta.title}
        </h1>
        <p className="mt-2 text-xs" style={{ color: "var(--color-muted)" }}>
          {formatDate(post.meta.date)} · {post.meta.readingMinutes} min read
        </p>
        <div className="prose prose-invert mt-8 max-w-none prose-a:text-[var(--color-accent)]">
          {/* Trusted, author-reviewed posts only. Never compile third-party MDX here. */}
          <MDXRemote
            source={post.content}
            options={{
              mdxOptions: {
                remarkPlugins: [remarkGfm],
                rehypePlugins: [[rehypePrettyCode, { theme: "github-dark" }]],
              },
            }}
          />
        </div>
      </article>
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
