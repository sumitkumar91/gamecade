"use client";

import { useEffect, useRef, useState } from "react";
import MemoryOnline from "./MemoryOnline";

const EMOJIS = ["🐶","🐱","🦊","🐸","🦋","🌸","🍕","🎸","🚀","🌈","⚡","🎯","🍩","🦄","🎃","🐙"];
const PAIRS = 8;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function makeCards() {
  const chosen = shuffle(EMOJIS).slice(0, PAIRS);
  return shuffle([...chosen, ...chosen].map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false })));
}

export default function MemoryGame() {
  const [mode, setMode] = useState<"solo" | "online" | null>(null);

  if (mode === "online") return <MemoryOnline onBack={() => setMode(null)} />;

  if (!mode) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-6 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Memory Battle</h1>
          <p className="text-zinc-400">Find all matching pairs</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button onClick={() => setMode("solo")}
            className="px-6 py-4 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold text-lg transition-colors">
            Solo
            <span className="block text-sm font-normal text-pink-200 mt-0.5">Beat your best time</span>
          </button>
          <button onClick={() => setMode("online")}
            className="px-6 py-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-lg transition-colors border border-emerald-600">
            Play Online
            <span className="block text-sm font-normal text-emerald-200 mt-0.5">Take turns, most pairs wins</span>
          </button>
        </div>
      </div>
    );
  }

  return <MemorySolo onBack={() => setMode(null)} />;
}

function MemorySolo({ onBack }: { onBack: () => void }) {
  const [cards, setCards] = useState(makeCards);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matched, setMatched] = useState(0);
  const [locked, setLocked] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false);
  const [best, setBest] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!started || matched === PAIRS) return;
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timerRef.current!);
  }, [started, matched]);

  useEffect(() => {
    if (matched === PAIRS) {
      clearInterval(timerRef.current!);
      setBest((b) => (b === null || elapsed < b ? elapsed : b));
    }
  }, [matched, elapsed]);

  const flip = (id: number) => {
    if (locked || flipped.includes(id) || cards.find((c) => c.id === id)?.matched) return;
    if (!started) setStarted(true);

    const next = [...flipped, id];
    setFlipped(next);
    setCards((cs) => cs.map((c) => c.id === id ? { ...c, flipped: true } : c));

    if (next.length === 2) {
      setMoves((m) => m + 1);
      setLocked(true);
      const [a, b] = next.map((id) => cards.find((c) => c.id === id)!);
      if (a.emoji === b.emoji) {
        setCards((cs) => cs.map((c) => next.includes(c.id) ? { ...c, matched: true } : c));
        setMatched((m) => m + 1);
        setFlipped([]);
        setLocked(false);
      } else {
        setTimeout(() => {
          setCards((cs) => cs.map((c) => next.includes(c.id) ? { ...c, flipped: false } : c));
          setFlipped([]);
          setLocked(false);
        }, 900);
      }
    }
  };

  const restart = () => {
    setCards(makeCards());
    setFlipped([]);
    setMoves(0);
    setMatched(0);
    setLocked(false);
    setElapsed(0);
    setStarted(false);
    clearInterval(timerRef.current!);
  };

  const done = matched === PAIRS;

  return (
    <div className="flex flex-col items-center gap-5 py-6 px-4 w-full max-w-md mx-auto">
      <div className="flex flex-col items-center gap-1 w-full">
        <h1 className="text-2xl font-bold">Memory Battle</h1>
        <p className="text-sm text-zinc-400">Flip and match all pairs</p>
        <div className="h-px w-full bg-zinc-800 mt-2" />
      </div>

      <div className="flex gap-3 justify-center">
        {[{ label: "moves", value: moves, color: "text-pink-400" },
          { label: "pairs", value: `${matched}/${PAIRS}`, color: "text-emerald-400" },
          { label: "time", value: `${elapsed}s`, color: "text-zinc-300" },
          ...(best !== null ? [{ label: "best", value: `${best}s`, color: "text-amber-400" }] : []),
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2">
            <span className={`text-xl font-bold ${color}`}>{value}</span>
            <span className="text-xs text-zinc-500">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-2 w-full">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => flip(card.id)}
            disabled={card.matched || locked}
            className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all duration-300 select-none
              ${card.flipped || card.matched
                ? card.matched ? "bg-emerald-800/40 border border-emerald-600 scale-95" : "bg-zinc-700 border border-zinc-600"
                : "bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:scale-105"}`}
          >
            {(card.flipped || card.matched) ? card.emoji : ""}
          </button>
        ))}
      </div>

      {done && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-emerald-400 font-bold text-lg">All pairs found! {moves} moves, {elapsed}s</p>
          <button onClick={restart} className="px-6 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold transition-colors">
            Play Again
          </button>
        </div>
      )}

      <button onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-400">Back</button>
    </div>
  );
}
