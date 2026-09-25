"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

// Easter egg: `exit` "closes" the site to a Matrix-style screen. The riddle
// tells you how to get back the way a Linux user would - switch to a fresh tty
// (Ctrl+Alt+F3, any F1-F9 accepted) and log in. user/pass: ayush or neo.

const RIDDLE = `Wake up, Neo...

So. You exited.

But there is no tab to close, and no site to leave.
The terminal was never on the screen. It was in you all along.

You can get back in the way you'd get back into any machine you walked away from.
When a Linux soul is locked out of the glass, it does not knock.
It reaches past the screen for another console - a fresh tty,
summoned with three keys held as one.

    Ctrl. Alt. And the function that counts to three.

The strength was never in the door.
The strength lies in you.`;

const HOST = "ayush-gzip";
const norm = (s: string) => s.trim().toLowerCase();
// ponytail: tiny fixed allowlist; "your name" (or neo) is both user and pass.
const OK = (u: string, p: string) =>
  ["ayush", "neo"].includes(norm(u)) && ["ayush", "neo"].includes(norm(p));

const GREEN = "#4dff88";

export function ExitScreen({ onLogin }: { onLogin: () => void }) {
  const [stage, setStage] = useState<"riddle" | "login">("riddle");
  const [shown, setShown] = useState(0); // typewriter progress
  const [enteredUser, setEnteredUser] = useState<string | null>(null); // null = typing username
  const [buf, setBuf] = useState("");
  const [failed, setFailed] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // typewriter reveal of the riddle (how they approached Neo)
  useEffect(() => {
    if (stage !== "riddle") return;
    const id = setInterval(
      () => setShown((n) => (n >= RIDDLE.length ? n : n + 1)),
      22
    );
    return () => clearInterval(id);
  }, [stage]);

  // the way back: a Linux VT-switch chord drops you to the login prompt
  useEffect(() => {
    if (stage !== "riddle") return;
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.altKey && /^F[1-9]$/.test(e.key)) {
        e.preventDefault();
        setStage("login");
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [stage]);

  useEffect(() => {
    if (stage === "login") inputRef.current?.focus();
  }, [stage, enteredUser, failed]);

  function submit() {
    if (enteredUser === null) {
      setEnteredUser(buf);
      setBuf("");
      return;
    }
    if (OK(enteredUser, buf)) onLogin();
    else {
      setFailed(true);
      setEnteredUser(null);
      setBuf("");
    }
  }

  const shell: CSSProperties = {
    color: GREEN,
    fontFamily: "var(--font-terminal), ui-monospace, monospace",
    // .cursor blinks in --term-accent; force it green on this screen
    ["--term-accent" as string]: GREEN,
  } as CSSProperties;

  return (
    <div
      className="fixed inset-0 z-50 overflow-auto bg-black p-5 text-[14px] leading-relaxed"
      style={shell}
      onClick={() => inputRef.current?.focus()}
    >
      {stage === "riddle" ? (
        <pre
          className="mx-auto max-w-2xl whitespace-pre-wrap break-words"
          style={{ textShadow: `0 0 6px ${GREEN}` }}
        >
          {RIDDLE.slice(0, shown)}
          <span className="cursor" aria-hidden="true" />
        </pre>
      ) : (
        <div className="mx-auto max-w-2xl">
          <div className="mb-3 opacity-70">Portfolio-Terminal 0.1.0 LTS   tty3</div>
          {failed && <div className="mb-2">Login incorrect</div>}
          <div>
            {HOST} login:{" "}
            {enteredUser === null ? (
              <>
                {buf}
                <span className="cursor" aria-hidden="true" />
              </>
            ) : (
              enteredUser
            )}
          </div>
          {enteredUser !== null && (
            <div>
              Password: <span className="cursor" aria-hidden="true" />
            </div>
          )}
          <input
            ref={inputRef}
            value={buf}
            onChange={(e) => setBuf(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            className="absolute h-0 w-0 opacity-0"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            aria-label="tty login"
          />
        </div>
      )}
    </div>
  );
}
