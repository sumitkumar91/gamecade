"use client";

import { useEffect, useRef, useState } from "react";
import usePartySocket from "partysocket/react";

const HOST = "gamecade.sumitkumar91.partykit.dev";
const PAIRS = 8;

function genCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

interface MEMCard { id: number; emoji: string; matched: boolean; matchedBy: string | null; flipped: boolean; }
interface MEMState {
  cards: MEMCard[];
  players: { id: string; score: number }[];
  turn: string; // player id whose turn it is
  flipped: number[]; // currently flipped (up to 2)
  phase: "waiting" | "playing" | "ended";
}

export default function MemoryOnline({ onBack }: { onBack: () => void }) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [joined, setJoined] = useState(false);
  const [gameState, setGameState] = useState<MEMState | null>(null);
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
  const isMyTurn = gameState?.turn === myId;

  const createRoom = () => { const id = `MEM-${genCode()}`; setRoomId(id); setJoined(true); };
  const joinRoom = () => { if (input.trim()) { setRoomId(`MEM-${input.trim().toUpperCase()}`); setJoined(true); } };
  const displayCode = roomId?.replace("MEM-", "") ?? "";

  const flipCard = (id: number) => {
    if (!isMyTurn || !gameState) return;
    const card = gameState.cards.find((c) => c.id === id);
    if (!card || card.matched || card.flipped || gameState.flipped.length >= 2) return;
    socket.send(JSON.stringify({ type: "flip", cardId: id }));
  };

  if (!joined) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-6 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Memory Battle</h1>
          <p className="text-zinc-400">Take turns, most pairs wins</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button onClick={createRoom} className="px-6 py-4 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold text-lg transition-colors">
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

  const matched = gameState!.cards.filter((c) => c.matched).length / 2;

  return (
    <div className="flex flex-col items-center gap-4 py-6 px-4 w-full max-w-md mx-auto">
      <div className="flex flex-col items-center gap-1 w-full">
        <h1 className="text-2xl font-bold">Memory Battle</h1>
        <p className={`text-sm font-semibold ${isMyTurn ? "text-pink-400" : "text-zinc-400"}`}>
          {gameState?.phase === "ended" ? "Game over!" : isMyTurn ? "Your turn" : "Opponent's turn"}
        </p>
        <div className="h-px w-full bg-zinc-800 mt-2" />
      </div>

      <div className="flex gap-4 justify-center">
        <div className="flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-2">
          <span className="text-2xl font-bold text-pink-400">{me?.score ?? 0}</span>
          <span className="text-xs text-zinc-500">You</span>
        </div>
        <div className="flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-2">
          <span className="text-2xl font-bold text-zinc-400">{opponent?.score ?? 0}</span>
          <span className="text-xs text-zinc-500">Opponent</span>
        </div>
        <div className="flex flex-col items-center bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-2">
          <span className="text-2xl font-bold text-emerald-400">{matched}/{PAIRS}</span>
          <span className="text-xs text-zinc-500">pairs</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 w-full">
        {gameState!.cards.map((card) => {
          const myMatch = card.matched && card.matchedBy === myId;
          const theirMatch = card.matched && card.matchedBy !== myId;
          return (
            <button
              key={card.id}
              onClick={() => flipCard(card.id)}
              disabled={!isMyTurn || card.matched || card.flipped || gameState?.flipped.length === 2}
              className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all duration-300 select-none
                ${card.matched
                  ? myMatch ? "bg-pink-800/40 border border-pink-600 scale-95"
                    : theirMatch ? "bg-zinc-700/40 border border-zinc-600 scale-95"
                    : "bg-zinc-800"
                  : card.flipped ? "bg-zinc-700 border border-zinc-500"
                  : isMyTurn ? "bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 hover:scale-105" : "bg-zinc-800 border border-zinc-700"
                }`}
            >
              {(card.flipped || card.matched) ? card.emoji : ""}
            </button>
          );
        })}
      </div>

      {gameState?.phase === "ended" && (
        <div className="flex flex-col items-center gap-2">
          <p className="font-bold text-lg text-zinc-50">
            {(me?.score ?? 0) > (opponent?.score ?? 0) ? "You win!" : (me?.score ?? 0) < (opponent?.score ?? 0) ? "You lose!" : "Tie!"}
          </p>
          <button onClick={() => socket.send(JSON.stringify({ type: "rematch" }))}
            className="px-6 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-semibold transition-colors">
            Rematch
          </button>
        </div>
      )}

      <div className="text-xs text-zinc-600">Room: {displayCode}</div>
      <button onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-400">Back</button>
    </div>
  );
}
