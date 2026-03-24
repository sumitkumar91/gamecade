import type * as Party from "partykit/server";

// ─── Tic Tac Toe ────────────────────────────────────────────────────────────

type Cell = "X" | "O" | null;
type Board = Cell[];

interface TTTState {
  board: Board;
  current: "X" | "O";
  players: string[];
  winner: "X" | "O" | "draw" | null;
  winLine: number[] | null;
  scores: { X: number; O: number; draws: number };
}

function tttCheckWinner(board: Board): { winner: "X" | "O" | "draw" | null; line: number[] | null } {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return { winner: board[a] as "X" | "O", line: [a, b, c] };
  }
  if (board.every((c) => c !== null)) return { winner: "draw", line: null };
  return { winner: null, line: null };
}

function tttInitial(): TTTState {
  return { board: Array(9).fill(null), current: "X", players: [], winner: null, winLine: null, scores: { X: 0, O: 0, draws: 0 } };
}

// ─── Word Hunt ───────────────────────────────────────────────────────────────

interface WHPlayer { id: string; score: number; words: number; done: boolean; }
interface WHState {
  grid: string[][];
  players: WHPlayer[];
  phase: "waiting" | "playing" | "ended";
  startedAt: number | null;
}

function whGenerateGrid(): string[][] {
  const weighted = "EEEEEEEEEEAAAAAAAAAIIIIIIIIIOOOOOOOONNNNNNSSSSSSRRRRRRTTTTTTLLLLLUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ".split("");
  return Array.from({ length: 4 }, () =>
    Array.from({ length: 4 }, () => weighted[Math.floor(Math.random() * weighted.length)])
  );
}

function whInitial(): WHState {
  return { grid: [], players: [], phase: "waiting", startedAt: null };
}

// ─── Unified Server ──────────────────────────────────────────────────────────
// Room ID prefix determines game type:
//   "TTT-XXXXXX" → Tic Tac Toe
//   "WH-XXXXXX"  → Word Hunt

type GameType = "ttt" | "wh" | "unknown";

function gameType(roomId: string): GameType {
  if (roomId.startsWith("TTT-")) return "ttt";
  if (roomId.startsWith("WH-")) return "wh";
  return "unknown";
}

export default class GameServer implements Party.Server {
  ttt: TTTState = tttInitial();
  wh: WHState = whInitial();

  constructor(readonly room: Party.Room) {}

  broadcast(payload: unknown) {
    this.room.broadcast(JSON.stringify(payload));
  }

  onConnect(conn: Party.Connection) {
    const type = gameType(this.room.id);

    if (type === "ttt") {
      const { players } = this.ttt;
      if (!players.includes(conn.id) && players.length < 2) players.push(conn.id);
      conn.send(JSON.stringify({ type: "state", state: this.ttt }));
      this.broadcast({ type: "state", state: this.ttt });

    } else if (type === "wh") {
      const { players } = this.wh;
      if (!players.find((p) => p.id === conn.id) && players.length < 2)
        players.push({ id: conn.id, score: 0, words: 0, done: false });
      if (players.length === 2 && this.wh.phase === "waiting") {
        this.wh.grid = whGenerateGrid();
        this.wh.phase = "playing";
        this.wh.startedAt = Date.now();
      }
      conn.send(JSON.stringify({ type: "state", state: this.wh }));
      this.broadcast({ type: "state", state: this.wh });
    }
  }

  onClose(conn: Party.Connection) {
    const type = gameType(this.room.id);

    if (type === "ttt") {
      this.ttt.players = this.ttt.players.filter((id) => id !== conn.id);
      this.broadcast({ type: "state", state: this.ttt });

    } else if (type === "wh") {
      this.wh.players = this.wh.players.filter((p) => p.id !== conn.id);
      if (this.wh.phase === "playing" && this.wh.players.length < 2) {
        this.wh = whInitial();
      }
      this.broadcast({ type: "state", state: this.wh });
    }
  }

  onMessage(message: string, sender: Party.Connection) {
    const msg = JSON.parse(message);
    const type = gameType(this.room.id);

    if (type === "ttt") {
      if (msg.type === "move") {
        const { board, current, players, winner } = this.ttt;
        const symbol: "X" | "O" = players[0] === sender.id ? "X" : "O";
        if (symbol !== current || winner || board[msg.index]) return;
        board[msg.index] = current;
        const result = tttCheckWinner(board);
        if (result.winner) {
          this.ttt.winner = result.winner;
          this.ttt.winLine = result.line;
          if (result.winner === "draw") this.ttt.scores.draws += 1;
          else this.ttt.scores[result.winner] += 1;
        } else {
          this.ttt.current = current === "X" ? "O" : "X";
        }
        this.broadcast({ type: "state", state: this.ttt });
      }
      if (msg.type === "reset") {
        const scores = this.ttt.scores;
        const players = [...this.ttt.players].reverse();
        this.ttt = { ...tttInitial(), scores, players };
        this.broadcast({ type: "state", state: this.ttt });
      }

    } else if (type === "wh") {
      if (msg.type === "word" && this.wh.phase === "playing") {
        const player = this.wh.players.find((p) => p.id === sender.id);
        if (!player) return;
        player.score += msg.pts;
        player.words += 1;
        this.broadcast({ type: "state", state: this.wh });
      }
      if (msg.type === "done") {
        const player = this.wh.players.find((p) => p.id === sender.id);
        if (player) player.done = true;
        if (this.wh.players.every((p) => p.done)) this.wh.phase = "ended";
        this.broadcast({ type: "state", state: this.wh });
      }
      if (msg.type === "rematch") {
        this.wh.players.forEach((p) => { p.score = 0; p.words = 0; p.done = false; });
        this.wh.grid = whGenerateGrid();
        this.wh.startedAt = Date.now();
        this.wh.phase = "playing";
        this.broadcast({ type: "state", state: this.wh });
      }
    }
  }
}

GameServer satisfies Party.Worker;
