"use client";

import { useEffect, useRef, useState } from "react";
import usePartySocket from "partysocket/react";

const HOST = "gamecade.sumitkumar91.partykit.dev";
const ROUNDS = 5;

function genCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

interface RXNState {
  players: { id: string; wins: number; rt: number | null; tapped: boolean }[];
  phase: "waiting" | "standby" | "go" | "result" | "ended";
  round: number;
  startedAt: number | null;
}

export default function ReactionOnline({ onBack }: { onBack: () => void }) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [joined, setJoined] = useState(false);
  const [gameState, setGameState] = useState<RXNState | null>(null);
  const [localRt, setLocalRt] = useState<number | null>(null);
  const [tooSoon, setTooSoon] = useState(false);
  const connIdRef = useRef<string>("");

  const socket = usePartySocket({
    host: HOST,
    room: roomId ?? "__lobby__",
    onOpen() { connIdRef.current = socket.id; },
    onMessage(e) {
      const msg = JSON.parse(e.data);
      if (msg.type === "state") setGameState(msg.state);
    },
  });

  const myId = connIdRef.current || socket.id;
  const me = gameState?.players.find((p) => p.id === myId);
  const opponent = gameState?.players.find((p) => p.id !== myId);
  const waiting = !gameState || gameState.players.length < 2;

  const createRoom = () => { const id = `RXN-${genCode()}`; setRoomId(id); setJoined(true); };
  const joinRoom = () => { if (input.trim()) { setRoomId(`RXN-${input.trim().toUpperCase()}`); setJoined(true); } };
  const displayCode = roomId?.replace("RXN-", "") ?? "";

  const handleTap = () => {
    if (!gameState) return;
    if (gameState.phase === "standby") {
      setTooSoon(true);
      socket.send(JSON.stringify({ type: "toosoon" }));
      setTimeout(() => setTooSoon(false), 1000);
    } else if (gameState.phase === "go" && !me?.tapped) {
      const rt = gameState.startedAt ? Date.now() - gameState.startedAt : 999;
      setLocalRt(rt);
      socket.send(JSON.stringify({ type: "tap", rt }));
    }
  };

  if (!joined) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-6 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Reaction Duel</h1>
          <p className="text-zinc-400">Best of {ROUNDS} rounds</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button onClick={createRoom} className="px-6 py-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold text-lg transition-colors">
            Create Room
          </button>
          <div className="flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value.toUpperCase().slice(0, 5))}
              placeholder="Room code" maxLength={5}
              className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-50 font-mono tracking-widest text-center placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500" />
            <button onClick={joinRoom} className="px-5 py-3 rounded-xl bg-zinc-700 hover:bg-zinc-600 text-white font-semibold transition-colors">Join</button>
          </div>
        </div>
        <button onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-400">Back</button>
      </div>
    );
  }

  if (waiting) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 px-4">
        <p className="text-zinc-400 text-sm">Share this code with your opponent</p>
        <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-700 rounded-xl px-6 py-4">
          <span className="font-mono text-3xl font-bold tracking-widest text-zinc-50">{displayCode}</span>
          <button onClick={() => navigator.clipboard?.writeText(displayCode)} className="text-xs text-zinc-500 hover:text-zinc-300 border border-zinc-700 rounded px-2 py-1">copy</button>
        </div>
        <p className="text-zinc-500 text-sm animate-pulse">Waiting for opponent...</p>
        <button onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-400">Back</button>
      </div>
    );
  }

  const phase = gameState!.phase;
  const round = gameState!.round;

  return (
    <div className="flex flex-col items-center gap-5 py-8 px-4 w-full max-w-md mx-auto">
      <div className="flex flex-col items-center gap-1 w-full">
        <h1 className="text-2xl font-bold">Reaction Duel</h1>
        <p className="text-sm text-zinc-400">Round {round}/{ROUNDS}</p>
        <div className="h-px w-full bg-zinc-800 mt-2" />
      </div>

      {/* Scoreboard */}
      <div className="flex gap-6 justify-center">
        <div className="flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-xl px-6 py-3">
          <span className="text-2xl font-bold text-amber-400">{me?.wins ?? 0}</span>
          <span className="text-xs text-zinc-500">You</span>
        </div>
        <div className="flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-xl px-6 py-3">
          <span className="text-2xl font-bold text-zinc-400">{opponent?.wins ?? 0}</span>
          <span className="text-xs text-zinc-500">Opponent</span>
        </div>
      </div>

      {/* Tap area */}
      <button
        onClick={handleTap}
        disabled={phase === "result" || phase === "ended" || me?.tapped}
        className={`w-full rounded-2xl flex flex-col items-center justify-center gap-2 transition-all select-none touch-none
          ${tooSoon ? "bg-red-600" : phase === "go" ? "bg-emerald-500" : phase === "standby" ? "bg-zinc-700 animate-pulse" : "bg-zinc-800"}`}
        style={{ height: 240 }}
      >
        {phase === "waiting" && <span className="text-xl font-semibold text-zinc-400">Get Ready...</span>}
        {phase === "standby" && <><span className="text-xl font-semibold text-zinc-300">Wait...</span>{tooSoon && <span className="text-red-300 text-sm">Too soon!</span>}</>}
        {phase === "go" && !me?.tapped && <span className="text-5xl font-black text-white">TAP!</span>}
        {phase === "go" && me?.tapped && <span className="text-xl font-semibold text-zinc-300">Waiting for opponent...</span>}
        {phase === "result" && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-lg font-bold text-zinc-50">
              {me?.tapped && opponent?.tapped
                ? (me.rt! < opponent.rt! ? "You win this round!" : me.rt === opponent.rt ? "Tie!" : "Opponent wins!")
                : me?.tapped ? "You tapped!" : "Opponent tapped!"}
            </span>
            <span className="text-sm text-zinc-400">You: {me?.rt ?? "--"}ms | Them: {opponent?.rt ?? "--"}ms</span>
          </div>
        )}
        {phase === "ended" && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-black text-zinc-50">
              {(me?.wins ?? 0) > (opponent?.wins ?? 0) ? "You Win!" : (me?.wins ?? 0) < (opponent?.wins ?? 0) ? "You Lose" : "Tie!"}
            </span>
            <span className="text-sm text-zinc-400">{me?.wins} - {opponent?.wins}</span>
          </div>
        )}
      </button>

      {phase === "ended" && (
        <button onClick={() => socket.send(JSON.stringify({ type: "rematch" }))}
          className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-semibold transition-colors">
          Rematch
        </button>
      )}

      <div className="flex gap-3 text-xs text-zinc-600 justify-center">
        <span>Room: {displayCode}</span>
      </div>
      <button onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-400">Back</button>
    </div>
  );
}
