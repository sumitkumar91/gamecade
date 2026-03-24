import type * as Party from "partykit/server";

type Cell = "X" | "O" | null;
type Board = Cell[];

interface GameState {
  board: Board;
  current: "X" | "O";
  players: string[]; // [X connectionId, O connectionId]
  winner: "X" | "O" | "draw" | null;
  winLine: number[] | null;
  scores: { X: number; O: number; draws: number };
}

function checkWinner(board: Board): { winner: "X" | "O" | "draw" | null; line: number[] | null } {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6],
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a] as "X" | "O", line: [a, b, c] };
    }
  }
  if (board.every((c) => c !== null)) return { winner: "draw", line: null };
  return { winner: null, line: null };
}

function initialState(): GameState {
  return {
    board: Array(9).fill(null),
    current: "X",
    players: [],
    winner: null,
    winLine: null,
    scores: { X: 0, O: 0, draws: 0 },
  };
}

export default class TicTacToeServer implements Party.Server {
  state: GameState;

  constructor(readonly room: Party.Room) {
    this.state = initialState();
  }

  onConnect(conn: Party.Connection) {
    const { players } = this.state;

    // Assign player slot
    if (!players.includes(conn.id) && players.length < 2) {
      players.push(conn.id);
    }

    // Send current state to the new connection
    conn.send(JSON.stringify({ type: "state", state: this.state }));

    // Broadcast updated player list
    this.room.broadcast(JSON.stringify({ type: "state", state: this.state }));
  }

  onClose(conn: Party.Connection) {
    this.state.players = this.state.players.filter((id) => id !== conn.id);
    this.room.broadcast(JSON.stringify({ type: "state", state: this.state }));
  }

  onMessage(message: string, sender: Party.Connection) {
    const msg = JSON.parse(message);

    if (msg.type === "move") {
      const { index } = msg;
      const { board, current, players, winner } = this.state;

      // Validate it's this player's turn
      const playerSymbol: "X" | "O" = players[0] === sender.id ? "X" : "O";
      if (playerSymbol !== current) return;
      if (winner) return;
      if (board[index]) return;

      board[index] = current;
      const result = checkWinner(board);

      if (result.winner) {
        this.state.winner = result.winner;
        this.state.winLine = result.line;
        if (result.winner === "draw") {
          this.state.scores.draws += 1;
        } else {
          this.state.scores[result.winner] += 1;
        }
      } else {
        this.state.current = current === "X" ? "O" : "X";
      }

      this.room.broadcast(JSON.stringify({ type: "state", state: this.state }));
    }

    if (msg.type === "reset") {
      const scores = this.state.scores;
      const players = [...this.state.players].reverse(); // swap X and O each round
      this.state = { ...initialState(), scores, players };
      this.room.broadcast(JSON.stringify({ type: "state", state: this.state }));
    }
  }
}

TicTacToeServer satisfies Party.Worker;
