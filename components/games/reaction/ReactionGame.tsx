"use client";

import { useEffect, useRef, useState } from "react";
import ReactionOnline from "./ReactionOnline";

type Phase = "idle" | "waiting" | "ready" | "clicked" | "toosoon";

const COLORS = [
  { bg: "bg-emerald-500", label: "GO!", text: "text-emerald-400" },
  { bg: "bg-blue-500", label: "GO!", text: "text-blue-400" },
  { bg: "bg-amber-400", label: "GO!", text: "text-amber-400" },
];

export default function ReactionGame() {
  const [mode, setMode] = useState<"solo" | "online" | null>(null);

  if (mode === "online") return <ReactionOnline onBack={() => setMode(null)} />;

  if (!mode) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-6 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Reaction Duel</h1>
          <p className="text-zinc-400">Tap the moment the screen changes</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button onClick={() => setMode("solo")}
            className="px-6 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold text-lg transition-colors">
            Solo
            <span className="block text-sm font-normal text-amber-100 mt-0.5">Test your reflexes</span>
          </button>
          <button onClick={() => setMode("online")}
            className="px-6 py-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-lg transition-colors border border-emerald-600">
            Play Online
            <span className="block text-sm font-normal text-emerald-200 mt-0.5">1v1 — fastest tap wins</span>
          </button>
        </div>
      </div>
    );
  }

  return <ReactionSolo onBack={() => setMode(null)} />;
}

function ReactionSolo({ onBack }: { onBack: () => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [best, setBest] = useState<number | null>(null);
  const [results, setResults] = useState<number[]>([]);
  const [colorIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef<number>(0);

  const startWaiting = () => {
    setPhase("waiting");
    setReactionTime(null);
    const delay = 1500 + Math.random() * 3500;
    timerRef.current = setTimeout(() => {
      startedAt.current = Date.now();
      setPhase("ready");
    }, delay);
  };

  const handleTap = () => {
    if (phase === "waiting") {
      clearTimeout(timerRef.current!);
      setPhase("toosoon");
    } else if (phase === "ready") {
      const rt = Date.now() - startedAt.current;
      setReactionTime(rt);
      setResults((r) => [...r, rt]);
      setBest((b) => (b === null || rt < b ? rt : b));
      setPhase("clicked");
    } else {
      startWaiting();
    }
  };

  useEffect(() => () => clearTimeout(timerRef.current!), []);

  const avg = results.length > 0 ? Math.round(results.reduce((a, b) => a + b, 0) / results.length) : null;
  const color = COLORS[colorIdx];

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4 w-full max-w-md mx-auto">
      <div className="flex flex-col items-center gap-1 w-full">
        <h1 className="text-2xl font-bold">Reaction Time</h1>
        <p className="text-sm text-zinc-400">Tap when the screen turns green</p>
        <div className="h-px w-full bg-zinc-800 mt-2" />
      </div>

      {results.length > 0 && (
        <div className="flex gap-4 justify-center">
          <div className="flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-2">
            <span className="text-xl font-bold text-amber-400">{best}ms</span>
            <span className="text-xs text-zinc-500">best</span>
          </div>
          <div className="flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-2">
            <span className="text-xl font-bold text-zinc-300">{avg}ms</span>
            <span className="text-xs text-zinc-500">avg ({results.length})</span>
          </div>
        </div>
      )}

      <button
        onClick={handleTap}
        className={`w-full rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors select-none touch-none
          ${phase === "ready" ? `${color.bg} text-white` : phase === "toosoon" ? "bg-red-600" : "bg-zinc-800 hover:bg-zinc-700"}`}
        style={{ height: 280 }}
      >
        {phase === "idle" && <span className="text-2xl font-bold text-zinc-300">Tap to Start</span>}
        {phase === "waiting" && <><span className="text-xl font-semibold text-zinc-400">Wait...</span><span className="text-sm text-zinc-600">Don&apos;t tap yet</span></>}
        {phase === "ready" && <><span className="text-4xl font-black text-white">TAP!</span></>}
        {phase === "clicked" && (
          <>
            <span className="text-4xl font-black text-emerald-400">{reactionTime}ms</span>
            <span className="text-sm text-zinc-400">Tap to go again</span>
          </>
        )}
        {phase === "toosoon" && (
          <>
            <span className="text-2xl font-bold text-white">Too soon!</span>
            <span className="text-sm text-red-200">Tap to try again</span>
          </>
        )}
      </button>

      {results.length >= 3 && (
        <div className="w-full">
          <p className="text-xs text-zinc-500 mb-2">Last {Math.min(results.length, 10)} attempts</p>
          <div className="flex gap-1 items-end h-16">
            {results.slice(-10).map((r, i) => (
              <div key={i} className="flex-1 bg-amber-500 rounded-sm opacity-80" style={{ height: `${Math.min(100, (r / 600) * 100)}%` }} title={`${r}ms`} />
            ))}
          </div>
        </div>
      )}

      <button onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-400 transition-colors">Back</button>
    </div>
  );
}
