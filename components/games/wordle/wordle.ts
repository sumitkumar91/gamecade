export type TileState = "correct" | "present" | "absent" | "empty" | "tbd";

export type LetterMap = Record<string, TileState>;

export function checkGuess(guess: string, answer: string): TileState[] {
  const result: TileState[] = Array(5).fill("absent");
  const answerArr = answer.split("");
  const guessArr = guess.split("");
  const usedAnswer = Array(5).fill(false);

  // First pass: mark correct positions
  for (let i = 0; i < 5; i++) {
    if (guessArr[i] === answerArr[i]) {
      result[i] = "correct";
      usedAnswer[i] = true;
    }
  }

  // Second pass: mark present (wrong position)
  for (let i = 0; i < 5; i++) {
    if (result[i] === "correct") continue;
    for (let j = 0; j < 5; j++) {
      if (!usedAnswer[j] && guessArr[i] === answerArr[j]) {
        result[i] = "present";
        usedAnswer[j] = true;
        break;
      }
    }
  }

  return result;
}

export function mergeLetterMap(map: LetterMap, guess: string, states: TileState[]): LetterMap {
  const next = { ...map };
  const priority: Record<TileState, number> = { correct: 3, present: 2, absent: 1, empty: 0, tbd: 0 };
  for (let i = 0; i < guess.length; i++) {
    const letter = guess[i];
    const state = states[i];
    if (!next[letter] || priority[state] > priority[next[letter]]) {
      next[letter] = state;
    }
  }
  return next;
}

export const EMPTY_ROW: TileState[] = Array(5).fill("empty");
