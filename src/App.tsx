import { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { Download, Sparkles, FileText, Rocket, Type } from 'lucide-react';
import { FileUploader } from './components/features/upload/FileUploader';
import { ConfigurationPanel } from './components/features/config/ConfigurationPanel';
import { extractText } from './lib/extractors';
import { generateFlashcards, fetchAvailableModels, FALLBACK_MODELS } from './lib/ai';
import type { Flashcard, ModelOption } from './lib/ai';
import { generateAnkiPackage, downloadDeck } from './lib/anki';
import { getDecks, saveDeck, deleteDeck } from './lib/storage';
import type { DeckRecord } from './lib/storage';
import { DeckHistory } from './components/features/history/DeckHistory';
import { ApiKeyGuide } from './components/features/guide/ApiKeyGuide';

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

  const [pastedText, setPastedText] = useState('');

  const handleConfigChange = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleTextSubmit = () => {
    const trimmed = pastedText.trim();
    if (!trimmed) return;
    setExtractedText(trimmed);
    setCards([]);
    setGenerationError(null);
    if (!config.deckName) {
      setConfig(prev => ({ ...prev, deckName: 'My Deck' }));
    }
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
        sourceFile: file?.name ?? 'Pasted text',
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
            />            <ApiKeyGuide compact />          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {!file && !extractedText ? (
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

            {/* Divider */}
            <div className="flex items-center gap-4 max-w-2xl mx-auto w-full">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-sm text-gray-500 font-medium">or paste your text</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            {/* Text Input */}
            <div className="max-w-2xl mx-auto w-full">
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste your notes, lecture content, or any text here..."
                className="w-full h-40 bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm text-gray-200 placeholder-gray-600 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none transition-colors"
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-600">
                  {pastedText.length > 0 ? `${pastedText.length.toLocaleString()} characters` : ''}
                </span>
                <button
                  onClick={handleTextSubmit}
                  disabled={!pastedText.trim()}
                  className={clsx(
                    "flex items-center gap-2 px-5 py-2 text-sm font-medium rounded-lg transition-all",
                    pastedText.trim()
                      ? "bg-blue-600 text-white hover:bg-blue-500 active:scale-95"
                      : "bg-gray-800 text-gray-600 cursor-not-allowed"
                  )}
                >
                  <Type size={16} />
                  Use This Text
                </button>
              </div>
            </div>

            <ApiKeyGuide />

            {/* Upcoming Features */}
            <div className="w-full max-w-3xl mx-auto pt-4">
              <div className="flex items-center justify-center gap-2 mb-8">
                <Rocket size={20} className="text-indigo-400" />
                <h2 className="text-lg font-bold text-gray-100">Coming Soon</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { icon: '▶', label: 'YouTube → Flashcards', desc: 'Paste a video link and generate cards from the transcript', color: 'red' },
                  { icon: '🌐', label: 'URL → Flashcards', desc: 'Turn any webpage or article into study material', color: 'blue' },
                  { icon: '🎙', label: 'Audio → Flashcards', desc: 'Upload lectures or podcasts and extract key concepts', color: 'purple' },
                  { icon: '📸', label: 'Image → Flashcards', desc: 'Snap a photo of handwritten notes and create cards', color: 'amber' },
                  { icon: '🧠', label: 'Quiz Mode', desc: 'Test yourself on generated cards before exporting', color: 'emerald' },
                  { icon: '🌍', label: 'Multi-language', desc: 'Generate cards in any language or auto-translate them', color: 'cyan' },
                ].map((feature) => (
                  <div
                    key={feature.label}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors group"
                  >
                    <span className="text-2xl block mb-3">{feature.icon}</span>
                    <h3 className="text-sm font-semibold text-gray-200 mb-1">{feature.label}</h3>
                    <p className="text-xs text-gray-500 leading-relaxed">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {/* Header / Info */}
            <div className="flex items-center justify-between bg-gray-900 p-4 rounded-xl border border-gray-800">
              <div className="flex items-center gap-3">
                <div className={clsx("p-2 rounded-lg", file ? "bg-blue-500/10 text-blue-400" : "bg-indigo-500/10 text-indigo-400")}>
                  {file ? <FileText size={24} /> : <Type size={24} />}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-100">{file ? file.name : 'Pasted Text'}</h2>
                  <p className="text-sm text-gray-500">{extractedText.length.toLocaleString()} characters</p>
                </div>
              </div>
              <button
                onClick={() => { setFile(null); setExtractedText(''); setCards([]); setPastedText(''); }}
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

      <footer className="border-t border-gray-800 py-6 mt-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
          <span>
            Made by{' '}
            <a href="https://github.com/Shrujal00" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-blue-400 font-medium transition-colors">
              Shrujal
            </a>
          </span>
          <a href="https://github.com/Shrujal00/flashyD" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-gray-500 hover:text-blue-400 transition-colors">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
            View on GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

export default App;
