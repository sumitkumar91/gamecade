export type Cell = "X" | "O" | null;
export type Board = Cell[];

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
];

export function checkWinner(board: Board): { winner: "X" | "O" | "draw" | null; line: number[] | null } {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as "X" | "O", line };
    }
  }
  if (board.every((cell) => cell !== null)) {
    return { winner: "draw", line: null };
  }
  return { winner: null, line: null };
}

function minimax(board: Board, isMaximizing: boolean, alpha: number, beta: number): number {
  const { winner } = checkWinner(board);
  if (winner === "O") return 10;
  if (winner === "X") return -10;
  if (winner === "draw") return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = "O";
        best = Math.max(best, minimax(board, false, alpha, beta));
        board[i] = null;
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = "X";
        best = Math.min(best, minimax(board, true, alpha, beta));
        board[i] = null;
        beta = Math.min(beta, best);
        if (beta <= alpha) break;
      }
    }
    return best;
  }
}

export function getBestMove(board: Board): number {
  let best = -Infinity;
  let bestMove = -1;
  const copy = [...board];

  for (let i = 0; i < 9; i++) {
    if (!copy[i]) {
      copy[i] = "O";
      const score = minimax(copy, false, -Infinity, Infinity);
      copy[i] = null;
      if (score > best) {
        best = score;
        bestMove = i;
      }
    }
  }
  return bestMove;
}
