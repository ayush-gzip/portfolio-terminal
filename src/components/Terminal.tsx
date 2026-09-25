"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  COMMAND_MAP,
  COMMAND_NAMES,
  THEMES,
  type CommandCtx,
  type MenuItem,
  type TermPost,
  type ThemeName,
} from "@/lib/commands";
import { ExitScreen } from "./ExitScreen";

const PROMPT = "ayush@portfolio:~$";
const THEME_KEY = "portterm:theme";
const EXITED_KEY = "portterm:exited";

type Block = {
  id: number;
  /** the typed command line, echoed after the prompt; undefined for system output */
  prompt?: string;
  output: ReactNode;
};

export function Terminal({ posts, readme }: { posts: TermPost[]; readme: string }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [input, setInput] = useState("");
  const [theme, setTheme] = useState<ThemeName>("mocha");
  const [histIdx, setHistIdx] = useState(-1);
  const [caret, setCaret] = useState(0);
  const [pendingLabel, setPendingLabel] = useState<string | null>(null);
  const [exited, setExited] = useState(false); // easter egg: `exit` -> Matrix/tty screen

  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true); // whether the view is pinned to the bottom
  const idRef = useRef(0);
  const historyRef = useRef<string[]>([]);
  const themeRef = useRef<ThemeName>("mocha");
  const draftRef = useRef(""); // input stashed while browsing history
  const pendingRef = useRef<MenuItem[] | null>(null); // armed menu, if any

  const nextId = () => ++idRef.current;
  // set the input line and park the caret at its end (history/tab/clear)
  const setLine = (v: string) => {
    setInput(v);
    setCaret(v.length);
  };
  function syncCaret() {
    const el = inputRef.current;
    if (el) setCaret(el.selectionStart ?? el.value.length);
  }
  function disarm() {
    pendingRef.current = null;
    setPendingLabel(null);
  }

  const applyTheme = useCallback((t: ThemeName) => {
    themeRef.current = t;
    setTheme(t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch {}
  }, []);

  const push = useCallback((b: Block) => setBlocks((prev) => [...prev, b]), []);
  const update = useCallback(
    (id: number, output: ReactNode) =>
      setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, output } : b))),
    []
  );

  // Run one menu item (clicked, or picked by typing its number): echo the
  // choice, then its output (awaiting async items like the github summary).
  const resolveMenu = useCallback(
    async (item: MenuItem) => {
      disarm();
      stick.current = true;
      push({ id: nextId(), output: <div className="tx-dim">▸ {item.label}</div> });
      const outId = nextId();
      try {
        const r = item.run();
        if (r instanceof Promise) {
          push({ id: outId, output: <span className="tx-dim">…</span> });
          update(outId, (await r) ?? null);
        } else if (r != null) {
          push({ id: outId, output: r });
        }
      } catch (e) {
        push({ id: nextId(), output: <span className="tx-err">error: {String(e)}</span> });
      }
    },
    [push, update]
  );

  const makeCtx = useCallback(
    (args: string[], raw: string): CommandCtx => ({
      args,
      raw,
      posts,
      readme,
      history: historyRef.current,
      theme: themeRef.current,
      setTheme: applyTheme,
      clear: () => setBlocks([]),
      exit: () => {
        try {
          localStorage.setItem(EXITED_KEY, "1");
        } catch {}
        setExited(true);
      },
      menu: (items) => {
        pendingRef.current = items;
        setPendingLabel(`select 1-${items.length}`);
        return (
          <div>
            {items.map((it) => (
              <button
                key={it.key}
                onClick={() => resolveMenu(it)}
                className="block w-full text-left hover:bg-white/5"
              >
                <span className="tx-accent">{it.key})</span> <span className="tx-fg">{it.label}</span>
              </button>
            ))}
            <div className="tx-dim mt-1 text-[13px]">type 1-{items.length} and Enter, or click.</div>
          </div>
        );
      },
    }),
    [posts, readme, applyTheme, resolveMenu]
  );

  const run = useCallback(
    async (rawLine: string) => {
      const trimmed = rawLine.trim();

      // A menu is armed: a matching number resolves it; anything else (or a
      // blank line stays put) exits the menu and runs as a normal command.
      if (pendingRef.current) {
        if (!trimmed) return;
        const choice = pendingRef.current.find((it) => it.key === trimmed);
        if (choice) {
          resolveMenu(choice);
          return;
        }
        disarm();
      }

      stick.current = true; // running a command jumps back to the bottom
      const id = nextId();
      push({ id, prompt: rawLine, output: null });

      if (trimmed) {
        historyRef.current = [...historyRef.current, trimmed];
      }
      setHistIdx(-1);
      draftRef.current = "";

      if (!trimmed) return;

      const [name, ...args] = trimmed.split(/\s+/);
      const cmd = Object.hasOwn(COMMAND_MAP, name.toLowerCase()) ? COMMAND_MAP[name.toLowerCase()] : undefined;
      if (!cmd) {
        update(id, <span className="tx-err">command not found: {name}. Type `help`.</span>);
        return;
      }

      const ctx = makeCtx(args, trimmed);
      try {
        const result = cmd.run(ctx);
        if (result instanceof Promise) {
          update(id, <span className="tx-dim">…</span>);
          update(id, (await result) ?? null);
        } else {
          update(id, result ?? null);
        }
      } catch (e) {
        update(id, <span className="tx-err">error: {String(e)}</span>);
      }
    },
    [push, update, makeCtx, resolveMenu]
  );

  // Boot once (guarded against StrictMode double-invoke in dev).
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;

    try {
      const saved = localStorage.getItem(THEME_KEY) as ThemeName | null;
      if (saved && THEMES.includes(saved)) applyTheme(saved);
      if (localStorage.getItem(EXITED_KEY) === "1") setExited(true);
    } catch {}

    push({
      id: nextId(),
      output: (
        <div>
          <div className="tx-bright">Portfolio-Terminal [Version 0.1.0]</div>
          <div className="tx-dim">(c) 2026 Ayush Rai. Can you count the pixels?</div>
        </div>
      ),
    });

    // Greet with neofetch by default (or run a ?cmd= deep link instead).
    const cmd = new URLSearchParams(window.location.search).get("cmd");
    // Deep links may only run public commands (no `exit` lockout, no `game` key capture).
    const first = cmd?.trim().split(/\s+/)[0]?.toLowerCase() ?? "";
    run(cmd && Object.hasOwn(COMMAND_MAP, first) && !COMMAND_MAP[first].hidden ? cmd : "neofetch");
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the view pinned to the newest output.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [blocks]);

  function autocomplete() {
    const parts = input.split(/\s+/);
    if (parts.length <= 1) {
      const frag = parts[0] ?? "";
      const matches = COMMAND_NAMES.filter((n) => n.startsWith(frag));
      if (matches.length === 1) setLine(matches[0] + " ");
      else if (matches.length > 1) {
        const common = commonPrefix(matches);
        if (common.length > frag.length) setLine(common);
        push({ id: nextId(), output: <span className="tx-dim">{matches.join("   ")}</span> });
      }
      return;
    }
    const base = parts[0].toLowerCase();
    const frag = parts[parts.length - 1];
    let opts: string[] = [];
    if (base === "blog") opts = posts.map((p) => p.slug);
    else if (base === "cat") opts = ["readme.md", "resume.pdf", ...posts.map((p) => `blog/${p.slug}`)];
    else if (base === "theme") opts = THEMES;
    const matches = opts.filter((o) => o.startsWith(frag));
    if (matches.length === 1) setLine([...parts.slice(0, -1), matches[0]].join(" "));
    else if (matches.length > 1) push({ id: nextId(), output: <span className="tx-dim">{matches.join("   ")}</span> });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const line = input;
      setLine("");
      run(line);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      autocomplete();
      return;
    }
    if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setBlocks([]);
      return;
    }
    if (e.key === "c" && e.ctrlKey) {
      e.preventDefault();
      push({ id: nextId(), prompt: input + "^C", output: null });
      setLine("");
      setHistIdx(-1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const h = historyRef.current;
      if (h.length === 0) return;
      const idx = histIdx === -1 ? h.length - 1 : Math.max(0, histIdx - 1);
      if (histIdx === -1) draftRef.current = input;
      setHistIdx(idx);
      setLine(h[idx]);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const h = historyRef.current;
      if (histIdx === -1) return;
      const idx = histIdx + 1;
      if (idx >= h.length) {
        setHistIdx(-1);
        setLine(draftRef.current);
      } else {
        setHistIdx(idx);
        setLine(h[idx]);
      }
      return;
    }
  }

  // Live shell highlighting: an unknown first word renders red (unless a menu
  // is armed, where the input is a 1/2 choice, not a command).
  function renderInputLine(): ReactNode[] {
    let segs: Seg[];
    if (!pendingLabel && unknownCommand(input)) {
      const m = /^(\s*)(\S+)([\s\S]*)$/.exec(input)!;
      segs = [
        ...(m[1] ? [{ text: m[1] }] : []),
        { text: m[2], cls: "tx-err" },
        ...(m[3] ? [{ text: m[3] }] : []),
      ];
    } else {
      segs = input ? [{ text: input }] : [];
    }
    return withCursor(segs, caret);
  }

  // Click anywhere focuses the prompt, unless the user is selecting text or hit a link.
  function onTerminalClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("a")) return;
    if (!window.getSelection()?.isCollapsed) return;
    inputRef.current?.focus();
  }

  // `exit` "closes" the site to the Matrix/tty screen; logging back in
  // (Ctrl+Alt+F3, user/pass ayush) restores this same session.
  if (exited) {
    return (
      <ExitScreen
        onLogin={() => {
          try {
            localStorage.removeItem(EXITED_KEY);
          } catch {}
          setExited(false);
          push({
            id: nextId(),
            output: <div className="tx-dim">Last login: {new Date().toString()} on tty3</div>,
          });
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
      />
    );
  }

  return (
    <div
      className="terminal crt crt-flicker term-scroll h-dvh w-full overflow-y-auto p-3 sm:p-5"
      data-theme={theme}
      ref={scrollRef}
      onClick={onTerminalClick}
      onScroll={(e) => {
        const el = e.currentTarget;
        stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      }}
    >
      <div className="mx-auto max-w-4xl pb-24">
        {blocks.map((b) => (
          <div key={b.id} className="whitespace-pre-wrap break-words">
            {b.prompt !== undefined && (
              <div>
                <span className="tx-accent">{PROMPT}</span> <span className="tx-fg">{b.prompt}</span>
              </div>
            )}
            {b.output != null && <div>{b.output}</div>}
          </div>
        ))}

        {/* live input line: the block cursor sits at the real caret
            (selectionStart); the overlaid input is transparent and only
            captures keystrokes. */}
        <div className="flex items-start">
          <span className={`shrink-0 ${pendingLabel ? "tx-warn" : "tx-accent"}`}>
            {pendingLabel ? `${pendingLabel}:` : PROMPT}
          </span>
          <span className="relative ml-[1ch] min-w-0 flex-1 whitespace-pre-wrap break-words">
            {renderInputLine()}
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setCaret(e.target.selectionStart ?? e.target.value.length);
              }}
              onKeyDown={onKeyDown}
              onKeyUp={syncCaret}
              onClick={syncCaret}
              onSelect={syncCaret}
              className="absolute inset-0 h-full w-full opacity-0 outline-none"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              aria-label="terminal input"
            />
          </span>
        </div>
      </div>
    </div>
  );
}

