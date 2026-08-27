# Unki

Local-first flashcard PWA (Anki-style). Hosted on GitHub Pages with no backend — decks, cards, images, reviews, and streaks live in IndexedDB via Dexie.

## Study

- Tap a card to flip (true 3D faces). The front uses the deck color; the back follows light/dark theme
- Swipe **left** (Study again) or **right** (I know) on either face — grading is swipe-only (no buttons). A successful swipe flies the card off-screen (no snap-back) until the next card enters. Flip to check the answer, then swipe to rate. I know before peeking may roll a level-scaled challenge: type the translation (front shown), scramble the term from the translation (reverse), or reverse multiple-choice. After peeking, I know grades from recall time (Easy / Good / Hard)
- Once per session (when ≥ 4 cards remain, at a random step no later than 4 cards before the end), a **match pairs** challenge may appear: 4 remaining cards as 8 tiles (prompts vs answers; column sides random). Tap a tile then its match; correct pairs dim; wrong pairs flash red and keep the first selection; tap again to deselect
- After each grade, a short pause shows feedback before the next card
- The first card of a session briefly nudges left/right to teach swiping
- Short questions (≤ 100 characters) are spoken on flip via the Web Speech API
- Hub (`/cards`) shows today’s plan (learned / remaining / added), streak, and Level / XP. Remaining matches the SRS study queue (due reviews + capped new cards). New cards use Front / Example (Front) / Back / Example (Back)
- Session size (10 / 20 / 40 / All; default 20) lives in Settings. Reviews award XP immediately (I know +5; new card +10; Study again awards none)
- Bottom nav: Decks, Study (hub at `/cards`), Stats, Settings. Tap Study on the hub to start a session

## Decks

- `/decks` lists color-coded decks with FSRS mastery progress: learned/total (Review state), due today, a bottom progress bar, and `% Mastered`
- Deck actions (edit, export, study, delete) live behind a ⋯ menu
- Deck detail (`/decks/:id`) uses the same collapsible Cards browser as the study hub (search, FSRS state filter, infinite list)

## Statistics

- `/stats` shows level and XP progress, current and best streak, a 90-day study activity heatmap, and deck mastery (review / learning / new breakdown)

## Theme

- Light/dark theme; mobile browser / PWA chrome (`theme-color`) matches the app background

## Install (PWA)

- Manifest name / short name: **Unki**. Icons: `pwa-192x192.png`, `pwa-512x512.png` (including maskable), plus `apple-touch-icon.png` for iOS home screen

## Backup

- Settings → Data Management: export a full `.zip` backup (decks, cards, reviews, stats, daily log, and images)
- Import restores the backup after confirmation; the app reloads on success. Import validates the archive in memory before overwriting IndexedDB

## Stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Dexie.js (IndexedDB)
- FSRS spaced repetition (`ts-fsrs`)
- `vite-plugin-pwa` for installable offline use

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
npm run convert:anki -- deck.apkg              # Anki .apkg → Unki zip
npm run convert:anki -- deck.apkg out.unki.zip
```

`convert:anki` reads `collection.anki2` / `collection.anki21`, maps note fields to `front` / `romaji` / `back` / `example`, copies `<img>` files into `images/`, and writes a v2 `deck.json` zip for PWA import.

## Releases (SemVer)

Bump version and create a `vX.Y.Z` git tag. `npm version` also runs the `version` lifecycle script, which updates `CHANGELOG.md` from Conventional Commits, stages it, then creates one release commit + tag:

```bash
npm run release:patch   # 0.0.0 → 0.0.1
npm run release:minor   # 0.0.1 → 0.1.0
npm run release:major   # 0.1.0 → 1.0.0
npm run push:all        # push branch + tags
```

## Git workflow

Work on the current integration branch (`develop` / `main`). Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation
- `chore:` tooling / deps
- `refactor:` no behavior change

Husky + commitlint reject non-conventional `commit-msg` values.

### Pre-push README check

Pushes fail unless `README.md` changed in the unpushed commits. Update the README, commit it, then push.

Bypass only when necessary:

```bash
SKIP_README_CHECK=1 git push
```
