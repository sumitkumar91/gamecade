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

// ─── Wordle ──────────────────────────────────────────────────────────────────

interface WLPlayer { id: string; guesses: number; won: boolean; done: boolean; }
interface WLState {
  wordSeed: number | null; // clients derive answer from seed
  players: WLPlayer[];
  phase: "waiting" | "playing" | "ended";
}

function wlInitial(): WLState {
  return { wordSeed: null, players: [], phase: "waiting" };
}

// ─── Memory Battle ───────────────────────────────────────────────────────────

const MEM_EMOJIS = ["🐶","🐱","🦊","🐸","🦋","🌸","🍕","🎸","🚀","🌈","⚡","🎯","🍩","🦄","🎃","🐙"];
const MEM_PAIRS = 8;

interface MEMCard { id: number; emoji: string; matched: boolean; matchedBy: string | null; flipped: boolean; }
interface MEMState {
  cards: MEMCard[];
  players: { id: string; score: number }[];
  turn: string;
  flipped: number[];
  phase: "waiting" | "playing" | "ended";
}

function memShuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function memMakeCards(): MEMCard[] {
  const chosen = memShuffle(MEM_EMOJIS).slice(0, MEM_PAIRS);
  return memShuffle([...chosen, ...chosen].map((emoji, i) => ({ id: i, emoji, matched: false, matchedBy: null, flipped: false })));
}

function memInitial(): MEMState {
  return { cards: [], players: [], turn: "", flipped: [], phase: "waiting" };
}

// ─── Reaction Duel ────────────────────────────────────────────────────────────

const RXN_ROUNDS = 5;

interface RXNPlayer { id: string; wins: number; rt: number | null; tapped: boolean; tooSoon: boolean; }
interface RXNState {
  players: RXNPlayer[];
  phase: "waiting" | "standby" | "go" | "result" | "ended";
  round: number;
  startedAt: number | null;
}

function rxnInitial(): RXNState {
  return { players: [], phase: "waiting", round: 1, startedAt: null };
}

// ─── Unified Server ──────────────────────────────────────────────────────────
// Room ID prefix determines game type:
//   "TTT-XXXXXX" → Tic Tac Toe
//   "WH-XXXXXX"  → Word Hunt
//   "WL-XXXXXX"  → Wordle
//   "MEM-XXXXXX" → Memory Battle
//   "RXN-XXXXXX" → Reaction Duel

type GameType = "ttt" | "wh" | "wl" | "mem" | "rxn" | "unknown";

function gameType(roomId: string): GameType {
  if (roomId.startsWith("TTT-")) return "ttt";
  if (roomId.startsWith("WH-")) return "wh";
  if (roomId.startsWith("WL-")) return "wl";
  if (roomId.startsWith("MEM-")) return "mem";
  if (roomId.startsWith("RXN-")) return "rxn";
  return "unknown";
}

export default class GameServer implements Party.Server {
  ttt: TTTState = tttInitial();
  wh: WHState = whInitial();
  wl: WLState = wlInitial();
  mem: MEMState = memInitial();
  rxn: RXNState = rxnInitial();
  rxnTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(readonly room: Party.Room) {}

  broadcast(payload: unknown) {
    this.room.broadcast(JSON.stringify(payload));
  }

  rxnStartStandby() {
    this.rxn.phase = "standby";
    this.rxn.players.forEach((p) => { p.rt = null; p.tapped = false; p.tooSoon = false; });
    this.rxn.startedAt = null;
    this.broadcast({ type: "state", state: this.rxn });
    const delay = 1500 + Math.random() * 3500;
    this.rxnTimer = setTimeout(() => {
      this.rxn.phase = "go";
      this.rxn.startedAt = Date.now();
      this.broadcast({ type: "state", state: this.rxn });
    }, delay);
  }

