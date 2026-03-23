import GameCard from "@/components/GameCard";

const GAMES = [
  {
    title: "Word Hunt",
    description: "Find as many words as you can in a 4×4 letter grid before the 60-second timer runs out.",
    href: "/wordhunt",
    color: "bg-violet-500",
  },
  {
    title: "Wordle",
    description: "Guess the secret 5-letter word in 6 tries. Color hints reveal how close you are.",
    href: "/wordle",
    color: "bg-emerald-500",
  },
  {
    title: "Tic Tac Toe",
    description: "Classic 3×3 grid game. Play against an unbeatable AI or challenge a friend locally.",
    href: "/tictactoe",
    color: "bg-blue-500",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col flex-1 px-6 py-12 max-w-3xl mx-auto w-full">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-50 mb-2">Arcade</h1>
        <p className="text-zinc-400">Pick a game and start playing.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAMES.map((game) => (
          <GameCard key={game.href} {...game} />
        ))}
      </div>
    </div>
  );
}
