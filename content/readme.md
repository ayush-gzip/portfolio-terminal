# README.md

Welcome. You're in a shell.

This site is my portfolio rendered as a terminal. My writing, my resume, and my profiles aren't pages you click, they're commands you run. Everything below works right now, in this very prompt.

## Getting around

- Type a command and press `Enter`. Start with `help`.
- `Tab` autocompletes command names (and post slugs after `blog`, files after `cat`).
- `↑` / `↓` walk back and forth through your command history.
- `Ctrl+L` clears the screen. `Ctrl+C` abandons the current line.
- Click anywhere to refocus the prompt.

## What's installed

- **help** - the full command list.
- **neofetch** - the obligatory ASCII + system-info block.
- **blog** - list posts; `blog <slug>` reads one. Each also has a real shareable URL at `/blog/<slug>`.
- **resume** - a plain-text summary, plus links to open or download the PDF.
- **github** - my live GitHub profile and repos (falls back to a saved snapshot when the API is unreachable).
- **linkedin** / **contact** - experience, education, and how to reach me.
- **cat readme.md** - this file. `ls` shows what else is here.

## Themes

`theme mocha` (default), `theme green`, `theme amber`, `theme matrix`, or a Catppuccin variant. Your choice is remembered on this browser.

## Deep links

Append `?cmd=<command>` to the URL to auto-run something on load, for example `?cmd=neofetch` or `?cmd=blog deltas-for-adhd`. Every blog post also links back in with an "open in terminal" button.

## Colophon

A static Next.js site, no backend. The blog posts are the same MDX files behind the desktop version of this portfolio; only the shell around them changed. Rendered markdown in the terminal is best-effort, the full typographic version lives at each post's `/blog` URL.