  rxnCheckResult() {
    const all = this.rxn.players.every((p) => p.tapped || p.tooSoon);
    if (!all) return;
    if (this.rxnTimer) { clearTimeout(this.rxnTimer); this.rxnTimer = null; }
    // determine winner: lowest rt wins, tooSoon loses
    const valid = this.rxn.players.filter((p) => !p.tooSoon && p.rt !== null);
    if (valid.length > 0) {
      const winner = valid.reduce((a, b) => (a.rt! < b.rt! ? a : b));
      winner.wins += 1;
    }
    this.rxn.phase = this.rxn.round >= RXN_ROUNDS ? "ended" : "result";
    this.broadcast({ type: "state", state: this.rxn });
    if (this.rxn.phase === "result") {
      setTimeout(() => {
        this.rxn.round += 1;
        this.rxnStartStandby();
      }, 2500);
    }
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

    } else if (type === "wl") {
      const { players } = this.wl;
      if (!players.find((p) => p.id === conn.id) && players.length < 2)
        players.push({ id: conn.id, guesses: 0, won: false, done: false });
      if (players.length === 2 && this.wl.phase === "waiting") {
        this.wl.wordSeed = Math.floor(Math.random() * 2309);
        this.wl.phase = "playing";
      }
      conn.send(JSON.stringify({ type: "state", state: this.wl }));
      this.broadcast({ type: "state", state: this.wl });

    } else if (type === "mem") {
      if (!this.mem.players.find((p) => p.id === conn.id) && this.mem.players.length < 2)
        this.mem.players.push({ id: conn.id, score: 0 });
      if (this.mem.players.length === 2 && this.mem.phase === "waiting") {
        this.mem.cards = memMakeCards();
        this.mem.turn = this.mem.players[0].id;
        this.mem.phase = "playing";
      }
      conn.send(JSON.stringify({ type: "state", state: this.mem }));
      this.broadcast({ type: "state", state: this.mem });

    } else if (type === "rxn") {
      if (!this.rxn.players.find((p) => p.id === conn.id) && this.rxn.players.length < 2)
        this.rxn.players.push({ id: conn.id, wins: 0, rt: null, tapped: false, tooSoon: false });
      if (this.rxn.players.length === 2 && this.rxn.phase === "waiting") {
        this.rxnStartStandby();
      }
      conn.send(JSON.stringify({ type: "state", state: this.rxn }));
      this.broadcast({ type: "state", state: this.rxn });
    }
  }

  onClose(conn: Party.Connection) {
    const type = gameType(this.room.id);

    if (type === "ttt") {
      this.ttt.players = this.ttt.players.filter((id) => id !== conn.id);
      this.broadcast({ type: "state", state: this.ttt });

    } else if (type === "wh") {
      this.wh.players = this.wh.players.filter((p) => p.id !== conn.id);
      if (this.wh.phase === "playing" && this.wh.players.length < 2) this.wh = whInitial();
      this.broadcast({ type: "state", state: this.wh });

    } else if (type === "wl") {
      this.wl.players = this.wl.players.filter((p) => p.id !== conn.id);
      if (this.wl.phase === "playing" && this.wl.players.length < 2) this.wl = wlInitial();
      this.broadcast({ type: "state", state: this.wl });

    } else if (type === "mem") {
      this.mem.players = this.mem.players.filter((p) => p.id !== conn.id);
      if (this.mem.phase === "playing" && this.mem.players.length < 2) this.mem = memInitial();
      this.broadcast({ type: "state", state: this.mem });

    } else if (type === "rxn") {
      if (this.rxnTimer) { clearTimeout(this.rxnTimer); this.rxnTimer = null; }
      this.rxn.players = this.rxn.players.filter((p) => p.id !== conn.id);
      if (this.rxn.players.length < 2) this.rxn = rxnInitial();
      this.broadcast({ type: "state", state: this.rxn });
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

    } else if (type === "wl") {
      // Client sends { type: "guessed", won: boolean } after each valid guess
      if (msg.type === "guessed") {
        const player = this.wl.players.find((p) => p.id === sender.id);
        if (!player || player.done) return;
        player.guesses += 1;
        if (msg.won) { player.won = true; player.done = true; }
        else if (player.guesses >= 6) player.done = true;
        if (this.wl.players.every((p) => p.done)) this.wl.phase = "ended";
        this.broadcast({ type: "state", state: this.wl });
      }
      if (msg.type === "rematch") {
        this.wl.players.forEach((p) => { p.guesses = 0; p.won = false; p.done = false; });
        this.wl.wordSeed = Math.floor(Math.random() * 2309);
        this.wl.phase = "playing";
        this.broadcast({ type: "state", state: this.wl });
      }

    } else if (type === "mem") {
      if (msg.type === "flip" && this.mem.phase === "playing") {
        if (this.mem.turn !== sender.id) return;
        if (this.mem.flipped.length >= 2) return;
        const card = this.mem.cards.find((c) => c.id === msg.cardId);
        if (!card || card.matched || card.flipped) return;
        card.flipped = true;
        this.mem.flipped.push(card.id);
        this.broadcast({ type: "state", state: this.mem });

        if (this.mem.flipped.length === 2) {
          const [a, b] = this.mem.flipped.map((id) => this.mem.cards.find((c) => c.id === id)!);
          if (a.emoji === b.emoji) {
            // match — same player goes again
            a.matched = true; b.matched = true;
            a.matchedBy = sender.id; b.matchedBy = sender.id;
            const player = this.mem.players.find((p) => p.id === sender.id)!;
            player.score += 1;
            this.mem.flipped = [];
            const totalMatched = this.mem.cards.filter((c) => c.matched).length;
            if (totalMatched === this.mem.cards.length) this.mem.phase = "ended";
            this.broadcast({ type: "state", state: this.mem });
          } else {
            // no match — flip back after delay, switch turn
            setTimeout(() => {
              this.mem.cards.forEach((c) => { if (this.mem.flipped.includes(c.id)) c.flipped = false; });
              this.mem.flipped = [];
              const other = this.mem.players.find((p) => p.id !== sender.id);
              if (other) this.mem.turn = other.id;
              this.broadcast({ type: "state", state: this.mem });
            }, 1000);
          }
        }
      }
      if (msg.type === "rematch") {
        const players = this.mem.players.map((p) => ({ ...p, score: 0 }));
        this.mem = { ...memInitial(), players, turn: players[0].id, cards: memMakeCards(), phase: "playing", flipped: [] };
        this.broadcast({ type: "state", state: this.mem });
      }

    } else if (type === "rxn") {
      if (msg.type === "tap" && this.rxn.phase === "go") {
        const player = this.rxn.players.find((p) => p.id === sender.id);
        if (!player || player.tapped) return;
        player.tapped = true;
        player.rt = msg.rt;
        this.rxnCheckResult();
      }
      if (msg.type === "toosoon" && this.rxn.phase === "standby") {
        const player = this.rxn.players.find((p) => p.id === sender.id);
        if (!player || player.tooSoon) return;
        player.tooSoon = true;
        player.tapped = true;
        this.rxnCheckResult();
      }
      if (msg.type === "rematch") {
        if (this.rxnTimer) { clearTimeout(this.rxnTimer); this.rxnTimer = null; }
        const players = this.rxn.players.map((p) => ({ ...p, wins: 0, rt: null, tapped: false, tooSoon: false }));
        this.rxn = { ...rxnInitial(), players };
        this.rxnStartStandby();
      }
    }
  }
}

GameServer satisfies Party.Worker;
