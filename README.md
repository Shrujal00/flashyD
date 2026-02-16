# Flashy

AI-powered flashcard generator that turns documents into Anki-ready decks.

Upload a PDF, Markdown, or text file — pick a model — and get a downloadable `.apkg` file in seconds.

## Features

- **Document parsing** — PDF, Markdown, and plain text extraction
- **AI generation** — Uses OpenRouter to access GPT-4o, Claude, Gemini, DeepSeek, Llama, and free models
- **Configurable** — Set card count, difficulty, tags, and focus areas
- **Anki export** — Downloads a ready-to-import `.apkg` package
- **Deck history** — Previously generated decks are saved locally and can be re-downloaded or loaded
- **Dark mode UI** — Clean, minimal interface with smooth animations

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Framer Motion for animations
- pdf.js for PDF extraction
- sql.js + JSZip for Anki package generation
- OpenRouter API

## How It Works

### 1. Text Extraction

When you upload a file, Flashy extracts the raw text:

- **PDF** — Uses [pdf.js](https://mozilla.github.io/pdf.js/) (Mozilla's PDF renderer) to iterate through every page and pull out the text content.
- **Markdown** — Read as plain text directly. The AI model understands Markdown formatting natively.
- **Plain text** — Read as-is. You can also paste text directly instead of uploading a file.

### 2. AI Flashcard Generation

The extracted text is sent to an AI model through the [OpenRouter](https://openrouter.ai/) API:

1. A **system prompt** instructs the model to act as an expert flashcard designer. It defines what Basic, Intermediate, and Advanced difficulty levels mean, and sets rules for good card design (atomic, clear, concise).
2. A **user prompt** includes the document text (up to 100k characters), the chosen difficulty, card count, focus areas, and tags.
3. The model returns a **JSON array** of flashcard objects, each with `front`, `back`, `type`, and `tags`.
4. The parser handles **truncated responses** gracefully — if a free model runs out of tokens mid-response, the parser recovers as many complete cards as possible instead of failing.

The API key is sent directly from your browser to OpenRouter. Flashy never stores, logs, or proxies your key through any server.

### 3. Anki `.apkg` Generation

Anki's `.apkg` format is a ZIP archive containing a SQLite database. Here's how Flashy builds one entirely in your browser:

1. **sql.js** (a WebAssembly/asm.js port of SQLite) creates an in-memory SQLite database.
2. Flashy creates the tables Anki expects: `col` (collection metadata), `notes` (card content), `cards` (scheduling data), `revlog` (review log), and `graves` (deleted items).
3. Each flashcard is inserted as a **note** with a unique ID and timestamp, and a corresponding **card** entry.
4. The collection metadata includes the deck name, a basic note model, and default configuration.
5. The database is exported as a binary blob, then packaged into a **ZIP file** using [JSZip](https://stuk.github.io/jszip/) with the entry `collection.anki2` and an empty `media` file.
6. The ZIP is renamed to `.apkg` and triggered as a browser download.

No server involved — the entire `.apkg` is built client-side in your browser.

### 4. Local Storage

Every generated deck is automatically saved to your browser's `localStorage`:

- Stored under the key `flashy_decks` as a JSON array of deck records.
- Each record includes: deck name, all cards, model used, difficulty, source filename, tags, and a timestamp.
- You can **re-download**, **load into the editor**, or **delete** any saved deck from the history section.
- Data never leaves your browser. There is no backend, no database, no analytics.

## Privacy

Flashy does not collect, store, or transmit any of your data. Period.

- Your **API key** lives only in React state — it's gone when you close the tab.
- Your **documents** are processed entirely in the browser. Text is sent to OpenRouter only for generation, and only from your browser directly.
- Your **saved decks** are stored in `localStorage` on your machine. No server ever sees them.
- There are **no cookies, no analytics, no tracking scripts, no telemetry**.

## Getting Started

```bash
git clone https://github.com/Shrujal00/flashyD.git
cd flashyD
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

You'll need an [OpenRouter API key](https://openrouter.ai/) — paste it in the header bar. Free models are available.

## Usage

1. Drop a document (PDF, MD, or TXT) or paste text directly
2. Configure deck name, card count, difficulty, and tags
3. Pick a model and click **Generate Flashcards**
4. Review the cards and click **Download .apkg**
5. Import the file into Anki

## License

MIT

