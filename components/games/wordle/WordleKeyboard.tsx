"use client";

import { TileState, LetterMap } from "./wordle";

const ROWS = [
  ["Q","W","E","R","T","Y","U","I","O","P"],
  ["A","S","D","F","G","H","J","K","L"],
  ["ENTER","Z","X","C","V","B","N","M","⌫"],
];

interface KeyboardProps {
  letterMap: LetterMap;
  onKey: (key: string) => void;
}

export default function WordleKeyboard({ letterMap, onKey }: KeyboardProps) {
  const colorMap: Record<TileState, string> = {
    correct: "bg-emerald-600 text-white border-emerald-600",
    present: "bg-amber-500 text-white border-amber-500",
    absent: "bg-zinc-700 text-zinc-400 border-zinc-700",
    tbd: "bg-zinc-600 text-zinc-50 border-zinc-600",
    empty: "bg-zinc-600 text-zinc-50 border-zinc-600",
  };

  return (
    <div className="flex flex-col items-center gap-1.5 w-full px-1">
      {ROWS.map((row, ri) => (
        <div key={ri} className="flex gap-1 w-full justify-center">
          {row.map((key) => {
            const state = letterMap[key] ?? "empty";
            const color = colorMap[state];
            const wide = key === "ENTER" || key === "⌫";
            return (
              <button
                key={key}
                onClick={() => onKey(key)}
                className={`flex items-center justify-center rounded font-bold uppercase transition-colors active:scale-95 select-none
                  ${wide ? "flex-[1.5] text-xs" : "flex-1"} h-14 min-w-0
                  ${color} border`}
              >
                {key}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
