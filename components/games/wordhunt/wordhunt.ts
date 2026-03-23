export interface TrieNode {
  children: Map<string, TrieNode>;
  isWord: boolean;
}

export function buildTrie(words: string[]): TrieNode {
  const root: TrieNode = { children: new Map(), isWord: false };
  for (const word of words) {
    let node = root;
    for (const ch of word.toUpperCase()) {
      if (!node.children.has(ch)) {
        node.children.set(ch, { children: new Map(), isWord: false });
      }
      node = node.children.get(ch)!;
    }
    node.isWord = true;
  }
  return root;
}

export function isValidWord(trie: TrieNode, word: string): boolean {
  if (word.length < 3) return false;
  let node = trie;
  for (const ch of word.toUpperCase()) {
    if (!node.children.has(ch)) return false;
    node = node.children.get(ch)!;
  }
  return node.isWord;
}

// Weighted letter pool — more common letters appear more often
const LETTER_POOL =
  "AAAAAABBCCDDDDEEEEEEEEFFGGGHHHHIIIIIIJKLLLLMMMNNNNNOOOOOOPPQRRRRRSSSSSTTTTTUUUUVVWWXYYZ";

export function generateGrid(): string[][] {
  const grid: string[][] = [];
  for (let r = 0; r < 4; r++) {
    const row: string[] = [];
    for (let c = 0; c < 4; c++) {
      row.push(LETTER_POOL[Math.floor(Math.random() * LETTER_POOL.length)]);
    }
    grid.push(row);
  }
  return grid;
}

export function isAdjacent(
  a: { r: number; c: number },
  b: { r: number; c: number }
): boolean {
  return Math.abs(a.r - b.r) <= 1 && Math.abs(a.c - b.c) <= 1 && !(a.r === b.r && a.c === b.c);
}

export function scoreWord(word: string): number {
  const len = word.length;
  if (len < 3) return 0;
  if (len === 3) return 100;
  if (len === 4) return 200;
  if (len === 5) return 400;
  return 800;
}
