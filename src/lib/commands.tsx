import type { ReactNode } from "react";
import { profile } from "./profile";
import { safeHref } from "./safe-href.mjs";
import { SpaceGame } from "./SpaceGame";

export type ThemeName =
  | "green"
  | "amber"
  | "matrix"
  | "mocha"
  | "macchiato"
  | "frappe"
  | "latte";
export const THEMES: ThemeName[] = ["green", "amber", "matrix", "mocha", "macchiato", "frappe", "latte"];

export type TermPost = {
  slug: string;
  title: string;
  date: string;
  description: string;
  readingMinutes: number;
  content: string;
};

export type CommandCtx = {
  args: string[];
  raw: string;
  posts: TermPost[];
  readme: string;
  history: string[];
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
  clear: () => void;
  /** easter egg: "log out" to the Matrix/tty screen */
  exit: () => void;
  /** show a one-shot numbered menu; the returned node is the rendered menu */
  menu: (items: MenuItem[]) => ReactNode;
};

export type MenuItem = {
  key: string;
  label: string;
  run: () => ReactNode | void | Promise<ReactNode | void>;
};

export type Command = {
  name: string;
  desc: string;
  usage?: string;
  hidden?: boolean;
  run: (ctx: CommandCtx) => ReactNode | void | Promise<ReactNode | void>;
};

const RESUME_PDF = "/resume/Ayush_Rai_Resume.pdf";

/* ------------------------------------------------------------------ */
/* markdown -> terminal renderer (best-effort; full render at /blog)   */
/* ------------------------------------------------------------------ */

