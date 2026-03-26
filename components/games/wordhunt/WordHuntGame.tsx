"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildTrie,
  generateGrid,
  isAdjacent,
  isValidWord,
  scoreWord,
  TrieNode,
} from "./wordhunt";
import { WORD_HUNT_DICT } from "@/lib/wordhunt-dict";
import WordHuntOnline from "./WordHuntOnline";

const GAME_DURATION = 60;

function useBestScore(): [number, (s: number) => void] {
  const [best, setBestState] = useState(0);
  useEffect(() => {
    try {
      const v = localStorage.getItem("wordhunt-best");
      if (v) setBestState(parseInt(v, 10));
    } catch {}
  }, []);
  const setBest = (s: number) => {
    setBestState(s);
    try { localStorage.setItem("wordhunt-best", String(s)); } catch {}
  };
  return [best, setBest];
}

interface Cell {
  r: number;
  c: number;
}

export default function WordHuntGame() {
  const [mode, setMode] = useState<"solo" | "online" | null>(null);

  if (mode === null) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-6 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Word Hunt</h1>
          <p className="text-zinc-400">Choose your mode</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => setMode("solo")}
            className="px-6 py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-lg transition-colors"
          >
            Solo
            <span className="block text-sm font-normal text-violet-200 mt-0.5">60 seconds, beat your best</span>
          </button>
          <button
            onClick={() => setMode("online")}
            className="px-6 py-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-lg transition-colors border border-emerald-600"
          >
            Play Online
            <span className="block text-sm font-normal text-emerald-200 mt-0.5">Same grid, real-time vs opponent</span>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "online") {
    return <WordHuntOnline onBack={() => setMode(null)} />;
  }

  return <WordHuntSolo onBack={() => setMode(null)} />;
}

