"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const GAME_DURATION = 30;
const TARGET_LIFETIME = 1200;
const MAX_TARGETS = 3;

interface Target {
  id: number;
  x: number; // percent
  y: number; // percent
  size: number;
  born: number;
}

interface ClickDot {
  id: number;
  x: number;
  y: number;
  hit: boolean;
}

let nextId = 1;

export default function AimGame() {
  const [phase, setPhase] = useState<"idle" | "playing" | "ended">("idle");
  const [targets, setTargets] = useState<Target[]>([]);
  const [clicks, setClicks] = useState<ClickDot[]>([]);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [avgReaction, setAvgReaction] = useState(0);
  const reactions = useRef<number[]>([]);
  const arenaRef = useRef<HTMLDivElement>(null);
  const spawnRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expireRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGame = () => {
    setPhase("playing");
    setTargets([]);
    setClicks([]);
    setHits(0);
    setMisses(0);
    setTimeLeft(GAME_DURATION);
    setAvgReaction(0);
    reactions.current = [];
  };

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          setPhase("ended");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  // Spawn targets
  useEffect(() => {
    if (phase !== "playing") return;
    spawnRef.current = setInterval(() => {
      setTargets((prev) => {
        if (prev.length >= MAX_TARGETS) return prev;
        const size = 40 + Math.random() * 30;
        return [...prev, {
          id: nextId++,
          x: 5 + Math.random() * 80,
          y: 5 + Math.random() * 80,
          size,
          born: Date.now(),
        }];
      });
    }, 500);
    return () => clearInterval(spawnRef.current!);
  }, [phase]);

  // Expire old targets
  useEffect(() => {
    if (phase !== "playing") return;
    expireRef.current = setInterval(() => {
      const now = Date.now();
      setTargets((prev) => {
        const expired = prev.filter((t) => now - t.born > TARGET_LIFETIME);
        if (expired.length > 0) setMisses((m) => m + expired.length);
        return prev.filter((t) => now - t.born <= TARGET_LIFETIME);
      });
    }, 100);
    return () => clearInterval(expireRef.current!);
  }, [phase]);

  const hitTarget = useCallback((id: number, born: number, e: React.PointerEvent) => {
    e.stopPropagation();
    const reaction = Date.now() - born;
    reactions.current.push(reaction);
    const avg = Math.round(reactions.current.reduce((a, b) => a + b, 0) / reactions.current.length);
    setAvgReaction(avg);
    setHits((h) => h + 1);
    setTargets((prev) => prev.filter((t) => t.id !== id));

    // click dot
    const rect = arenaRef.current?.getBoundingClientRect();
    if (rect) {
      const dot: ClickDot = { id: nextId++, x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100, hit: true };
      setClicks((c) => [...c.slice(-80), dot]);
    }
  }, []);

  const handleArenaClick = useCallback((e: React.PointerEvent) => {
    setMisses((m) => m + 1);
    const rect = arenaRef.current?.getBoundingClientRect();
    if (rect) {
      const dot: ClickDot = { id: nextId++, x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100, hit: false };
      setClicks((c) => [...c.slice(-80), dot]);
    }
  }, []);

  const total = hits + misses;
  const accuracy = total > 0 ? Math.round((hits / total) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-4 py-6 px-4 w-full max-w-2xl mx-auto">
      <div className="flex flex-col items-center gap-1 w-full">
        <h1 className="text-2xl font-bold">Aim Trainer</h1>
        <p className="text-sm text-zinc-400">Click targets as fast as you can</p>
        <div className="h-px w-full bg-zinc-800 mt-2" />
      </div>

      {/* Stats */}
      <div className="flex gap-3 w-full justify-center flex-wrap">
        {[
          { label: "time", value: timeLeft, color: timeLeft <= 5 ? "text-red-400" : "text-zinc-50" },
          { label: "hits", value: hits, color: "text-emerald-400" },
          { label: "misses", value: misses, color: "text-red-400" },
          { label: "accuracy", value: `${accuracy}%`, color: "text-amber-400" },
          { label: "avg ms", value: avgReaction || "--", color: "text-blue-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 min-w-[64px]">
            <span className={`text-xl font-bold ${color}`}>{value}</span>
            <span className="text-xs text-zinc-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Arena */}
      <div
        ref={arenaRef}
        onPointerDown={phase === "playing" ? handleArenaClick : undefined}
        className="relative w-full rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden"
        style={{ height: "380px", cursor: phase === "playing" ? "crosshair" : "default" }}
      >
        {phase === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <p className="text-zinc-400 text-sm">30 seconds — click targets before they vanish</p>
            <button onClick={startGame} className="px-8 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-lg transition-colors">
              Start
            </button>
          </div>
        )}

        {phase === "ended" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-zinc-900/90 z-20">
            <p className="text-2xl font-bold text-zinc-50">Time&apos;s up!</p>
            <div className="flex gap-6 text-center">
              <div><p className="text-3xl font-bold text-emerald-400">{hits}</p><p className="text-xs text-zinc-500">hits</p></div>
              <div><p className="text-3xl font-bold text-amber-400">{accuracy}%</p><p className="text-xs text-zinc-500">accuracy</p></div>
              <div><p className="text-3xl font-bold text-blue-400">{avgReaction || "--"}</p><p className="text-xs text-zinc-500">avg ms</p></div>
            </div>
            <button onClick={startGame} className="px-8 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors">
              Play Again
            </button>
          </div>
        )}

        {/* Heatmap dots */}
        {clicks.map((dot) => (
          <div
            key={dot.id}
            className="absolute w-3 h-3 rounded-full pointer-events-none opacity-60"
            style={{
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              transform: "translate(-50%,-50%)",
              background: dot.hit ? "rgba(52,211,153,0.8)" : "rgba(248,113,113,0.6)",
            }}
          />
        ))}

        {/* Targets */}
        {targets.map((t) => (
          <button
            key={t.id}
            onPointerDown={(e) => hitTarget(t.id, t.born, e)}
            className="absolute rounded-full bg-red-500 hover:bg-red-400 border-2 border-red-300 transition-transform active:scale-90 shadow-lg shadow-red-500/40 flex items-center justify-center"
            style={{
              left: `${t.x}%`,
              top: `${t.y}%`,
              width: t.size,
              height: t.size,
              transform: "translate(-50%,-50%)",
            }}
          >
            <div className="w-2 h-2 rounded-full bg-white opacity-60" />
          </button>
        ))}
      </div>
    </div>
  );
}
