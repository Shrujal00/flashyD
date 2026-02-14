import { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp, Download, Clock } from 'lucide-react';
import { clsx } from 'clsx';
import type { Flashcard } from '../../../lib/ai';
import type { DeckRecord } from '../../../lib/storage';
import { generateAnkiPackage, downloadDeck } from '../../../lib/anki';

interface Props {
  decks: DeckRecord[];
  onDelete: (id: string) => void;
  onLoad: (deck: DeckRecord) => void;
}

function timeAgo(ms: number): string {
  const seconds = Math.floor((Date.now() - ms) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ms).toLocaleDateString();
}

export function DeckHistory({ decks, onDelete, onLoad }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (decks.length === 0) return null;

  const handleDownload = async (deck: DeckRecord) => {
    setDownloadingId(deck.id);
    try {
      const blob = await generateAnkiPackage(deck.cards, deck.deckName);
      downloadDeck(blob, deck.deckName);
    } catch (err) {
      console.error('Failed to download deck:', err);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <section className="mt-16">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
          <Clock size={20} />
        </div>
        <h2 className="text-xl font-bold text-gray-100">Previous Decks</h2>
        <span className="text-sm text-gray-500 font-medium">{decks.length} saved</span>
      </div>

      <div className="space-y-3">
        {decks.map((deck) => {
          const isExpanded = expandedId === deck.id;
          return (
            <div
              key={deck.id}
              className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden transition-all hover:border-gray-700"
            >
              {/* Row */}
              <div className="flex items-center gap-4 px-5 py-4">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : deck.id)}
                  className="text-gray-400 hover:text-gray-200 transition-colors shrink-0"
                >
                  {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>

                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onLoad(deck)}>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-100 truncate">{deck.deckName}</h3>
                    <span className="text-xs text-gray-500 shrink-0">{deck.cardCount} cards</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                    <span>{deck.sourceFile}</span>
                    <span>·</span>
                    <span>{deck.difficulty}</span>
                    <span>·</span>
                    <span>{timeAgo(deck.createdAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleDownload(deck)}
                    disabled={downloadingId === deck.id}
                    className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                    title="Download .apkg"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(deck.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Expanded preview */}
              {isExpanded && (
                <div className="border-t border-gray-800 px-5 py-4 bg-gray-950/50">
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {deck.tags.filter(Boolean).map((tag: string) => (
                      <span key={tag} className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded">
                        {tag}
                      </span>
                    ))}
                    {deck.model && (
                      <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 bg-gray-800 text-gray-400 rounded">
                        {deck.model.split('/').pop()}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                    {deck.cards.map((card: Flashcard, idx: number) => (
                      <div key={idx} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] text-gray-500 font-medium">#{idx + 1}</span>
                          <span className={clsx(
                            "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                            card.type === 'cloze' ? "bg-purple-500/15 text-purple-400" : "bg-blue-500/15 text-blue-400"
                          )}>
                            {card.type || 'basic'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-200 font-medium mb-2">{card.front}</p>
                        <p className="text-sm text-gray-400">{card.back}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => onLoad(deck)}
                    className="mt-4 w-full text-sm text-center py-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors font-medium"
                  >
                    Load this deck into editor
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
