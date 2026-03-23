# Gamecade

A collection of browser-based mini games built with Next.js, TypeScript, and Tailwind CSS.

## Games

### Word Hunt
Find as many words as you can in a 4×4 letter grid before the 60-second timer runs out. Trace a path through adjacent letters (including diagonals) to form words. Longer words score more points. Best score is saved locally.

- 55,111-word dictionary (3–6 letters)
- Scoring: 3 letters = 100pts, 4 = 200pts, 5 = 400pts, 6+ = 800pts
- Trie-based word validation for instant lookups

### Wordle
Guess the secret 5-letter word in 6 tries. After each guess, tiles flip to show how close you are — green for the right letter in the right spot, yellow for the right letter in the wrong spot, gray for letters not in the word.

- 2,309 answer words (original Wordle list)
- 12,966 valid guesses (original allowed list)
- Unlimited play — new random word each game

### Tic Tac Toe
Classic 3×3 grid. Choose to play against an unbeatable AI or a friend on the same device.

- AI uses minimax with alpha-beta pruning — it never loses
- Persistent win/draw/loss scoreboard per session

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **State:** React hooks only — no external state library
- **Storage:** `localStorage` for scores and best scores
- **Rendering:** All pages statically prerendered

## Project Structure

```
app/
  page.tsx              # Game hub / lobby
  wordle/page.tsx
  tictactoe/page.tsx
  wordhunt/page.tsx
components/
  GameCard.tsx
  games/
    wordle/             # WordleGame, WordleBoard, WordleKeyboard, wordle.ts
    tictactoe/          # TicTacToeGame, minimax.ts
    wordhunt/           # WordHuntGame, wordhunt.ts
lib/
  words.ts              # Wordle answer list + valid guesses
  wordhunt-dict.ts      # 55k-word dictionary for Word Hunt
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run build   # production build
npm run start   # serve production build
```
