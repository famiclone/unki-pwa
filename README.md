# Unki

Local-first flashcard PWA (Anki-style). Hosted on GitHub Pages with no backend — decks, cards, images, reviews, and streaks live in IndexedDB via Dexie.

## Study

- Tap a card to flip (true 3D faces). The front uses the deck color; the back follows light/dark theme
- Swipe **left** (Study again) or **right** (I know) on either face, or use the buttons. Flip to check the answer, then rate. I know before peeking may roll a level-scaled challenge on short answers (≤ 10 characters; 5% + 1%/level, max 50%): type, scramble, or reverse multiple-choice. After peeking, I know grades from recall time (Easy / Good / Hard)
- After each grade, a short pause shows feedback before the next card
- Short questions (≤ 100 characters) are spoken on flip via the Web Speech API
- Hub (`/cards`) shows today’s plan (learned / remaining / added), streak, and Level / XP. Remaining matches the SRS study queue (due reviews + capped new cards). New cards use Front / Example (Front) / Back / Example (Back)
- Session size (10 / 20 / 40 / All; default 20) lives in Settings. Reviews award XP immediately (I know +5; new card +10; Study again awards none)
- Bottom nav: Decks, Study (hub at `/cards`), Stats, Settings. Tap Study on the hub to start a session

## Decks

- `/decks` lists color-coded decks with FSRS mastery progress: learned/total (Review state), due today, a bottom progress bar, and `% Mastered`
- Deck actions (edit, export, study, delete) live behind a ⋯ menu

## Statistics

- `/stats` shows level and XP progress, current and best streak, a 90-day study activity heatmap, and deck mastery (review / learning / new breakdown)

## Theme

- Light/dark theme; mobile browser / PWA chrome (`theme-color`) matches the app background

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
