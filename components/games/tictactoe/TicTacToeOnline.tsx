"use client";

import { useEffect, useRef, useState } from "react";
import usePartySocket from "partysocket/react";

type Cell = "X" | "O" | null;
type Board = Cell[];

interface GameState {
  board: Board;
  current: "X" | "O";
  players: string[];
  winner: "X" | "O" | "draw" | null;
  winLine: number[] | null;
  scores: { X: number; O: number; draws: number };
}

const HOST =
  process.env.NODE_ENV === "development"
    ? "localhost:1999"
    : "gamecade.USERNAME.partykit.dev"; // replace USERNAME after deploy

function generateRoomId() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export default function TicTacToeOnline({ onBack }: { onBack: () => void }) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [inputRoom, setInputRoom] = useState("");
  const [joined, setJoined] = useState(false);
  const [mySymbol, setMySymbol] = useState<"X" | "O" | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const connIdRef = useRef<string | null>(null);
  const [copied, setCopied] = useState(false);

  const socket = usePartySocket({
    host: HOST,
    room: roomId ?? "__lobby__",
    party: "tictactoe",
    onOpen(e) {
      // @ts-ignore
      connIdRef.current = e.target?.id ?? null;
    },
    onMessage(e) {
      const msg = JSON.parse(e.data);
      if (msg.type === "state") {
        const state: GameState = msg.state;
        setGameState(state);
        // Figure out my symbol based on player order
        if (connIdRef.current) {
          const idx = state.players.indexOf(connIdRef.current);
          if (idx === 0) setMySymbol("X");
          else if (idx === 1) setMySymbol("O");
        }
      }
    },
  });

  // Store socket id once assigned
  useEffect(() => {
    if (socket.id) connIdRef.current = socket.id;
  }, [socket.id]);

  // Recompute symbol whenever gameState or socket.id changes
  useEffect(() => {
    if (!gameState || !socket.id) return;
    const idx = gameState.players.indexOf(socket.id);
    if (idx === 0) setMySymbol("X");
    else if (idx === 1) setMySymbol("O");
    else setMySymbol(null);
  }, [gameState, socket.id]);

  function createRoom() {
    const id = generateRoomId();
    setRoomId(id);
    setJoined(true);
  }

  function joinRoom() {
    if (!inputRoom.trim()) return;
    setRoomId(inputRoom.trim().toUpperCase());
    setJoined(true);
  }

  function handleMove(index: number) {
    if (!gameState || !mySymbol) return;
    if (gameState.current !== mySymbol) return;
    if (gameState.winner) return;
    if (gameState.board[index]) return;
    socket.send(JSON.stringify({ type: "move", index }));
  }

  function handleReset() {
    socket.send(JSON.stringify({ type: "reset" }));
  }

  function copyRoom() {
    if (!roomId) return;
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const cellStyle = (index: number) => {
    const cell = gameState?.board[index];
    const isWin = gameState?.winLine?.includes(index);
    const base = "flex items-center justify-center text-4xl font-bold rounded-lg w-24 h-24 transition-all";
    let bg = "bg-zinc-800 hover:bg-zinc-700 cursor-pointer";
    if (isWin) bg = "bg-zinc-700 ring-2 ring-offset-1 ring-offset-zinc-950 ring-emerald-500";
    if (gameState?.winner || cell) bg = "bg-zinc-800 cursor-default";
    if (cell === "X") return `${base} ${bg} text-blue-400`;
    if (cell === "O") return `${base} ${bg} text-red-400`;
    return `${base} ${bg}`;
  };

  // Lobby screen
  if (!joined) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-6 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Play Online</h1>
          <p className="text-zinc-400">Create a room or join with a code</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={createRoom}
            className="px-6 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-lg transition-colors"
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
          <button
            onClick={onBack}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors mt-2"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  const waitingForOpponent = !gameState || gameState.players.length < 2;
  const scores = gameState?.scores ?? { X: 0, O: 0, draws: 0 };

  let statusText = "";
  if (gameState?.winner) {
    if (gameState.winner === "draw") statusText = "Draw!";
    else if (gameState.winner === mySymbol) statusText = "You win! 🎉";
    else statusText = "You lose!";
  } else if (!waitingForOpponent) {
    statusText = gameState?.current === mySymbol ? "Your turn" : "Opponent's turn...";
  }

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4 w-full max-w-sm mx-auto">
      <div className="flex flex-col items-center gap-1 w-full">
        <h1 className="text-2xl font-bold">Tic Tac Toe — Online</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500 font-mono">Room: {roomId}</span>
          <button onClick={copyRoom} className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
        {mySymbol && (
          <span className={`text-sm font-semibold ${mySymbol === "X" ? "text-blue-400" : "text-red-400"}`}>
            You are {mySymbol}
          </span>
        )}
        <div className="h-px w-full bg-zinc-800 mt-2" />
      </div>

      {waitingForOpponent ? (
        <div className="flex flex-col items-center gap-3 py-10">
          <div className="w-8 h-8 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
          <p className="text-zinc-400 text-sm">Waiting for opponent...</p>
          <p className="text-zinc-600 text-xs">Share room code: <span className="font-mono text-zinc-400">{roomId}</span></p>
        </div>
      ) : (
        <>
          {/* Scoreboard */}
          <div className="flex gap-4 w-full justify-center">
            {[
              { label: mySymbol === "X" ? "You" : "Opponent", key: "X" as const, color: "text-blue-400" },
              { label: "Draws", key: "draws" as const, color: "text-zinc-400" },
              { label: mySymbol === "O" ? "You" : "Opponent", key: "O" as const, color: "text-red-400" },
            ].map(({ label, key, color }) => (
              <div key={key} className="flex flex-col items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3 min-w-[80px]">
                <span className={`text-2xl font-bold ${color}`}>{scores[key]}</span>
                <span className="text-xs text-zinc-500">{label}</span>
              </div>
            ))}
          </div>

          {/* Status */}
          <div className="h-8 flex items-center">
            <span className="font-semibold text-lg text-zinc-50">{statusText}</span>
          </div>

          {/* Board */}
          <div className="grid grid-cols-3 gap-2">
            {(gameState?.board ?? Array(9).fill(null)).map((cell, i) => (
              <button
                key={i}
                className={cellStyle(i)}
                onClick={() => handleMove(i)}
                disabled={!!cell || !!gameState?.winner || gameState?.current !== mySymbol}
              >
                {cell}
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {gameState?.winner && (
              <button
                onClick={handleReset}
                className="px-5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-50 font-medium transition-colors"
              >
                New Game
              </button>
            )}
            <button
              onClick={onBack}
              className="px-5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-medium transition-colors border border-zinc-800"
            >
              Leave
            </button>
          </div>
        </>
      )}
    </div>
  );
}
