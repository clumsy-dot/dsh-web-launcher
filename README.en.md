# DSH Web Launcher

A one‑click macOS launcher for [`npx @deepseek-ai/dsh web`](https://www.npmjs.com/package/@deepseek-ai/dsh) — the DeepSeek Harness web UI.

Double‑click an app in `/Applications`, get a dedicated browser window pointed at your DSH session. No terminal window, no stray tabs, no manual `npx` commands.

[中文说明](README.md)

## Download

Prefer not to build? Grab `DSH-Web-2.1.0-macos.zip` from [Releases](https://github.com/clumsy-dot/dsh-web-launcher/releases), unzip it, and drag `DSH Web.app` into `/Applications`.

> Release builds are ad-hoc signed and not notarized by Apple, so Gatekeeper may block the first launch (right-click → Open, or allow it in System Settings).

## Features

| | |
|---|---|
| **One click** | The app starts `npx @deepseek-ai/dsh web` in the background and opens the UI. |
| **No terminal window** | Runs as a Dock‑less-in-background helper; quitting the app stops the server and frees the port. |
| **Instant feedback** | The browser opens a "Starting…" page immediately; it redirects to DSH as soon as the server is ready. |
| **Dedicated window** | Chromium app-mode window (no address bar, no tabs) with its own profile at `~/.dsh-web-launcher/browser-profile`, so it never mixes with your daily browsing. |
| **Sensible fallbacks** | No Chromium → a dedicated Safari window (tracked by window id). No Safari → a normal tab in your default browser. |
| **Reuses its window** | Clicking again focuses the existing window; page changes navigate in place instead of spawning new windows. |
| **Hidden loading** | The UI loads behind the progress page and is swapped in once ready. |
| **Port handling** | Reuses an existing DSH instance on the port instead of starting a second one; picks a free port if the default is taken. |
| **Crash-safe cleanup** | Kills the whole `npx → dsh` process tree on quit (no orphan servers holding the port). |
| **Logs** | Everything lands in `~/.dsh-web-launcher/logs/`, failures are reported in the app and the "Starting…" page. |

## Requirements

- macOS 11 or later
- Node.js **24.9+** (`dsh`'s engine requirement)
- Optional: Chromium (or Chrome/Edge/Brave/Arc) for the chromeless app window

> On macOS 12, current Chromium builds require macOS 13. [`tools/probe-chromium.mjs`](tools/probe-chromium.mjs) finds the newest Chromium snapshot that still runs on your OS by reading the app's `Info.plist` out of the zip via HTTP range requests.

## Quick start

```bash
git clone https://github.com/clumsy-dot/dsh-web-launcher.git
cd dsh-web-launcher

./build-app.sh      # compiles the AppleScript applet and builds the icon
./install.sh        # copies "DSH Web.app" to /Applications
```

Then open **DSH Web** from Launchpad/Spotlight, or double-click `/Applications/DSH Web.app`.

- The first launch installs a local copy of dsh (about a minute); later cold starts take ~**7 s** (npx would add ~6 s of registry resolution every time).
- While it boots you get a progress page; it redirects automatically.
- Quit the app (`Cmd+Q` or Dock → Quit) to stop the server.

## Command line

The same launcher works from a terminal, which is handy for debugging:

```bash
./bin/dsh-web                  # default 127.0.0.1:3080
./bin/dsh-web --port 8090
./bin/dsh-web --workspace ~/code
./bin/dsh-web --check          # print an environment report, start nothing
./bin/dsh-web --help
```

`DSH Web.command` can also be double-clicked: it runs the same script in a Terminal window so you can watch the logs live.

## Configuration

Flags: `--port`, `--host`, `--workspace`, `--no-open`, `--new`, `--timeout`, `--check`.

Environment variables (all optional):

| Variable | Default | Meaning |
|---|---|---|
| `DSH_PKG_SPEC` | `@deepseek-ai/dsh` | Package spec passed to `npx` (pin a version here) |
| `DSH_WEB_PORT` | `3080` | Port to serve on |
| `DSH_WEB_HOST` | `127.0.0.1` | Bind address |
| `DSH_WEB_WORKSPACE` | `~/Documents/deepseek-harness/default-workspace` | Working directory for the server |
| `DSH_WEB_NO_OPEN` | `0` | `1` = never open a browser |
| `DSH_WEB_BOOT_TIMEOUT` | `300` | Seconds to wait for the server |
| `DSH_WEB_LOG_DIR` | `~/.dsh-web-launcher/logs` | Where logs go |
| `DSH_WEB_NPX` | `npx` | Custom path to `npx` |
| `DSH_WEB_BROWSER_PROFILE` | `~/.dsh-web-launcher/browser-profile` | Chromium profile directory |
| `DSH_WEB_BOOT_PAGE` | `1` | Set to `0` to skip the progress page |
| `DSH_WEB_PKG_DIR` | `~/.dsh-web-launcher/pkg` | Where the local dsh copy lives |
| `DSH_WEB_LOCAL_PKG` | `1` | `0` = always go through npx (about 6 s slower) |

## How it works

```
DSH Web.app  (AppleScript applet, stay-open)
   └─ bin/dsh-web                    orchestrator
        ├─ bin/dsh-open              picks a browser window
        │    ├─ Chromium --app=… --user-data-dir=…   (preferred)
        │    └─ AppleScript → Safari window (id tracked)
        ├─ bin/dsh-browser-focus     find/focus an existing window over the local debug port
        ├─ bin/dsh-browser-stage     load the UI behind the progress page, then swap
        ├─ bin/dsh-boot-page         tiny HTTP server for the "Starting…" page
        └─ npx @deepseek-ai/dsh web --host … --port … --no-open
             └─ prints "dsh web: http://127.0.0.1:PORT/?token=…"
```

1. The applet launches the orchestrator detached, then stays in the Dock so it can stop it on quit.
2. The orchestrator starts a small progress server (`PORT + 100`) and opens it, then starts `dsh web`.
3. It scrapes the tokenized URL from dsh's output — plain `http://127.0.0.1:3080` would answer `401` until the launch token is exchanged for a cookie — and hands it to the progress page.
4. The page redirects, the window stays; quitting the app kills the whole process tree.

## Troubleshooting

```bash
./bin/dsh-web --check                         # environment report
tail -50 ~/.dsh-web-launcher/last-run.log     # last launch output
ls -lt ~/.dsh-web-launcher/logs | head        # per-run dsh logs
```

- **`401` / "authentication required"** — the browser has no cookie for the port yet. Open the printed `?token=…` URL once; the progress page normally does this for you.
- **Nothing happens on double-click** — check `last-run.log`. The applet quits itself if the launcher exits immediately (e.g. already running).
- **Chromium won't start** — snapshot builds only run on the macOS versions they declare; check `LSMinimumSystemVersion` (see `tools/probe-chromium.mjs`).
- **"DSH Web wants to control Safari"** — one-time automation permission, only when the Safari fallback is used.
- **App icon looks different after moving** — run `touch "/Applications/DSH Web.app"`; LaunchServices caches icons.

## Uninstall

```bash
rm -rf "/Applications/DSH Web.app" ~/.dsh-web-launcher
```

## Notes

- The icon is generated from `assets/whale.png` (DeepSeek's whale artwork). Replace it if you plan to redistribute under your own branding.
- Script output is in Chinese; the code is commented in Chinese too. PRs adding English messages are welcome.
- Not notarized: the app is ad‑hoc signed locally, which is fine for personal use.
- The launcher opens a local Chromium debugging port (default `9333`, loopback only) to find and focus its own windows; override with `DSH_WEB_BROWSER_DEBUG_PORT`.

## Disclaimer

Unofficial project, provided “as is” without warranty. The launcher runs locally and never collects or uploads your data. See [DISCLAIMER.md](DISCLAIMER.md) for the full text.

## License

[MIT](LICENSE)
