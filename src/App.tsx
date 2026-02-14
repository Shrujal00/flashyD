import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Download, Sparkles, FileText } from 'lucide-react';
import { FileUploader } from './components/features/upload/FileUploader';
import { ConfigurationPanel } from './components/features/config/ConfigurationPanel';
import { extractText } from './lib/extractors';
import { generateFlashcards, fetchAvailableModels, FALLBACK_MODELS } from './lib/ai';
import type { Flashcard, ModelOption } from './lib/ai';
import { generateAnkiPackage, downloadDeck } from './lib/anki';
import { getDecks, saveDeck, deleteDeck } from './lib/storage';
import type { DeckRecord } from './lib/storage';
import { DeckHistory } from './components/features/history/DeckHistory';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);

  // Config State
  const [config, setConfig] = useState({
    deckName: '',
    numCards: 15,
    difficulty: 'Intermediate',
    focusAreas: '',
    tags: ''
  });

  // Generation State
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<ModelOption[]>(FALLBACK_MODELS);
  const [model, setModel] = useState(FALLBACK_MODELS[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Fetch live model list from OpenRouter on mount
  useEffect(() => {
    fetchAvailableModels().then((fetched) => {
      setModels(fetched);
      if (fetched.length > 0 && !fetched.some(m => m.id === model)) {
        setModel(fetched[0].id);
      }
    });
  }, []);
  const [isDownloading, setIsDownloading] = useState(false);

  // Saved decks from localStorage
  const [savedDecks, setSavedDecks] = useState<DeckRecord[]>([]);
  useEffect(() => {
    setSavedDecks(getDecks());
  }, []);

  // Auto-set deck name from filename
  useEffect(() => {
    if (file && !config.deckName) {
      const name = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setConfig(prev => ({ ...prev, deckName: name }));
    }
  }, [file]);

  const handleConfigChange = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsExtracting(true);
    setExtractedText('');
    setCards([]);
    setGenerationError(null);

    try {
      const text = await extractText(selectedFile);
      setExtractedText(text);
    } catch (error) {
      console.error(error);
      alert('Failed to extract text from file');
      setFile(null); // Reset if failed
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      alert('Please enter an API Key');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setCards([]);

    try {
      const generatedCards = await generateFlashcards(extractedText, {
        apiKey,
        model,
        numCards: config.numCards,
        difficulty: config.difficulty,
        deckName: config.deckName,
        tags: config.tags.split(',').map(t => t.trim()).filter(Boolean),
        focusAreas: config.focusAreas
      });
      setCards(generatedCards);

      // Save to local history
      saveDeck({
        deckName: config.deckName || 'Untitled Deck',
        cards: generatedCards,
        model,
        difficulty: config.difficulty,
        sourceFile: file?.name ?? 'unknown',
        tags: config.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      setSavedDecks(getDecks());
    } catch (error: any) {
      setGenerationError(error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!cards.length) return;
    setIsDownloading(true);
    try {
      const blob = await generateAnkiPackage(cards, config.deckName || 'Deck');
      downloadDeck(blob, config.deckName || 'Deck');
    } catch (error) {
      console.error(error);
      alert('Failed to generate Anki package');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteDeck = (id: string) => {
    deleteDeck(id);
    setSavedDecks(getDecks());
  };

  const handleLoadDeck = (deck: DeckRecord) => {
    setCards(deck.cards);
    setConfig(prev => ({
      ...prev,
      deckName: deck.deckName,
      difficulty: deck.difficulty,
      tags: deck.tags.join(', '),
    }));
    // Scroll to top to see the loaded cards
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans pb-20">
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold bg-linear-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Flashy
            </span>
            <span className="text-sm text-gray-400 font-medium px-2 py-0.5 bg-gray-800 rounded-full">Beta</span>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="border border-gray-700 rounded-md px-2 py-1.5 text-sm bg-gray-800 text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.provider}){m.free ? ' ✦ Free' : ''}
                </option>
              ))}
            </select>
            <input
              type="password"
              placeholder="OpenRouter API Key"
              className="border border-gray-700 rounded-md px-3 py-1.5 text-sm w-56 bg-gray-800 text-gray-200 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 outline-none"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {!file ? (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-4 pt-8">
              <p className="text-sm font-medium tracking-widest uppercase text-blue-400/70">Tired of typing flashcards by hand?</p>
              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-gray-100">
                Drop a File. <br />
                <span className="text-blue-400">Get a Deck.</span>
              </h1>
              <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                Upload any document and let AI turn it into study-ready Anki flashcards in seconds.
              </p>
            </div>
            <FileUploader onFileSelect={handleFileSelect} isLoading={isExtracting} />
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Header / Info */}
            <div className="flex items-center justify-between bg-gray-900 p-4 rounded-xl border border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-100">{file.name}</h2>
                  <p className="text-sm text-gray-500">{extractedText.length.toLocaleString()} characters extracted</p>
                </div>
              </div>
              <button
                onClick={() => { setFile(null); setExtractedText(''); setCards([]); }}
                className="text-sm text-red-400 hover:text-red-300 font-medium px-3 py-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                Start Over
              </button>
            </div>

            {/* Configuration */}
            <ConfigurationPanel config={config} onChange={handleConfigChange} />

            {/* Action Area */}
            <div className="flex justify-end items-center gap-4">
              {generationError && (
                <p className="text-red-400 text-sm font-medium">{generationError}</p>
              )}

              {!cards.length ? (
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !apiKey || !extractedText}
                  className={clsx(
                    "flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-medium rounded-xl shadow-md transition-all",
                    (isGenerating || !apiKey || !extractedText)
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transform active:scale-95"
                  )}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Generate Flashcards
                    </>
                  )}
                </button>
              ) : null}
            </div>

            {/* Results */}
            {cards.length > 0 && (
              <div className="space-y-6 pt-6 border-t border-gray-800 animate-in slide-in-from-bottom-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold text-gray-100">
                    Generated Deck <span className="text-gray-500 font-normal text-lg">({cards.length} cards)</span>
                  </h3>
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-xl shadow-md hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 transition-all transform active:scale-95"
                  >
                    {isDownloading ? (
                      'Preparing Download...'
                    ) : (
                      <>
                        <Download size={20} />
                        Download .apkg
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cards.map((card, idx) => (
                    <div key={idx} className="group relative bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200">
                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Edit/Delete actions could go here */}
                      </div>
                      <div className="mb-4">
                        <span className={clsx(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded inline-block",
                          card.type === 'cloze' ? "bg-purple-500/15 text-purple-400" : "bg-blue-500/15 text-blue-400"
                        )}>
                          {card.type || 'Basic'}
                        </span>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <div className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Front</div>
                          <p className="text-gray-100 font-medium leading-relaxed">{card.front}</p>
                        </div>
                        <div className="pt-4 border-t border-gray-800">
                          <div className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Back</div>
                          <p className="text-gray-300 leading-relaxed max-h-32 overflow-y-auto">{card.back}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Previous Decks */}
        <DeckHistory
          decks={savedDecks}
          onDelete={handleDeleteDeck}
          onLoad={handleLoadDeck}
        />
      </main>
    </div>
  );
}

export default App;
