# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

An Electron + React overlay app for the game _Clair Obscur: Expedition 33_. It watches the player's `.sav` file on disk and shows a live checklist of which bosses have been encountered/killed, organized by zone. Bosses not detectable from the save file can be checked off manually.

## Commands

```bash
npm run dev         # start Vite + Electron in dev mode (loads from localhost:5173)
npm run build        # tsc + vite build + electron-builder (produces installer/portable exe in release/)
npm run lint          # eslint .
npm run lint:fix      # eslint . --fix
npm run format        # prettier --write .
npm run ts:check      # tsc --noEmit
```

There is no test suite in this repo — CI (`.github/workflows/main.yml`) only runs `ts:check`, `lint`, `format`, and `build` on PRs to `main`.

Commit messages are enforced by commitlint via a husky `commit-msg` hook (conventional commits: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`; no upper/Pascal-case subjects).

## Architecture

This is a standard `vite-plugin-electron` project with three separate TypeScript worlds sharing one `tsconfig.json` (`include: ["src", "electron"]`):

- **`electron/main.ts`** — main process. Creates the frameless/transparent `BrowserWindow`, owns all `ipcMain` handlers (start-watch, save-boss-info, select-file/directory, get/save-config, get/save/clear-manual-state, close-app), and persists app config (`config.json`) and per-save manual boss overrides (`manual-states/<saveFileName>.json`) under `app.getPath('userData')`.
- **`electron/preload.ts`** — contextBridge, exposes `window.electronAPI` (typed via `src/vite-env.d.ts`) as the only channel between renderer and main. Any new IPC call needs a handler in `main.ts` _and_ a matching bridge method here.
- **`electron/saveWatcher.ts`** — wraps `chokidar` to watch the `.sav` path, calls `saveParser.parseSaveFile()` on change, merges the result with manual overrides, and diffs against the previous boss list to detect newly-killed bosses. Exposes `watchSaveFile()` and `refreshBossList()` (used to force a refresh after the boss database or manual states change).
- **`electron/saveParser.ts`** — the core parsing logic:
  - Shells out to the bundled `tools/uesave.exe` (from the [uesave-cli](https://github.com/trumank/uesave) project) to convert the Unreal Engine `.sav` binary into JSON.
  - Accepts either a direct file path or a save _directory_, in which case it recursively finds the most recently modified extensionless file (Unreal save files have no extension) — this is how "watch this folder" mode works.
  - Cross-references enemy names found in the save's `BattledEnemies_0` / `EncounteredEnemies_0` / `TransientBattledEnemies_0` maps against `data/bossDatabase.json`, matching by exact name or by a normalized name with the trailing Unreal GUID hash stripped (`normalizeEnemyName`).
  - Caches the last parse result keyed by resolved path + mtime to avoid re-shelling to `uesave.exe` on every watcher tick.
  - Falls back to `getMockBosses()` if `uesave.exe` is missing or parsing fails, so the UI still renders something in dev without a real save file.
  - In production, `uesave.exe` and `data/bossDatabase.json` are read from `process.resourcesPath` (see `extraResources` in `electron-builder.json`); in dev they're read relative to `electron/` via `__dirname`. Any code that needs these paths must replicate this `isDev` branch.
- **`data/bossDatabase.json`** — the boss database, organized as `{ zoneName: [{ originalName, id, category }] }`. `originalName` is either the exact (or hash-normalized) enemy identifier as it appears in the save file, or a synthetic `MANUAL_<timestamp>` id for bosses not tracked in the save at all (created via the in-app "add boss" form, which calls the `save-boss-info` IPC handler and mutates this file directly at runtime — both in dev and in a packaged build, since it lives in `resourcesPath`). Zones `Sans zone`, `Hidden`, and `❓ À définir` are excluded from the manual-boss fallback rendering path; `Hidden`-zone bosses are always excluded even if present in the save.
- **`src/App.tsx`** — renders `BossChecklist` (main list view) or `Settings` (save path picker + options) based on a toggle, listens for `boss-update` / `restore-save-path` IPC events, and owns the manual-override state (`manualStates`) that gets merged into whatever the watcher pushes.
- **`src/i18n/`** — a small custom i18n implementation (no external library). `i18nContext.tsx` holds the translation lookup (`t`), plus helpers `translateZone` / `translateCategory` / `translateBossName` that fall back to the raw key (or a title-cased version of a snake_case boss id) when no translation exists. Language is auto-detected from the system locale on first run, then persisted via `get-config`/`save-config` IPC. Locale files live in `src/i18n/locales/*.json` (`en`, `fr`, `ru`, `zh_tr`); `en.json` is the shape (`TranslationObject`) all others are typed against.

### Data flow for a boss state update

1. `chokidar` fires on the watched `.sav` file/directory in `saveWatcher.ts`.
2. `saveParser.parseSaveFile()` shells to `uesave.exe`, converts to JSON, matches enemies against `bossDatabase.json`.
3. `saveWatcher.ts` merges in any manual overrides for that save (from `manual-states/<name>.json`) and diffs against the previous list to find newly-killed bosses.
4. Result is pushed over IPC (`boss-update`) to the renderer.
5. `App.tsx` re-merges with its own in-memory `manualStates` (so a manual toggle updates the UI even if a fresh save-triggered update briefly lacks it) and renders.

### Translation contributions

See `CONTRIBUTING_TRANSLATIONS.md` — community translations are submitted as full `src/i18n/locales/<lang>.json` files via GitHub issues, not PRs. When adding a new language, register it in the `Language` union and `translations` map in `src/i18n/i18nContext.tsx`.
