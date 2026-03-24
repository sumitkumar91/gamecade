import type * as Party from "partykit/server";

const GAME_DURATION = 60_000; // ms

type Letter = string;

interface PlayerState {
  id: string;
  score: number;
  words: number;
  done: boolean;
}

interface GameState {
  grid: Letter[][];
  players: PlayerState[];
  phase: "waiting" | "playing" | "ended";
  startedAt: number | null;
}

function generateGrid(): Letter[][] {
  const weighted =
    "EEEEEEEEEEAAAAAAAAAIIIIIIIIIOOOOOOOONNNNNNSSSSSSRRRRRRTTTTTTLLLLLUUUUDDDDGGGBBCCMMPPFFHHVVWWYYKJXQZ".split("");
  const grid: Letter[][] = [];
  for (let r = 0; r < 4; r++) {
    const row: Letter[] = [];
    for (let c = 0; c < 4; c++) {
      row.push(weighted[Math.floor(Math.random() * weighted.length)]);
    }
    grid.push(row);
  }
  return grid;
}

function initialState(): GameState {
  return { grid: [], players: [], phase: "waiting", startedAt: null };
}

export default class WordHuntServer implements Party.Server {
  state: GameState;

  constructor(readonly room: Party.Room) {
    this.state = initialState();
  }

  broadcast(state: GameState) {
    this.room.broadcast(JSON.stringify({ type: "state", state }));
  }

  onConnect(conn: Party.Connection) {
    const { players } = this.state;

    if (!players.find((p) => p.id === conn.id) && players.length < 2) {
      players.push({ id: conn.id, score: 0, words: 0, done: false });
    }

    // Start game when 2 players are in
    if (players.length === 2 && this.state.phase === "waiting") {
      this.state.grid = generateGrid();
      this.state.phase = "playing";
      this.state.startedAt = Date.now();
    }

    conn.send(JSON.stringify({ type: "state", state: this.state }));
    this.broadcast(this.state);
  }

  onClose(conn: Party.Connection) {
    this.state.players = this.state.players.filter((p) => p.id !== conn.id);
    if (this.state.phase === "playing" && this.state.players.length < 2) {
      this.state.phase = "waiting";
      this.state.startedAt = null;
      this.state.grid = [];
    }
    this.broadcast(this.state);
  }

  onMessage(message: string, sender: Party.Connection) {
    const msg = JSON.parse(message);

    if (msg.type === "word" && this.state.phase === "playing") {
      const player = this.state.players.find((p) => p.id === sender.id);
      if (!player) return;
      player.score += msg.pts;
      player.words += 1;
      this.broadcast(this.state);
    }

    if (msg.type === "done") {
      const player = this.state.players.find((p) => p.id === sender.id);
      if (player) player.done = true;
      if (this.state.players.every((p) => p.done)) {
        this.state.phase = "ended";
      }
      this.broadcast(this.state);
    }

    if (msg.type === "rematch") {
      // Reset for a new game
      this.state.players.forEach((p) => {
        p.score = 0;
        p.words = 0;
        p.done = false;
      });
      this.state.grid = generateGrid();
      this.state.startedAt = Date.now();
      this.state.phase = "playing";
      this.broadcast(this.state);
    }
  }
}

WordHuntServer satisfies Party.Worker;
