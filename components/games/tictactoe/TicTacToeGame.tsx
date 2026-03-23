"use client";

import { useCallback, useEffect, useState } from "react";
import { Board, Cell, checkWinner, getBestMove } from "./minimax";

type Mode = "ai" | "2player" | null;

interface Scores {
  X: number;
  O: number;
  draws: number;
}

function useLocalScores(): [Scores, (s: Scores) => void] {
  const key = "ttt-scores";
  const [scores, setScoresState] = useState<Scores>({ X: 0, O: 0, draws: 0 });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored) setScoresState(JSON.parse(stored));
    } catch {}
  }, []);

  const setScores = (s: Scores) => {
    setScoresState(s);
    try { localStorage.setItem(key, JSON.stringify(s)); } catch {}
  };

  return [scores, setScores];
}

export default function TicTacToeGame() {
  const [mode, setMode] = useState<Mode>(null);
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [current, setCurrent] = useState<"X" | "O">("X");
  const [scores, setScores] = useLocalScores();
  const [winLine, setWinLine] = useState<number[] | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [status, setStatus] = useState("");
  const [aiThinking, setAiThinking] = useState(false);

  const resetBoard = useCallback(() => {
    setBoard(Array(9).fill(null));
    setCurrent("X");
    setWinLine(null);
    setGameOver(false);
    setStatus("");
    setAiThinking(false);
  }, []);

  const handleResult = useCallback(
    (winner: "X" | "O" | "draw" | null, line: number[] | null, boardState: Board) => {
      if (!winner) return false;

      setWinLine(line);
      setGameOver(true);

      if (winner === "draw") {
        setStatus("Draw!");
        setScores({ ...scores, draws: scores.draws + 1 });
      } else {
        const label = mode === "ai" ? (winner === "X" ? "You win!" : "AI wins!") : `${winner} wins!`;
        setStatus(label);
        setScores({ ...scores, [winner]: scores[winner] + 1 });
      }
      return true;
    },
    [mode, scores, setScores]
  );

  const makeMove = useCallback(
    (index: number, boardState: Board, player: "X" | "O") => {
      if (boardState[index] || gameOver) return null;
      const next = [...boardState];
      next[index] = player;
      setBoard(next);
      return next;
    },
    [gameOver]
  );

  const handleClick = useCallback(
    (index: number) => {
      if (gameOver || aiThinking) return;

      // In AI mode, only allow X to click
      if (mode === "ai" && current !== "X") return;

      const next = makeMove(index, board, current);
      if (!next) return;

      const { winner, line } = checkWinner(next);
      if (handleResult(winner, line, next)) return;

      const nextPlayer: "X" | "O" = current === "X" ? "O" : "X";
      setCurrent(nextPlayer);
    },
    [gameOver, aiThinking, mode, current, board, makeMove, handleResult]
  );

  // AI move effect
  useEffect(() => {
    if (mode !== "ai" || current !== "O" || gameOver) return;

    setAiThinking(true);
    const timer = setTimeout(() => {
      const bestMove = getBestMove(board);
      const next = makeMove(bestMove, board, "O");
      if (!next) { setAiThinking(false); return; }

      const { winner, line } = checkWinner(next);
      if (!handleResult(winner, line, next)) {
        setCurrent("X");
      }
      setAiThinking(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [mode, current, gameOver, board, makeMove, handleResult]);

  const cellStyle = (index: number): string => {
    const cell: Cell = board[index];
    const isWin = winLine?.includes(index);
    const base = "flex items-center justify-center text-4xl font-bold rounded-lg w-24 h-24 transition-all cursor-pointer";
    let bg = "bg-zinc-800 hover:bg-zinc-700";
    if (isWin) bg = "bg-zinc-700 ring-2 ring-offset-1 ring-offset-zinc-950 ring-emerald-500";
    if (cell === "X") return `${base} ${bg} text-blue-400`;
    if (cell === "O") return `${base} ${bg} text-red-400`;
    if (gameOver) return `${base} bg-zinc-800 cursor-default`;
    return `${base} ${bg}`;
  };

  // Mode select screen
  if (!mode) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-6 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Tic Tac Toe</h1>
          <p className="text-zinc-400">Choose your game mode</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => setMode("ai")}
            className="px-6 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-lg transition-colors"
          >
            Play vs AI
            <span className="block text-sm font-normal text-blue-200 mt-0.5">Unbeatable minimax AI</span>
          </button>
          <button
            onClick={() => setMode("2player")}
            className="px-6 py-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-lg transition-colors border border-zinc-700"
          >
            2 Players
            <span className="block text-sm font-normal text-zinc-400 mt-0.5">Pass &amp; play locally</span>
          </button>
        </div>
      </div>
    );
  }

  const xLabel = mode === "ai" ? "You" : "Player X";
  const oLabel = mode === "ai" ? "AI" : "Player O";

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4 w-full max-w-sm mx-auto">
      <div className="flex flex-col items-center gap-1 w-full">
        <h1 className="text-2xl font-bold">Tic Tac Toe</h1>
        <p className="text-sm text-zinc-400">{mode === "ai" ? "You (X) vs AI (O)" : "X vs O — pass & play"}</p>
        <div className="h-px w-full bg-zinc-800 mt-2" />
      </div>

      {/* Scoreboard */}
      <div className="flex gap-4 w-full justify-center">
        {[
          { label: xLabel, symbol: "X", key: "X" as const, color: "text-blue-400" },
          { label: "Draws", symbol: null, key: "draws" as const, color: "text-zinc-400" },
          { label: oLabel, symbol: "O", key: "O" as const, color: "text-red-400" },
        ].map(({ label, symbol, key, color }) => (
          <div key={key} className="flex flex-col items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl px-5 py-3 min-w-[80px]">
            <span className={`text-2xl font-bold ${color}`}>{scores[key]}</span>
            <span className="text-xs text-zinc-500">{label}</span>
          </div>
        ))}
      </div>

      {/* Status */}
      <div className="h-8 flex items-center justify-center">
        {status ? (
          <span className="font-semibold text-lg text-zinc-50">{status}</span>
        ) : aiThinking ? (
          <span className="text-sm text-zinc-400 animate-pulse">AI is thinking...</span>
        ) : (
          <span className="text-sm text-zinc-400">
            {current === "X" ? xLabel : oLabel}&apos;s turn ({current})
          </span>
        )}
      </div>

      {/* Board */}
      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, i) => (
          <button
            key={i}
            className={cellStyle(i)}
            onClick={() => handleClick(i)}
            disabled={!!cell || gameOver || (mode === "ai" && current === "O")}
            aria-label={`Cell ${i + 1}`}
          >
            {cell}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={resetBoard}
          className="px-5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-50 font-medium transition-colors"
        >
          New Game
        </button>
        <button
          onClick={() => { resetBoard(); setMode(null); setScores({ X: 0, O: 0, draws: 0 }); }}
          className="px-5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-medium transition-colors border border-zinc-800"
        >
          Change Mode
        </button>
      </div>
    </div>
  );
}