function WordHuntSolo({ onBack }: { onBack: () => void }) {
  const [grid, setGrid] = useState<string[][]>(() => generateGrid());
  const [trie] = useState<TrieNode>(() => buildTrie(WORD_HUNT_DICT));
  const [gameState, setGameState] = useState<"idle" | "playing" | "ended">("idle");
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [path, setPath] = useState<Cell[]>([]);
  const [dragging, setDragging] = useState(false);
  const [foundWords, setFoundWords] = useState<Map<string, number>>(new Map());
  const [score, setScore] = useState(0);
  const [flashWord, setFlashWord] = useState<{ word: string; pts: number } | null>(null);
  const [invalidFlash, setInvalidFlash] = useState(false);
  const [bestScore, setBestScore] = useBestScore();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGame = () => {
    setGrid(generateGrid());
    setFoundWords(new Map());
    setScore(0);
    setPath([]);
    setDragging(false);
    setTimeLeft(GAME_DURATION);
    setGameState("playing");
  };

  // Timer
  useEffect(() => {
    if (gameState !== "playing") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setGameState("ended");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [gameState]);

  // Save best score on end
  useEffect(() => {
    if (gameState === "ended" && score > bestScore) {
      setBestScore(score);
    }
  }, [gameState, score, bestScore, setBestScore]);

  const submitPath = useCallback(() => {
    if (path.length < 3) { setPath([]); setDragging(false); return; }
    const word = path.map(({ r, c }) => grid[r][c]).join("");

    if (isValidWord(trie, word) && !foundWords.has(word)) {
      const pts = scoreWord(word);
      const next = new Map(foundWords);
      next.set(word, pts);
      setFoundWords(next);
      setScore((s) => s + pts);
      setFlashWord({ word, pts });
      setTimeout(() => setFlashWord(null), 1000);
    } else if (!foundWords.has(word)) {
      setInvalidFlash(true);
      setTimeout(() => setInvalidFlash(false), 400);
    }

    setPath([]);
    setDragging(false);
  }, [path, grid, trie, foundWords]);

  const draggingRef = useRef(false);
  const pathRef = useRef<Cell[]>([]);

  const enterCell = useCallback(
    (r: number, c: number) => {
      if (!draggingRef.current || gameState !== "playing") return;
      const current = pathRef.current;
      const last = current[current.length - 1];
      const cell = { r, c };
      if (current.some((p) => p.r === r && p.c === c)) return;
      if (!isAdjacent(last, cell)) return;
      const next = [...current, cell];
      pathRef.current = next;
      setPath(next);
    },
    [gameState]
  );

  const handlePointerDown = useCallback(
    (r: number, c: number) => {
      if (gameState !== "playing") return;
      draggingRef.current = true;
      pathRef.current = [{ r, c }];
      setDragging(true);
      setPath([{ r, c }]);
    },
    [gameState]
  );

  const handlePointerEnter = useCallback(
    (r: number, c: number) => enterCell(r, c),
    [enterCell]
  );

  // On mobile, pointerenter doesn't fire on elements under the finger —
  // use pointermove + elementFromPoint on the grid container instead.
  const gridRef = useRef<HTMLDivElement>(null);
  const handleGridPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current || gameState !== "playing") return;
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      if (!el) return;
      const r = el.dataset.row;
      const c = el.dataset.col;
      if (r !== undefined && c !== undefined) {
        enterCell(Number(r), Number(c));
      }
    },
    [gameState, enterCell]
  );

  const handlePointerUp = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    submitPath();
  }, [submitPath]);

  // Global pointer up to catch releases outside grid
  useEffect(() => {
    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, [handlePointerUp]);

  const currentWord = path.map(({ r, c }) => grid[r][c]).join("");
  const pathSet = new Set(path.map(({ r, c }) => `${r},${c}`));
  const sortedWords = [...foundWords.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4 w-full max-w-lg mx-auto">
      <div className="flex flex-col items-center gap-1 w-full">
        <h1 className="text-2xl font-bold">Word Hunt</h1>
        <p className="text-sm text-zinc-400">Find words by tracing connected letters</p>
        <div className="h-px w-full bg-zinc-800 mt-2" />
      </div>

      {/* Stats bar */}
      <div className="flex gap-4 w-full justify-center">
        <div className="flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3 min-w-[80px]">
          <span className={`text-2xl font-bold ${timeLeft <= 10 ? "text-red-400" : "text-zinc-50"}`}>
            {timeLeft}
          </span>
          <span className="text-xs text-zinc-500">seconds</span>
        </div>
        <div className="flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3 min-w-[80px]">
          <span className="text-2xl font-bold text-violet-400">{score}</span>
          <span className="text-xs text-zinc-500">score</span>
        </div>
        <div className="flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3 min-w-[80px]">
          <span className="text-2xl font-bold text-zinc-400">{bestScore}</span>
          <span className="text-xs text-zinc-500">best</span>
        </div>
      </div>

      {/* Current word display */}
      <div className="h-10 flex items-center justify-center">
        {gameState === "playing" && (
          <span
            className={`text-xl font-bold uppercase tracking-widest transition-colors
              ${invalidFlash ? "text-red-400" : "text-zinc-50"}`}
          >
            {currentWord || "\u00A0"}
          </span>
        )}
        {flashWord && (
          <span className="absolute text-emerald-400 font-bold text-lg animate-bounce">
            +{flashWord.pts} {flashWord.word}
          </span>
        )}
      </div>

      {/* Grid */}
      <div
        ref={gridRef}
        className="grid grid-cols-4 gap-2 select-none touch-none"
        onPointerMove={handleGridPointerMove}
        onPointerLeave={() => { if (draggingRef.current) { draggingRef.current = false; submitPath(); } }}
        onPointerDown={(e) => {
          const el = e.target as HTMLElement;
          const r = el.dataset.row;
          const c = el.dataset.col;
          if (r !== undefined && c !== undefined) handlePointerDown(Number(r), Number(c));
        }}
      >
        {grid.map((row, r) =>
          row.map((letter, c) => {
            const key = `${r},${c}`;
            const inPath = pathSet.has(key);
            const pathIndex = path.findIndex((p) => p.r === r && p.c === c);
            const isLast = pathIndex === path.length - 1 && path.length > 0;

            return (
              <button
                key={key}
                data-row={r}
                data-col={c}
                onPointerDown={() => handlePointerDown(r, c)}
                onPointerEnter={() => handlePointerEnter(r, c)}
                className={`flex items-center justify-center w-20 h-20 rounded-xl text-2xl font-bold uppercase
                  transition-all touch-none select-none
                  ${inPath
                    ? isLast
                      ? "bg-violet-500 text-white scale-110 shadow-lg shadow-violet-500/30"
                      : "bg-violet-700 text-white scale-105"
                    : gameState === "playing"
                    ? "bg-zinc-800 text-zinc-50"
                    : "bg-zinc-800 text-zinc-50"
                  }`}
                disabled={gameState !== "playing"}
              >
                {letter}
              </button>
            );
          })
        )}
      </div>

      {/* Action button */}
      {gameState === "idle" && (
        <button
          onClick={startGame}
          className="px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-lg transition-colors"
        >
          Start Game
        </button>
      )}

      {gameState === "ended" && (
        <div className="flex flex-col items-center gap-3 w-full">
          <p className="text-zinc-300 font-semibold">
            Time&apos;s up! You scored <span className="text-violet-400 font-bold">{score}</span> pts
            {score >= bestScore && score > 0 && (
              <span className="ml-2 text-amber-400">— new best!</span>
            )}
          </p>
          <button
            onClick={startGame}
            className="px-8 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-lg transition-colors"
          >
            Play Again
          </button>
        </div>
      )}

      {/* Found words list */}
      {foundWords.size > 0 && (
        <div className="w-full">
          <p className="text-sm text-zinc-400 mb-2">
            Found {foundWords.size} word{foundWords.size !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
            {sortedWords.map(([word, pts]) => (
              <span
                key={word}
                className="px-2 py-1 rounded-md bg-zinc-800 text-sm font-medium text-zinc-200"
                title={`+${pts} pts`}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Scoring guide */}
      <div className="text-xs text-zinc-600 flex gap-4">
        <span>3 letters = 100</span>
        <span>4 = 200</span>
        <span>5 = 400</span>
        <span>6+ = 800</span>
      </div>
    </div>
  );
}
