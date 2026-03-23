"use client";

import { TileState } from "./wordle";

interface TileProps {
  letter: string;
  state: TileState;
  reveal?: boolean;
  revealDelay?: number;
  bounce?: boolean;
  bounceDelay?: number;
  pop?: boolean;
}

function Tile({ letter, state, reveal, revealDelay = 0, bounce, bounceDelay = 0, pop }: TileProps) {
  const base =
    "flex h-14 w-14 items-center justify-center rounded text-xl font-bold uppercase transition-colors select-none";

  const colors: Record<TileState, string> = {
    correct: "bg-emerald-600 border-emerald-600 text-white",
    present: "bg-amber-500 border-amber-500 text-white",
    absent: "bg-zinc-700 border-zinc-700 text-zinc-300",
    empty: "border-2 border-zinc-700 bg-transparent text-zinc-50",
    tbd: "border-2 border-zinc-400 bg-transparent text-zinc-50",
  };

  const animClass = reveal
    ? "tile-flip"
    : bounce
    ? "tile-bounce"
    : pop
    ? "tile-pop"
    : "";

  const style: React.CSSProperties = {};
  if (reveal) style.animationDelay = `${revealDelay}ms`;
  if (bounce) style.animationDelay = `${bounceDelay}ms`;

  return (
    <div
      className={`${base} ${colors[state]} ${animClass}`}
      style={style}
    >
      {letter}
    </div>
  );
}

interface WordleBoardProps {
  guesses: string[];
  states: TileState[][];
  currentGuess: string;
  currentRow: number;
  revealingRow: number | null;
  won: boolean;
  shake: boolean;
}

export default function WordleBoard({
  guesses,
  states,
  currentGuess,
  currentRow,
  revealingRow,
  won,
  shake,
}: WordleBoardProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {Array.from({ length: 6 }, (_, row) => {
        const isCurrentRow = row === currentRow;
        const isRevealing = row === revealingRow;
        const isWonRow = won && row === currentRow - 1;

        return (
          <div
            key={row}
            className={`flex gap-1.5 ${isCurrentRow && shake ? "row-shake" : ""}`}
          >
            {Array.from({ length: 5 }, (_, col) => {
              let letter = "";
              let state: TileState = "empty";

              if (row < currentRow) {
                letter = guesses[row]?.[col] ?? "";
                state = states[row]?.[col] ?? "absent";
              } else if (isCurrentRow) {
                letter = currentGuess[col] ?? "";
                state = letter ? "tbd" : "empty";
              }

              return (
                <Tile
                  key={col}
                  letter={letter}
                  state={isRevealing || row < revealingRow! ? state : row < currentRow ? state : state}
                  reveal={isRevealing}
                  revealDelay={col * 300}
                  bounce={isWonRow}
                  bounceDelay={col * 100}
                  pop={isCurrentRow && !!letter && !won}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
