import type { Flashcard } from './ai';

export interface DeckRecord {
  id: string;
  deckName: string;
  cards: Flashcard[];
  model: string;
  difficulty: string;
  sourceFile: string;
  createdAt: number;      // Unix ms
  cardCount: number;
  tags: string[];
}

const STORAGE_KEY = 'flashy_decks';

function readAll(): DeckRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DeckRecord[];
  } catch {
    return [];
  }
}

function writeAll(decks: DeckRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
}

export function getDecks(): DeckRecord[] {
  return readAll().sort((a, b) => b.createdAt - a.createdAt);
}

export function saveDeck(deck: Omit<DeckRecord, 'id' | 'createdAt' | 'cardCount'>): DeckRecord {
  const record: DeckRecord = {
    ...deck,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    cardCount: deck.cards.length,
  };
  const decks = readAll();
  decks.push(record);
  writeAll(decks);
  return record;
}

export function deleteDeck(id: string): void {
  writeAll(readAll().filter(d => d.id !== id));
}

export function getDeck(id: string): DeckRecord | undefined {
  return readAll().find(d => d.id === id);
}
