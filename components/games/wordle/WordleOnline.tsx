"use client";

import { useCallback, useEffect, useState } from "react";
import usePartySocket from "partysocket/react";
import WordleBoard from "./WordleBoard";
import WordleKeyboard from "./WordleKeyboard";
import { checkGuess, mergeLetterMap, TileState, LetterMap } from "./wordle";
import { WORDLE_ANSWERS, WORDLE_VALID } from "@/lib/words";

const HOST = "gamecade.sumitkumar91.partykit.dev";

function generateRoomId() {
  return "WL-" + Math.random().toString(36).slice(2, 7).toUpperCase();
}

interface WLPlayer { id: string; guesses: number; won: boolean; done: boolean; }
interface WLState {
  wordSeed: number | null;
  players: WLPlayer[];
  phase: "waiting" | "playing" | "ended";
}

export default function WordleOnline({ onBack }: { onBack: () => void }) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [inputRoom, setInputRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [serverState, setServerState] = useState<WLState | null>(null);
  const [copied, setCopied] = useState(false);

  // Local game state
  const [guesses, setGuesses] = useState<string[]>([]);
  const [states, setStates] = useState<TileState[][]>([]);
  const [letterMap, setLetterMap] = useState<LetterMap>({});
  const [currentGuess, setCurrentGuess] = useState("");
  const [localPhase, setLocalPhase] = useState<"playing" | "won" | "lost">("playing");
  const [message, setMessage] = useState<string | null>(null);
  const [revealingRow, setRevealingRow] = useState<number | null>(null);
  const [shake, setShake] = useState(false);

  const socket = usePartySocket({
    host: HOST,
    room: roomId ?? "__lobby__",
    onMessage(e) {
      const msg = JSON.parse(e.data);
      if (msg.type === "state") setServerState(msg.state);
    },
  });

  const myId = socket.id;
  const phase = serverState?.phase ?? "waiting";
  const me = serverState?.players.find((p) => p.id === myId);
  const opponent = serverState?.players.find((p) => p.id !== myId);
  const answer = serverState?.wordSeed != null
    ? WORDLE_ANSWERS[serverState.wordSeed % WORDLE_ANSWERS.length]
    : null;

  // Reset local state when a new game starts
  useEffect(() => {
    if (phase !== "playing" || !answer) return;
    setGuesses([]);
    setStates([]);
    setLetterMap({});
    setCurrentGuess("");
    setLocalPhase("playing");
    setRevealingRow(null);
    setShake(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverState?.wordSeed]);

  const showMessage = useCallback((msg: string, duration = 2000) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), duration);
  }, []);

  const submitGuess = useCallback(() => {
    if (!answer || localPhase !== "playing" || revealingRow !== null) return;
    if (currentGuess.length !== 5) {
      setShake(true); setTimeout(() => setShake(false), 400);
      showMessage("Not enough letters"); return;
    }
    if (!WORDLE_VALID.has(currentGuess)) {
      setShake(true); setTimeout(() => setShake(false), 400);
      showMessage("Not in word list"); return;
    }

    const rowIndex = guesses.length;
    const tileStates = checkGuess(currentGuess, answer);
    const won = currentGuess === answer;

    setRevealingRow(rowIndex);
    setTimeout(() => {
      setGuesses((g) => [...g, currentGuess]);
      setStates((s) => [...s, tileStates]);
      setLetterMap((m) => mergeLetterMap(m, currentGuess, tileStates));
      setCurrentGuess("");
      setRevealingRow(null);

      socket.send(JSON.stringify({ type: "guessed", won }));

      if (won) {
        setLocalPhase("won");
        const msgs = ["Genius!", "Magnificent!", "Impressive!", "Splendid!", "Great!", "Phew!"];
        showMessage(msgs[Math.min(rowIndex, 5)], 2500);
      } else if (rowIndex === 5) {
        setLocalPhase("lost");
        showMessage(answer, 3000);
      }
    }, 5 * 300 + 300);
  }, [answer, localPhase, revealingRow, currentGuess, guesses, showMessage, socket]);

  const handleKey = useCallback((key: string) => {
    if (localPhase !== "playing" || revealingRow !== null) return;
    if (key === "ENTER") { submitGuess(); }
    else if (key === "⌫" || key === "BACKSPACE") { setCurrentGuess((g) => g.slice(0, -1)); }
    else if (/^[A-Z]$/.test(key) && currentGuess.length < 5) { setCurrentGuess((g) => g + key); }
  }, [localPhase, revealingRow, currentGuess, submitGuess]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase !== "playing") return;
      const key = e.key.toUpperCase();
      handleKey(key === "BACKSPACE" ? "⌫" : key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey, phase]);

  function createRoom() { const id = generateRoomId(); setRoomId(id); setJoined(true); }
  function joinRoom() {
    if (!inputRoom.trim()) return;
    const raw = inputRoom.trim().toUpperCase();
    setRoomId(raw.startsWith("WL-") ? raw : "WL-" + raw);
    setJoined(true);
  }
  function copyRoom() {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId?.split('-').slice(1).join('-') ?? '');
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }

  // Lobby
  if (!joined) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-6 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Wordle — Online</h1>
          <p className="text-zinc-400">Same word, race to guess it first</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button onClick={createRoom} className="px-6 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-lg transition-colors">
            Create Room
          </button>
          <div className="flex gap-2">
            <input
              value={inputRoom}
              onChange={(e) => setInputRoom(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              placeholder="ROOM CODE"
              maxLength={10}
              className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-50 font-mono tracking-widest uppercase text-center placeholder:text-zinc-600 outline-none focus:border-zinc-500"
            />
            <button onClick={joinRoom} className="px-4 py-3 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-semibold transition-colors">Join</button>
          </div>
          <button onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors mt-2">← Back</button>
        </div>
      </div>
    );
  }

  // Waiting
  if (phase === "waiting") {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 px-4">
        <div className="w-8 h-8 border-2 border-zinc-600 border-t-emerald-400 rounded-full animate-spin" />
        <p className="text-zinc-300 font-semibold">Waiting for opponent...</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-zinc-400 tracking-widest">{roomId?.split("-").slice(1).join("-")}</span>
          <button onClick={copyRoom} className="text-xs text-zinc-500 hover:text-zinc-300">{copied ? "Copied!" : "Copy"}</button>
        </div>
        <button onClick={onBack} className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors mt-4">← Back</button>
      </div>
    );
  }

  // Ended
  if (phase === "ended" && serverState) {
    const iWon = me?.won ?? false;
    const theyWon = opponent?.won ?? false;
    const draw = iWon && theyWon;
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-6 px-4 text-center">
        <h2 className="text-3xl font-bold">
          {draw ? "Both got it!" : iWon ? "You Win! 🎉" : theyWon ? "You Lose!" : "Neither got it!"}
        </h2>
        <p className="text-zinc-400">The word was <span className="text-emerald-400 font-bold uppercase">{answer}</span></p>
        <div className="flex gap-6">
          <div className="flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-xl px-6 py-4">
            <span className={`text-3xl font-bold ${me?.won ? "text-emerald-400" : "text-red-400"}`}>{me?.guesses ?? 0}/6</span>
            <span className="text-xs text-zinc-500 mt-1">You</span>
          </div>
          <div className="flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-xl px-6 py-4">
            <span className={`text-3xl font-bold ${opponent?.won ? "text-emerald-400" : "text-red-400"}`}>{opponent?.guesses ?? "?"}/6</span>
            <span className="text-xs text-zinc-500 mt-1">Opponent</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => socket.send(JSON.stringify({ type: "rematch" }))} className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors">Rematch</button>
          <button onClick={onBack} className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition-colors">Leave</button>
        </div>
      </div>
    );
  }

  // Playing
  return (
    <div className="flex flex-col items-center gap-4 py-6 px-4 w-full max-w-md mx-auto">
      <div className="flex flex-col items-center gap-1 w-full">
        <h1 className="text-xl font-bold tracking-tight">Wordle — Online</h1>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>You: {me?.guesses ?? 0} guess{me?.guesses !== 1 ? "es" : ""}</span>
          <span>·</span>
          <span>Them: {opponent?.guesses ?? 0} guess{opponent?.guesses !== 1 ? "es" : ""}</span>
          {opponent?.done && !serverState?.phase.startsWith("end") && (
            <span className="text-amber-400">{opponent.won ? "✓ got it" : "✗ failed"}</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-mono text-zinc-600 text-xs">{roomId?.split("-").slice(1).join("-")}</span>
          <button onClick={copyRoom} className="text-xs text-zinc-600 hover:text-zinc-400">{copied ? "Copied!" : "Copy"}</button>
        </div>
        <div className="h-px w-full bg-zinc-800 mt-1" />
      </div>

      {/* Toast */}
      <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-zinc-50 text-zinc-900 font-bold px-4 py-2 rounded-lg text-sm transition-all duration-200
        ${message ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}>
        {message}
      </div>

      <WordleBoard
        guesses={guesses}
        states={states}
        currentGuess={currentGuess}
        currentRow={guesses.length}
        revealingRow={revealingRow}
        won={localPhase === "won"}
        shake={shake}
      />

      <WordleKeyboard letterMap={letterMap} onKey={handleKey} />

      {localPhase !== "playing" && phase !== "ended" && (
        <p className="text-sm text-zinc-400 animate-pulse">Waiting for opponent to finish...</p>
      )}
    </div>
  );
}
