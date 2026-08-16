# Unki

Local-first flashcard PWA (Anki-style). Hosted on GitHub Pages with no backend — decks, cards, images, reviews, and streaks live in IndexedDB via Dexie.

## Study

- Before a session, choose **Classic Review** or **Dungeon Run**. Session size (Dungeon Depth: 10 / 20 / 40 / All; default 20) lives in Settings
- Tap a card to flip (true 3D faces). The front uses the deck color; the back follows light/dark theme
- **Classic:** flip freely, grade with Study again / I know (no peek lock, no HP loss, no chests/loot). Session banks base EXP only
- **Dungeon Run:** while the question is showing, swipe **left** (Study again) or **right** (I know), or use the buttons. I know banks Good immediately, or (for short answers ≤ 10 characters) may roll a level-scaled challenge first (5% + 1%/level, max 50%). Peeking the back locks I know. Pass the challenge to bank Good; fail it (or Study again) to take Again damage. Study again schedules a 5-minute relearn (12 hours if Exhausted) and leaves the session queue — the same card is not shown again until the next session
- Ratings show RPG floating combat text (hearts / EXP); Study again also shakes the screen in Dungeon Run. Exhausted reviews show EXP without the ATK bonus
- Short questions (≤ 100 characters) are spoken on flip via the Web Speech API
- Hub (`/cards`, center nav) shows Learned / Learning / New counts, streak, Level / rank / XP, hearts, coins, and ATK. New cards use Front / Example (Front) / Back / Example (Back); the add/edit dialog no longer asks for an image
- Dungeon Run uses a generated name (e.g. Forgotten Sanctum). The bottom nav is hidden and there is no Back link. Flee (door icon) warns that banked EXP and coins will be lost. The in-run bag can use Health Potions or an Escape Rope (keeps the run bank and returns you to Hero). SRS due dates save immediately; rewards only persist on a clear or a safe rope escape
- Reviews award XP (I know +5 + ATK; new card +10; Study again awards none). In Dungeon Run, Study again costs hearts mitigated by Defense — each DEF point cuts 10% damage, max 80%. 0 hearts = Exhausted (no ATK bonus) until you restore a heart with a Health Potion or the Inn
- Hearts sit at the top of Dungeon Run and no longer heal from Good answers. Open the Hero tab for rank, EXP, hearts, ATK, DEF, coins, and the backpack grid — tap a slot to use an item. The Shop tab buys potions, scrolls, and ropes, sells trinkets (full value) or leftover consumables (half price), and the Inn restores all hearts for 15 coins
- After I know in Dungeon Run, a 15% roll can pause the queue on a chest; swipe up to flip it open. Most chests are a named trinket (stash and sell at the Shop); the rest are a potion or scroll.

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