// ponytail: best-effort inline markdown. Emphasis is naive (a lone `*` in prose
// can italicize; nested */** garbles) - full CommonMark render lives at /blog.
function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // link URL allows one level of balanced parens (Wikipedia/MSDN-style URLs)
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(((?:[^()]|\([^()]*\))*)\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) nodes.push(<b key={k++} className="tx-bright">{m[2]}</b>);
    else if (m[4] !== undefined) nodes.push(<i key={k++}>{m[4]}</i>);
    else if (m[6] !== undefined) nodes.push(<code key={k++} className="tx-accent">{m[6]}</code>);
    else if (m[8] !== undefined) {
      const href = safeHref(m[9]);
      nodes.push(
        <a
          key={k++}
          className="tx-link"
          href={href}
          target={/^https?:/i.test(href) ? "_blank" : undefined}
          rel="noreferrer"
        >
          {m[8]}
        </a>
      );
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

/* ------------------------------------------------------------------ */
/* code-fence syntax highlighting (client-side, theme-aware, no deps)   */
/* ------------------------------------------------------------------ */

// superset of keywords across ts/js/py/rust/go/bash; language-agnostic on purpose
const HL_KEYWORDS = new Set(
  ("const let var function return if else for while do switch case break continue new class " +
    "extends implements import export from default async await try catch finally throw delete " +
    "typeof instanceof in of void yield this super null undefined true false type interface enum " +
    "namespace public private protected readonly static abstract get set as is keyof infer def " +
    "lambda pass elif print none and or not with fn pub use mut impl struct match where module " +
    "require package func go defer chan")
    .split(/\s+/)
);

// priority order: comment | string | number | identifier | whitespace | punctuation-run | other.
// # is NOT treated as a comment (would wreck CSS #fff / TS #private); // and /* */ only.
const HL_RE =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d[\w.]*\b)|([A-Za-z_$][\w$]*)|(\s+)|([^\w$\s'"`]+)|([\s\S])/g;

// ponytail: regex tokenizer, not a real grammar. Good enough for terminal code
// blocks; the shiki-rendered full version lives at each post's /blog URL.
export function highlightCode(code: string): ReactNode[] {
  const out: ReactNode[] = [];
  let m: RegExpExecArray | null;
  let k = 0;
  HL_RE.lastIndex = 0;
  while ((m = HL_RE.exec(code)) !== null) {
    if (m[1] !== undefined) out.push(<span key={k++} className="hl-comment">{m[1]}</span>);
    else if (m[2] !== undefined) out.push(<span key={k++} className="hl-string">{m[2]}</span>);
    else if (m[3] !== undefined) out.push(<span key={k++} className="hl-number">{m[3]}</span>);
    else if (m[4] !== undefined) {
      const id = m[4];
      if (HL_KEYWORDS.has(id)) out.push(<span key={k++} className="hl-keyword">{id}</span>);
      else if (code[HL_RE.lastIndex] === "(") out.push(<span key={k++} className="hl-func">{id}</span>);
      else if (/^[A-Z]/.test(id)) out.push(<span key={k++} className="hl-type">{id}</span>);
      else out.push(id);
    } else out.push(m[0]); // whitespace / punctuation / stray char: verbatim
  }
  return out;
}

export function renderMarkdown(src: string): ReactNode {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.trimStart().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      out.push(
        <pre
          key={k++}
          className="mono-block my-2 border-l-2 pl-3"
          style={{ borderColor: "var(--term-dim)" }}
        >
          {lang ? <span className="tx-dim">{`// ${lang}\n`}</span> : null}
          {highlightCode(buf.join("\n"))}
        </pre>
      );
      continue;
    }

    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      out.push(
        <div key={k++} className="mt-3 mb-1 font-bold tx-bright">
          <span className="tx-dim">{"#".repeat(h[1].length) + " "}</span>
          {renderInline(h[2])}
        </div>
      );
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push(
        <div
          key={k++}
          className="my-2 border-l-2 pl-3 italic tx-dim"
          style={{ borderColor: "var(--term-accent)" }}
        >
          {renderInline(buf.join(" "))}
        </div>
      );
      continue;
    }

    if (line.trim().startsWith("|")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        buf.push(lines[i]);
        i++;
      }
      out.push(
        <pre key={k++} className="mono-block my-2">
          {buf.join("\n")}
        </pre>
      );
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      out.push(
        <ul key={k++} className="my-1">
          {items.map((it, j) => (
            <li key={j}>
              <span className="tx-accent">- </span>
              {renderInline(it)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      out.push(
        <ol key={k++} className="my-1">
          {items.map((it, j) => (
            <li key={j}>
              <span className="tx-accent">{j + 1}. </span>
              {renderInline(it)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    const img = /^!\[([^\]]*)\]\(([^)]+)\)/.exec(line.trim());
    if (img) {
      out.push(
        <div key={k++} className="my-1 tx-dim">{`[image: ${img[1] || "untitled"} -> ${img[2]}]`}</div>
      );
      i++;
      continue;
    }

    if (line.trim() === "") {
      out.push(<div key={k++} className="h-2" />);
      i++;
      continue;
    }

    out.push(
      <div key={k++} className="my-1">
        {renderInline(line)}
      </div>
    );
    i++;
  }
  return <div>{out}</div>;
}

/* ------------------------------------------------------------------ */
/* github fetch (mirrors the OS build's GitHubApp)                     */
/* ------------------------------------------------------------------ */

type GhUser = { login: string; name: string | null; bio: string | null; followers: number; following: number; public_repos: number };
type GhRepo = { name: string; description: string | null; language: string | null; stargazers_count: number; html_url: string; fork: boolean };
type GhData = { user: GhUser; repos: GhRepo[] };

let ghCache: GhData | null = null;

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5", Go: "#00ADD8",
  Rust: "#dea584", Java: "#b07219", Lua: "#000080", CSS: "#563d7c", HTML: "#e34c26",
  Shell: "#89e051", C: "#555555", "C++": "#f34b7d", Kotlin: "#A97BFF", Swift: "#F05138",
};

async function fetchGitHub(): Promise<GhData | null> {
  if (ghCache) return ghCache;
  try {
    const [u, r] = await Promise.all([
      fetch(`https://api.github.com/users/${profile.githubUsername}`),
      fetch(`https://api.github.com/users/${profile.githubUsername}/repos?per_page=100&sort=pushed`),
    ]);
    if (!u.ok || !r.ok) throw new Error("github api unavailable");
    const user: GhUser = await u.json();
    const repos = ((await r.json()) as GhRepo[]).filter((x) => !x.fork).slice(0, 6);
    ghCache = { user, repos };
    return ghCache;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* small view helpers                                                  */
/* ------------------------------------------------------------------ */

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="tx-accent">{label}</span>
      <span className="tx-dim">: </span>
      <span>{children}</span>
    </div>
  );
}

function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="tx-link" href={safeHref(href)} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

// cloud-glitch sigil: a geometric mark, drawn in the block-glyph-safe --font-art
const ASCII = `      ▄▟▛▀▀▜▙▄
    ▄▟▛ ░▒▓▒░ ▜▙▄
   ▐█  ▓▒░▒▓  █▌
   ▐█  ░▒▓▒░  █▌
    ▀▜▙ ▓▒░▒▓ ▟▛▀
      ▀▜▙▄▄▟▛▀`;

/* ------------------------------------------------------------------ */
/* menu targets: summary renderers + external-open action             */
/* ------------------------------------------------------------------ */

function openExt(url: string, host: string): ReactNode {
  window.open(url, "_blank", "noreferrer"); // called from a click/keypress, so no popup block
  return <span className="tx-dim">↗ opening {host} …</span>;
}

function resumeSummary(): ReactNode {
  return (
    <div>
      <div className="tx-bright font-bold">{profile.name} — Resume</div>
      <div className="tx-dim mb-2">{profile.headline} · {profile.location}</div>
      <div className="tx-accent font-bold mt-2">EXPERIENCE</div>
      {profile.experience.map((e) => (
        <div key={`${e.role}-${e.company}`} className="mb-1">
          <div>
            <span className="tx-bright">{e.role}</span>
            <span className="tx-dim"> — {e.company}</span>
          </div>
          <div className="tx-dim text-[13px]">{e.period}</div>
          <div className="text-[13px]">{e.summary}</div>
        </div>
      ))}
      <div className="tx-accent font-bold mt-2">EDUCATION</div>
      {profile.education.map((e) => (
        <div key={e.school} className="text-[13px]">
          <span className="tx-bright">{e.school}</span>
          <span className="tx-dim"> — {e.degree} ({e.period})</span>
        </div>
      ))}
    </div>
  );
}

function linkedinSummary(): ReactNode {
  return (
    <div>
      <div className="tx-bright font-bold">{profile.name}</div>
      <div>{profile.headline}</div>
      <div className="tx-dim mb-1">{profile.location}</div>
      <div className="tx-accent font-bold mt-2">Experience</div>
      {profile.experience.map((e) => (
        <div key={`${e.role}-${e.company}`} className="mb-1">
          <div>
            <span className="tx-bright">{e.role}</span>
            <span className="tx-dim"> · {e.company} · {e.period}</span>
          </div>
          <div className="text-[13px]">{e.summary}</div>
        </div>
      ))}
      <div className="tx-accent font-bold mt-2">Education</div>
      {profile.education.map((e) => (
        <div key={e.school} className="text-[13px]">
          <span className="tx-bright">{e.school}</span>
          <span className="tx-dim"> · {e.degree} · {e.period}</span>
        </div>
      ))}
    </div>
  );
}

async function githubSummary(): Promise<ReactNode> {
  const data = await fetchGitHub();
  const stats = data
    ? { repos: data.user.public_repos, followers: data.user.followers, following: data.user.following }
    : profile.githubStats;
  const repos = data
    ? data.repos.map((r) => ({ name: r.name, description: r.description ?? "", language: r.language, stars: r.stargazers_count, href: r.html_url }))
    : profile.fallbackRepos.map((r) => ({ ...r, href: `${profile.githubUrl}/${r.name}` }));
  return (
    <div>
      {!data && <div className="tx-warn mb-1">github.com unreachable - showing a saved snapshot.</div>}
      <div>
        <span className="tx-bright font-bold">{data?.user.name ?? profile.name}</span>
        <span className="tx-dim"> @{data?.user.login ?? profile.githubUsername}</span>
      </div>
      <div className="tx-dim mb-1">
        {stats.repos} repos · {stats.followers} follower{stats.followers === 1 ? "" : "s"} · {stats.following} following
      </div>
      {repos.map((r) => (
        <div key={r.name} className="mb-1">
          <span className="tx-accent">{"● "}</span>
          <Ext href={r.href}>{r.name}</Ext>
          {r.language && (
            <span className="tx-dim">
              {"  "}
              <span className="inline-block h-2 w-2 rounded-full align-middle" style={{ background: LANG_COLORS[r.language] ?? "#8b8b8b" }} />{" "}
              {r.language}
            </span>
          )}
          {r.stars > 0 && <span className="tx-dim"> · ★ {r.stars}</span>}
          {r.description && <div className="tx-dim text-[13px] pl-4">{r.description}</div>}
        </div>
      ))}
      <div className="mt-1">
        <Ext href={profile.githubUrl}>{`↗ github.com/${data?.user.login ?? profile.githubUsername}`}</Ext>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* commands                                                            */
/* ------------------------------------------------------------------ */

export const COMMANDS: Command[] = [
  {
    name: "help",
    desc: "list available commands",
    run: () => (
      <div>
        <div className="tx-dim mb-1">Available commands (Tab to autocomplete, ↑/↓ for history):</div>
        <table className="border-separate" style={{ borderSpacing: "0 1px" }}>
          <tbody>
            {COMMANDS.filter((c) => !c.hidden).map((c) => (
              <tr key={c.name}>
                <td className="tx-accent pr-4 align-top">{c.usage ?? c.name}</td>
                <td className="tx-fg">{c.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ),
  },
  {
    name: "whoami",
    desc: "who is this",
    run: () => (
      <div>
        <div className="tx-bright font-bold">{profile.name}</div>
        <div>{profile.headline}</div>
        <div className="tx-dim">{profile.location}</div>
        <div className="mt-1">{profile.bio}</div>
      </div>
    ),
  },
  {
    name: "neofetch",
    desc: "system + profile summary",
    run: (ctx) => {
      const years = Math.max(1, new Date().getFullYear() - 2024);
      return (
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          <div className="flex flex-col">
            <pre className="mono-block term-art tx-accent">{ASCII}</pre>
            <div className="mt-2 tx-dim">
              type <span className="tx-accent">help</span> for more
            </div>
          </div>
          <div className="min-w-0">
            <div>
              <span className="tx-accent font-bold">ayush</span>
              <span className="tx-dim">@</span>
              <span className="tx-accent font-bold">portfolio</span>
            </div>
            <div className="tx-dim">{"─".repeat(22)}</div>
            <Field label="OS">Portfolio-Terminal v0.1</Field>
            <Field label="Host">ayush-gzip</Field>
            <Field label="Role">Software Engineer</Field>
            <Field label="Uptime">{`${years} yrs in software`}</Field>
            <Field label="Shell">ash 1.0 (ayush-shell)</Field>
            <Field label="Location">{profile.location}</Field>
            <Field label="Repos">{profile.githubStats.repos}</Field>
            <Field label="Posts">{ctx.posts.length}</Field>
            <Field label="Email">
              <Ext href={`mailto:${profile.email}`}>{profile.email}</Ext>
            </Field>
            <div className="mt-2 flex gap-1">
              {["#ff5f56", "#ffbd2e", "#27c93f", "var(--term-accent)", "var(--term-bright)", "var(--term-link)"].map(
                (c, j) => (
                  <span key={j} className="inline-block h-3 w-5" style={{ background: c }} />
                )
              )}
            </div>
          </div>
        </div>
      );
    },
  },
  {
    name: "ls",
    desc: "list what's here",
    run: () => (
      <div>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <span className="tx-accent font-bold">blog/</span>
          <span className="tx-fg">readme.md</span>
          <span className="tx-fg">resume.pdf</span>
        </div>
        <div className="tx-dim mt-1">
          also runnable: whoami · github · linkedin · contact · neofetch
        </div>
      </div>
    ),
  },
  {
    name: "cat",
    desc: "print a file",
    usage: "cat <file>",
    run: (ctx) => {
      const target = ctx.args[0];
      if (!target) return <span className="tx-err">usage: cat &lt;file&gt; (try: cat readme.md)</span>;
      const name = target.replace(/^\.?\//, "");
      if (name === "readme.md" || name === "readme") return renderMarkdown(ctx.readme);
      if (name === "resume.pdf") return <span className="tx-warn">resume.pdf is a binary file - run `resume` to open it.</span>;
      const blogMatch = /^blog\/(.+?)(?:\.md)?$/.exec(name);
      if (blogMatch) return renderPost(ctx, blogMatch[1]);
      return <span className="tx-err">cat: {target}: No such file. Try `ls`.</span>;
    },
  },
  {
    name: "blog",
    desc: "list posts, or read one",
    usage: "blog [slug]",
    run: (ctx) => {
      const slug = ctx.args[0];
      if (slug) return renderPost(ctx, slug);
      if (ctx.posts.length === 0) return <span className="tx-dim">No posts yet.</span>;
      return (
        <div>
          <div className="tx-dim mb-1">{ctx.posts.length} post(s). Read one with `blog &lt;slug&gt;`.</div>
          {ctx.posts.map((p) => (
            <div key={p.slug} className="mb-2">
              <div>
                <span className="tx-accent">{"» "}</span>
                <span className="tx-bright font-bold">{p.title}</span>
              </div>
              <div className="tx-dim text-[13px]">
                {p.date} · {p.readingMinutes} min · slug: <span className="tx-fg">{p.slug}</span>
              </div>
              <div className="text-[13px]">{p.description}</div>
            </div>
          ))}
        </div>
      );
    },
  },
  {
    name: "resume",
    desc: "read summary or open the PDF",
    run: (ctx) =>
      ctx.menu([
        { key: "1", label: "Read summary", run: resumeSummary },
        { key: "2", label: "Open Ayush_Rai_Resume.pdf ↗", run: () => openExt(RESUME_PDF, "Ayush_Rai_Resume.pdf") },
      ]),
  },
  {
    name: "github",
    desc: "live github profile + repos",
    run: () => githubSummary(),
  },
  {
    name: "linkedin",
    desc: "read summary or open linkedin.com",
    run: (ctx) =>
      ctx.menu([
        { key: "1", label: "Read summary", run: linkedinSummary },
        { key: "2", label: "Open on linkedin.com ↗", run: () => openExt(profile.linkedinUrl, "linkedin.com") },
      ]),
  },
  {
    name: "contact",
    desc: "how to reach me",
    run: () => (
      <div>
        <Field label="email">
          <Ext href={`mailto:${profile.email}`}>{profile.email}</Ext>
        </Field>
        <Field label="github">
          <Ext href={profile.githubUrl}>{profile.githubUrl}</Ext>
        </Field>
        <Field label="linkedin">
          <Ext href={profile.linkedinUrl}>{profile.linkedinUrl}</Ext>
        </Field>
      </div>
    ),
  },
  {
    name: "theme",
    desc: "switch color theme",
    usage: "theme <name>",
    run: (ctx) => {
      const t = ctx.args[0] as ThemeName | undefined;
      if (!t) {
        return (
          <div>
            <div>current theme: <span className="tx-bright">{ctx.theme}</span></div>
            <div className="tx-dim">available: {THEMES.join(", ")}</div>
          </div>
        );
      }
      if (!THEMES.includes(t)) return <span className="tx-err">theme: unknown &apos;{t}&apos;. Options: {THEMES.join(", ")}</span>;
      ctx.setTheme(t);
      return <span className="tx-dim">theme set to {t}.</span>;
    },
  },
  {
    name: "echo",
    desc: "print text",
    usage: "echo <text>",
    run: (ctx) => <span>{ctx.args.join(" ")}</span>,
  },
  {
    name: "date",
    desc: "current date/time",
    run: () => <span>{new Date().toString()}</span>,
  },
  {
    name: "history",
    desc: "command history",
    run: (ctx) => (
      <div>
        {ctx.history.length === 0 ? (
          <span className="tx-dim">(empty)</span>
        ) : (
          ctx.history.map((h, j) => (
            <div key={j}>
              <span className="tx-dim pr-3">{String(j + 1).padStart(3, " ")}</span>
              {h}
            </div>
          ))
        )}
      </div>
    ),
  },
  {
    name: "clear",
    desc: "clear the screen",
    run: (ctx) => {
      ctx.clear();
    },
  },
  // --- easter eggs / unix muscle-memory, hidden from help ---
  { name: "pwd", desc: "", hidden: true, run: () => <span>/home/ayush</span> },
  { name: "sudo", desc: "", hidden: true, run: () => <span className="tx-err">ayush is not in the sudoers file. This incident will be reported.</span> },
  { name: "exit", desc: "", hidden: true, run: (ctx) => { ctx.exit(); } },
  { name: "man", desc: "", hidden: true, run: () => <span className="tx-dim">What is a man? A miserable little pile of commands. Try `help`.</span> },
  { name: "game", desc: "", hidden: true, run: () => <SpaceGame /> },
  { name: "invaders", desc: "", hidden: true, run: () => <SpaceGame /> },
];

export const COMMAND_MAP: Record<string, Command> = Object.fromEntries(COMMANDS.map((c) => [c.name, c]));
export const COMMAND_NAMES = COMMANDS.filter((c) => !c.hidden).map((c) => c.name);

function renderPost(ctx: CommandCtx, slug: string): ReactNode {
  const post = ctx.posts.find((p) => p.slug === slug);
  if (!post) {
    return (
      <span className="tx-err">
        no post &apos;{slug}&apos;. Run `blog` to list slugs.
      </span>
    );
  }
  return (
    <div>
      <div className="tx-bright font-bold text-[15px]">{post.title}</div>
      <div className="tx-dim mb-2">
        {post.date} · {post.readingMinutes} min read · full version:{" "}
        <a className="tx-link" href={`/blog/${post.slug}`}>/blog/{post.slug}</a>
      </div>
      {renderMarkdown(post.content)}
    </div>
  );
}
