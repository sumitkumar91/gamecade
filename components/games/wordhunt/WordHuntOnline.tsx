"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import usePartySocket from "partysocket/react";
import { buildTrie, isAdjacent, isValidWord, scoreWord, TrieNode } from "./wordhunt";
import { WORD_HUNT_DICT } from "@/lib/wordhunt-dict";

const HOST = "gamecade.sumitkumar91.partykit.dev";
const GAME_DURATION = 60;

interface Cell { r: number; c: number; }
interface PlayerState { id: string; score: number; words: number; done: boolean; }
interface GameState {
  grid: string[][];
  players: PlayerState[];
  phase: "waiting" | "playing" | "ended";
  startedAt: number | null;
}

function generateRoomId() {
  return "WH-" + Math.random().toString(36).slice(2, 7).toUpperCase();
}

export default function WordHuntOnline({ onBack }: { onBack: () => void }) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [inputRoom, setInputRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [serverState, setServerState] = useState<GameState | null>(null);
  const [trie] = useState<TrieNode>(() => buildTrie(WORD_HUNT_DICT));

  // Local game state
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [path, setPath] = useState<Cell[]>([]);
  const [foundWords, setFoundWords] = useState<Set<string>>(new Set());
  const [flashWord, setFlashWord] = useState<{ word: string; pts: number } | null>(null);
  const [invalidFlash, setInvalidFlash] = useState(false);
  const [localDone, setLocalDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const draggingRef = useRef(false);
  const pathRef = useRef<Cell[]>([]);
  const gridRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const socket = usePartySocket({
    host: HOST,
    room: roomId ?? "__lobby__",
    onMessage(e) {
      const msg = JSON.parse(e.data);
      if (msg.type === "state") setServerState(msg.state);
    },
  });

  const myId = socket.id;
  const me = serverState?.players.find((p) => p.id === myId);
  const opponent = serverState?.players.find((p) => p.id !== myId);
  const phase = serverState?.phase ?? "waiting";
  const grid = serverState?.grid ?? [];

  // Timer — driven by server startedAt
  useEffect(() => {
    if (phase !== "playing" || !serverState?.startedAt) return;
    if (timerRef.current) clearInterval(timerRef.current);

    // Reset local state when a new game starts
    setFoundWords(new Set());
    setPath([]);
    pathRef.current = [];
    draggingRef.current = false;
    setLocalDone(false);

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - serverState.startedAt!) / 1000);
      const remaining = Math.max(0, GAME_DURATION - elapsed);
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(timerRef.current!);
        if (!localDone) {
          setLocalDone(true);
          socket.send(JSON.stringify({ type: "done" }));
        }
      }
    }, 500);

    return () => clearInterval(timerRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, serverState?.startedAt]);

  const submitPath = useCallback(() => {
    if (pathRef.current.length < 3 || grid.length === 0) {
      pathRef.current = [];
      setPath([]);
      draggingRef.current = false;
      return;
    }
    const word = pathRef.current.map(({ r, c }) => grid[r][c]).join("");

    if (isValidWord(trie, word) && !foundWords.has(word)) {
      const pts = scoreWord(word);
      setFoundWords((prev) => new Set(prev).add(word));
      setFlashWord({ word, pts });
      setTimeout(() => setFlashWord(null), 1000);
      socket.send(JSON.stringify({ type: "word", word, pts }));
    } else if (!foundWords.has(word) && word.length >= 3) {
      setInvalidFlash(true);
      setTimeout(() => setInvalidFlash(false), 400);
    }

    pathRef.current = [];
    setPath([]);
    draggingRef.current = false;
  }, [grid, trie, foundWords, socket]);

  const enterCell = useCallback((r: number, c: number) => {
    if (!draggingRef.current || phase !== "playing" || localDone) return;
    const current = pathRef.current;
    const last = current[current.length - 1];
    if (current.some((p) => p.r === r && p.c === c)) return;
    if (!isAdjacent(last, { r, c })) return;
    const next = [...current, { r, c }];
    pathRef.current = next;
    setPath(next);
  }, [phase, localDone]);

  const handlePointerDown = useCallback((r: number, c: number) => {
    if (phase !== "playing" || localDone) return;
    draggingRef.current = true;
    pathRef.current = [{ r, c }];
    setDragging(true);
    setPath([{ r, c }]);
  }, [phase, localDone]);

  const [dragging, setDragging] = useState(false);

  const handleGridPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    if (!el) return;
    const r = el.dataset.row;
    const c = el.dataset.col;
    if (r !== undefined && c !== undefined) enterCell(Number(r), Number(c));
  }, [enterCell]);

  const handlePointerUp = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    submitPath();
  }, [submitPath]);

  useEffect(() => {
    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, [handlePointerUp]);

  function createRoom() {
    const id = generateRoomId();
    setRoomId(id);
    setJoined(true);
  }

  function joinRoom() {
    if (!inputRoom.trim()) return;
    const raw = inputRoom.trim().toUpperCase();
    setRoomId(raw.startsWith("WH-") ? raw : "WH-" + raw);
    setJoined(true);
  }

  function copyRoom() {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId?.split('-').slice(1).join('-') ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const pathSet = new Set(path.map(({ r, c }) => `${r},${c}`));
  const currentWord = path.map(({ r, c }) => grid[r]?.[c] ?? "").join("");

  // Lobby
  if (!joined) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-6 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Word Hunt — Online</h1>
          <p className="text-zinc-400">Same grid, 60 seconds, highest score wins</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={createRoom}
            className="px-6 py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-lg transition-colors"
          >
            Create Room
          </button>
          <div className="flex gap-2">
            <input
              value={inputRoom}
              onChange={(e) => setInputRoom(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              placeholder="ROOM CODE"
              maxLength={6}
              className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-50 font-mono tracking-widest uppercase text-center placeholder:text-zinc-600 outline-none focus:border-zinc-500"
            />
            <button
              onClick={joinRoom}
              className="px-4 py-3 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-semibold transition-colors"
            >
              Join
            </button>
          </div>
          <button onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors mt-2">
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // Waiting
  if (phase === "waiting") {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 px-4">
        <div className="w-8 h-8 border-2 border-zinc-600 border-t-violet-400 rounded-full animate-spin" />
        <p className="text-zinc-300 font-semibold">Waiting for opponent...</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-zinc-400 tracking-widest">{roomId?.split("-").slice(1).join("-")}</span>
          <button onClick={copyRoom} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        <button onClick={onBack} className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors mt-4">
          ← Back
        </button>
      </div>
    );
  }

  // Ended
  if (phase === "ended" && serverState) {
    const myScore = me?.score ?? 0;
    const oppScore = opponent?.score ?? 0;
    const won = myScore > oppScore;
    const draw = myScore === oppScore;
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-6 px-4 text-center">
        <h2 className="text-3xl font-bold">
          {draw ? "Draw!" : won ? "You Win! 🎉" : "You Lose!"}
        </h2>
        <div className="flex gap-6">
          <div className="flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-xl px-6 py-4">
            <span className="text-3xl font-bold text-violet-400">{myScore}</span>
            <span className="text-xs text-zinc-500 mt-1">You · {me?.words ?? 0} words</span>
          </div>
          <div className="flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-xl px-6 py-4">
            <span className="text-3xl font-bold text-zinc-400">{oppScore}</span>
            <span className="text-xs text-zinc-500 mt-1">Opponent · {opponent?.words ?? 0} words</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => socket.send(JSON.stringify({ type: "rematch" }))}
            className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
          >
            Rematch
          </button>
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition-colors"
          >
            Leave
          </button>
        </div>
      </div>
    );
  }

  // Playing
  return (
    <div className="flex flex-col items-center gap-4 py-6 px-4 w-full max-w-lg mx-auto">
      <div className="flex flex-col items-center gap-1 w-full">
        <h1 className="text-xl font-bold">Word Hunt — Online</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 font-mono">Room: {roomId?.split("-").slice(1).join("-")}</span>
          <button onClick={copyRoom} className="text-xs text-zinc-600 hover:text-zinc-400">{copied ? "Copied!" : "Copy"}</button>
        </div>
        <div className="h-px w-full bg-zinc-800 mt-1" />
      </div>

      {/* Scoreboard */}
      <div className="flex gap-3 w-full justify-center">
        <div className="flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 min-w-[72px]">
          <span className={`text-2xl font-bold ${timeLeft <= 10 ? "text-red-400" : "text-zinc-50"}`}>{timeLeft}</span>
          <span className="text-xs text-zinc-500">sec</span>
        </div>
        <div className="flex flex-col items-center bg-zinc-900 border border-violet-800 rounded-xl px-4 py-2 min-w-[72px]">
          <span className="text-2xl font-bold text-violet-400">{me?.score ?? 0}</span>
          <span className="text-xs text-zinc-500">you</span>
        </div>
        <div className="flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 min-w-[72px]">
          <span className="text-2xl font-bold text-zinc-400">{opponent?.score ?? 0}</span>
          <span className="text-xs text-zinc-500">them</span>
        </div>
      </div>

      {/* Current word */}
      <div className="h-9 flex items-center justify-center relative">
        <span className={`text-xl font-bold uppercase tracking-widest transition-colors ${invalidFlash ? "text-red-400" : "text-zinc-50"}`}>
          {currentWord || "\u00A0"}
        </span>
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
        onPointerLeave={() => { if (draggingRef.current) { draggingRef.current = false; setDragging(false); submitPath(); } }}
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
                onPointerEnter={() => enterCell(r, c)}
                disabled={localDone}
                className={`flex items-center justify-center w-16 h-16 rounded-xl text-xl font-bold uppercase transition-all touch-none select-none
                  ${inPath
                    ? isLast
                      ? "bg-violet-500 text-white scale-110 shadow-lg shadow-violet-500/30"
                      : "bg-violet-700 text-white scale-105"
                    : "bg-zinc-800 text-zinc-50"
                  }`}
              >
                {letter}
              </button>
            );
          })
        )}
      </div>

      <div className="text-xs text-zinc-600 flex gap-4">
        <span>3 letters = 100</span><span>4 = 200</span><span>5 = 400</span><span>6+ = 800</span>
      </div>
    </div>
  );
}
