# Unki

Local-first flashcard PWA (Anki-style). Hosted on GitHub Pages with no backend — decks, cards, images, reviews, and streaks live in IndexedDB via Dexie.

## Study

- Tap a card to flip (true 3D faces). The front uses the deck color; the back follows light/dark theme
- While the question is showing, swipe **left** (Study again) or **right** (I know), or use the buttons. I know banks Good immediately, or (for short answers ≤ 10 characters) may roll a level-scaled challenge first (5% + 1%/level, max 50%). Peeking the back locks I know. Pass the challenge to bank Good; fail it (or Study again) to schedule a 5-minute relearn and leave the session queue
- Short questions (≤ 100 characters) are spoken on flip via the Web Speech API
- Hub (`/cards`) shows Learned / Learning / New counts, streak, and Level / rank / XP. New cards use Front / Example (Front) / Back / Example (Back)
- Session size (10 / 20 / 40 / All; default 20) lives in Settings. Reviews award XP immediately (I know +5; new card +10; Study again awards none)
- Bottom nav: Decks, Study (hub at `/cards`), Settings. Tap Study on the hub to start a session

## Stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Dexie.js (IndexedDB)
- SM-2 spaced repetition
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
