import Link from "next/link";

interface GameCardProps {
  title: string;
  description: string;
  href: string;
  color: string;
}

export default function GameCard({ title, description, href, color }: GameCardProps) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 transition-all hover:border-zinc-600 hover:bg-zinc-800"
    >
      <div className={`h-2 w-10 rounded-full ${color}`} />
      <h2 className="text-xl font-semibold text-zinc-50 group-hover:text-white">{title}</h2>
      <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
    </Link>
  );
}
