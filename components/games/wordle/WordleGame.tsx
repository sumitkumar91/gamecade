"use client";

import { useCallback, useEffect, useState } from "react";
import WordleBoard from "./WordleBoard";
import WordleKeyboard from "./WordleKeyboard";
import { checkGuess, mergeLetterMap, TileState, LetterMap } from "./wordle";
import { WORDLE_ANSWERS, WORDLE_VALID } from "@/lib/words";
import WordleOnline from "./WordleOnline";

function randomAnswer(): string {
  return WORDLE_ANSWERS[Math.floor(Math.random() * WORDLE_ANSWERS.length)];
}

export default function WordleGame() {
  const [mode, setMode] = useState<"solo" | "online" | null>(null);

  if (mode === null) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-6 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Wordle</h1>
          <p className="text-zinc-400">Choose your mode</p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => setMode("solo")}
            className="px-6 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-lg transition-colors"
          >
            Solo
            <span className="block text-sm font-normal text-emerald-200 mt-0.5">Guess the word in 6 tries</span>
          </button>
          <button
            onClick={() => setMode("online")}
            className="px-6 py-4 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-semibold text-lg transition-colors border border-blue-600"
          >
            Play Online
            <span className="block text-sm font-normal text-blue-200 mt-0.5">Same word, race your opponent</span>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "online") return <WordleOnline onBack={() => setMode(null)} />;

  return <WordleSolo />;
}

function WordleSolo() {
  const [answer, setAnswer] = useState(() => randomAnswer());
  const [guesses, setGuesses] = useState<string[]>([]);
  const [states, setStates] = useState<TileState[][]>([]);
  const [letterMap, setLetterMap] = useState<LetterMap>({});
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">("playing");
  const [message, setMessage] = useState<string | null>(null);
  const [revealingRow, setRevealingRow] = useState<number | null>(null);
  const [shake, setShake] = useState(false);

  const showMessage = useCallback((msg: string, duration = 2000) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), duration);
  }, []);

  const newGame = useCallback(() => {
    setAnswer(randomAnswer());
    setGuesses([]);
    setStates([]);
    setLetterMap({});
    setCurrentGuess("");
    setGameState("playing");
    setRevealingRow(null);
    setShake(false);
  }, []);

  const submitGuess = useCallback(() => {
    if (currentGuess.length !== 5) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      showMessage("Not enough letters");
      return;
    }
    if (!WORDLE_VALID.has(currentGuess)) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      showMessage("Not in word list");
      return;
    }

    const rowIndex = guesses.length;
    const tileStates = checkGuess(currentGuess, answer);

    setRevealingRow(rowIndex);
    setTimeout(() => {
      setGuesses((g) => [...g, currentGuess]);
      setStates((s) => [...s, tileStates]);
      setLetterMap((m) => mergeLetterMap(m, currentGuess, tileStates));
      setCurrentGuess("");
      setRevealingRow(null);

      if (currentGuess === answer) {
        setGameState("won");
        const msgs = ["Genius!", "Magnificent!", "Impressive!", "Splendid!", "Great!", "Phew!"];
        showMessage(msgs[Math.min(rowIndex, 5)], 2500);
      } else if (rowIndex === 5) {
        setGameState("lost");
        showMessage(answer, 3000);
      }
    }, 5 * 300 + 300);
  }, [currentGuess, guesses, answer, showMessage]);

  const handleKey = useCallback(
    (key: string) => {
      if (gameState !== "playing" || revealingRow !== null) return;

      if (key === "ENTER") {
        submitGuess();
      } else if (key === "⌫" || key === "BACKSPACE") {
        setCurrentGuess((g) => g.slice(0, -1));
      } else if (/^[A-Z]$/.test(key) && currentGuess.length < 5) {
        setCurrentGuess((g) => g + key);
      }
    },
    [gameState, revealingRow, currentGuess, submitGuess]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      handleKey(key === "BACKSPACE" ? "⌫" : key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKey]);

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4 w-full max-w-md mx-auto">
      <div className="flex flex-col items-center gap-1 w-full">
        <h1 className="text-2xl font-bold tracking-tight">Wordle</h1>
        <p className="text-sm text-zinc-400">Guess the 5-letter word in 6 tries</p>
        <div className="h-px w-full bg-zinc-800 mt-2" />
      </div>

      {/* Toast message */}
      <div
        className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-zinc-50 text-zinc-900 font-bold px-4 py-2 rounded-lg text-sm transition-all duration-200
          ${message ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"}`}
      >
        {message}
      </div>

      <WordleBoard
        guesses={guesses}
        states={states}
        currentGuess={currentGuess}
        currentRow={guesses.length}
        revealingRow={revealingRow}
        won={gameState === "won"}
        shake={shake}
      />

      <WordleKeyboard letterMap={letterMap} onKey={handleKey} />

      {gameState !== "playing" && (
        <button
          onClick={newGame}
          className="mt-2 px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors"
        >
          New Game
        </button>
      )}
    </div>
  );
}
