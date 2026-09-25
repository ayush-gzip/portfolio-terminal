"use client";

import { useEffect, useRef, useState } from "react";

// A tiny Space-Invaders-style shooter that renders inside the terminal.
// ← → move, space shoots, esc/q quits. Levels ramp: more rows, faster
// formation, quicker enemy fire. Endless until you die.

const W = 440;
const H = 300;

type Vec = { x: number; y: number; w: number; h: number };

function refocusPrompt() {
  document.querySelector<HTMLInputElement>('input[aria-label="terminal input"]')?.focus();
}

export function SpaceGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [end, setEnd] = useState<{ score: number; level: number; quit: boolean } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // pull the live theme colors so the game matches the active palette
    const cs = getComputedStyle(canvas);
    const col = (name: string, fb: string) => cs.getPropertyValue(name).trim() || fb;
    const C = {
      bg: col("--term-bg", "#06090a"),
      fg: col("--term-fg", "#46e07a"),
      dim: col("--term-dim", "#2b8f52"),
      bright: col("--term-bright", "#b8ffd0"),
      accent: col("--term-accent", "#62ff9e"),
      err: col("--term-err", "#ff6b6b"),
    };

    const keys = new Set<string>();
    const player = { x: W / 2 - 14, y: H - 22, w: 28, h: 10 };
    let bullets: Vec[] = [];
    let ebullets: Vec[] = [];
    let enemies: Vec[] = [];
    let dir = 1;
    let level = 1;
    let score = 0;
    let lives = 3;
    let fireCd = 0; // player fire cooldown (s)
    let eFireCd = 1; // enemy fire timer (s)
    let over = false;
    let last = 0;
    let raf = 0;

    function buildLevel() {
      enemies = [];
      const cols = 7;
      const rows = Math.min(2 + level, 5);
      const ew = 22, eh = 16, gx = 12, gy = 14, x0 = 34, y0 = 34;
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++)
          enemies.push({ x: x0 + c * (ew + gx), y: y0 + r * (eh + gy), w: ew, h: eh });
      dir = 1;
      ebullets = [];
    }

    const hit = (a: Vec, b: Vec) =>
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

    // edge-triggered: fire on the keydown itself (a quick tap must never be
    // dropped between frames), gated by cooldown. Held space autofires via OS repeat.
    function tryFire() {
      if (over || fireCd > 0) return;
      bullets.push({ x: player.x + player.w / 2 - 1.5, y: player.y - 10, w: 3, h: 10 });
      fireCd = 0.28;
    }

    function finish(quit: boolean) {
      if (over) return;
      over = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onUp, true);
      setEnd({ score, level, quit });
      refocusPrompt();
    }

    function onKey(e: KeyboardEvent) {
      const k = e.key;
      if (k !== "ArrowLeft" && k !== "ArrowRight" && k !== " " && k !== "Escape" && k !== "q" && k !== "Q")
        return;
      // intercept before the terminal input's handler / page scroll
      e.preventDefault();
      e.stopPropagation();
      if (k === "Escape" || k === "q" || k === "Q") return finish(true);
      if (k === " ") return tryFire();
      keys.add(k);
    }
    function onUp(e: KeyboardEvent) {
      keys.delete(e.key);
    }

    function step(dt: number) {
      if (keys.has("ArrowLeft")) player.x -= 220 * dt;
      if (keys.has("ArrowRight")) player.x += 220 * dt;
      player.x = Math.max(4, Math.min(W - player.w - 4, player.x));

      fireCd -= dt;
      bullets.forEach((b) => (b.y -= 420 * dt));
      bullets = bullets.filter((b) => b.y + b.h > 0);

      // enemy formation: slide sideways, drop + reverse at the walls
      const speed = 26 + level * 12;
      let minx = Infinity, maxx = -Infinity, maxy = -Infinity;
      for (const en of enemies) {
        minx = Math.min(minx, en.x);
        maxx = Math.max(maxx, en.x + en.w);
        maxy = Math.max(maxy, en.y + en.h);
      }
      const dx = dir * speed * dt;
      if (enemies.length && (maxx + dx > W - 4 || minx + dx < 4)) {
        dir *= -1;
        enemies.forEach((en) => (en.y += 12));
      } else {
        enemies.forEach((en) => (en.x += dx));
      }
      if (maxy >= player.y) return finish(false);

      // enemy fire (rate climbs with level)
      eFireCd -= dt;
      if (eFireCd <= 0 && enemies.length) {
        const en = enemies[Math.floor(Math.random() * enemies.length)];
        ebullets.push({ x: en.x + en.w / 2 - 1.5, y: en.y + en.h, w: 3, h: 10 });
        eFireCd = Math.max(0.45, 1.7 - level * 0.14);
      }
      ebullets.forEach((b) => (b.y += 200 * dt));

      // player shots vs enemies
      for (const b of bullets) {
        for (let i = 0; i < enemies.length; i++) {
          if (hit(b, enemies[i])) {
            enemies.splice(i, 1);
            b.y = -999;
            score += 10;
            break;
          }
        }
      }
      bullets = bullets.filter((b) => b.y > -100);

      // enemy shots vs player
      for (const b of ebullets) {
        if (hit(b, player)) {
          b.y = H + 999;
          lives -= 1;
          if (lives <= 0) return finish(false);
        }
      }
      ebullets = ebullets.filter((b) => b.y < H);

      if (!enemies.length) {
        level += 1;
        buildLevel();
      }
    }

    function drawInvader(e: Vec) {
      ctx!.fillStyle = C.fg;
      ctx!.fillRect(e.x, e.y + 3, e.w, e.h - 6);
      ctx!.fillRect(e.x + 3, e.y, e.w - 6, e.h);
      ctx!.fillStyle = C.bg;
      ctx!.fillRect(e.x + 5, e.y + 5, 3, 3);
      ctx!.fillRect(e.x + e.w - 8, e.y + 5, 3, 3);
    }

    function draw() {
      ctx!.fillStyle = C.bg;
      ctx!.fillRect(0, 0, W, H);
      // player ship
      ctx!.fillStyle = C.accent;
      ctx!.fillRect(player.x, player.y, player.w, player.h);
      ctx!.fillRect(player.x + player.w / 2 - 3, player.y - 6, 6, 6);
      // shots
      ctx!.fillStyle = C.bright;
      bullets.forEach((b) => ctx!.fillRect(b.x, b.y, b.w, b.h));
      enemies.forEach(drawInvader);
      ctx!.fillStyle = C.err;
      ebullets.forEach((b) => ctx!.fillRect(b.x, b.y, b.w, b.h));
      // HUD
      ctx!.fillStyle = C.dim;
      ctx!.font = "13px ui-monospace, monospace";
      ctx!.textBaseline = "top";
      ctx!.textAlign = "left";
      ctx!.fillText(`SCORE ${score}`, 8, 6);
      ctx!.textAlign = "center";
      ctx!.fillText(`LVL ${level}`, W / 2, 6);
      // lives as little ships, top-right
      ctx!.fillStyle = C.accent;
      for (let i = 0; i < lives; i++) ctx!.fillRect(W - 14 - i * 12, 8, 8, 6);
    }

    function frame(ts: number) {
      if (over) return;
      if (!last) last = ts;
      const dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;
      step(dt);
      draw();
      if (over) return;
      raf = requestAnimationFrame(frame);
    }

    buildLevel();
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onUp, true);
    (document.activeElement as HTMLElement | null)?.blur(); // stop keys reaching the prompt
    raf = requestAnimationFrame(frame);

    return () => {
      over = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onUp, true);
    };
  }, []);

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <div className="tx-dim mb-1 text-[13px]">← → move · space shoot · esc/q quit</div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="block max-w-full"
        style={{ border: "1px solid var(--term-dim)", imageRendering: "pixelated" }}
      />
      {end && (
        <div className="mt-1">
          {end.quit ? (
            <span className="tx-dim">
              quit — level {end.level}, score {end.score}. run `game` to play again.
            </span>
          ) : (
            <span className="tx-warn">
              GAME OVER — level {end.level}, score {end.score}. run `game` to play again.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