function commonPrefix(strs: string[]): string {
  if (strs.length === 0) return "";
  let p = strs[0];
  for (const s of strs) {
    while (!s.startsWith(p)) p = p.slice(0, -1);
  }
  return p;
}

type Seg = { text: string; cls?: string };

/** Render colored input segments with the block cursor spliced in at `caret`. */
function withCursor(segs: Seg[], caret: number): ReactNode[] {
  const out: ReactNode[] = [];
  let pos = 0;
  let k = 0;
  let placed = false;
  for (const s of segs) {
    const end = pos + s.text.length;
    if (!placed && caret >= pos && caret <= end) {
      const before = s.text.slice(0, caret - pos);
      const after = s.text.slice(caret - pos);
      if (before) out.push(<span key={k++} className={s.cls}>{before}</span>);
      out.push(<span key={k++} className="cursor" aria-hidden="true" />);
      if (after) out.push(<span key={k++} className={s.cls}>{after}</span>);
      placed = true;
    } else {
      out.push(<span key={k++} className={s.cls}>{s.text}</span>);
    }
    pos = end;
  }
  if (!placed) out.push(<span key={k++} className="cursor" aria-hidden="true" />);
  return out;
}

/** True once the first word can't be a command (fish-style: red only when it
 *  is a complete non-command, or a fragment that no command even starts with). */
function unknownCommand(s: string): boolean {
  const t = s.replace(/^\s+/, "");
  if (!t) return false;
  const sp = t.search(/\s/);
  const word = (sp === -1 ? t : t.slice(0, sp)).toLowerCase();
  if (Object.hasOwn(COMMAND_MAP, word)) return false;
  if (sp === -1 && Object.keys(COMMAND_MAP).some((n) => n.startsWith(word))) return false;
  return true;
}
