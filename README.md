# Flashy

AI-powered flashcard generator that turns documents into Anki-ready decks.

Upload a PDF, Markdown, or text file — pick a model — and get a downloadable `.apkg` file in seconds.

## Features

- **Document parsing** — PDF, Markdown, and plain text extraction
- **AI generation** — Uses OpenRouter to access GPT-4o, Claude, Gemini, DeepSeek, Llama, and free models
- **Configurable** — Set card count, difficulty, tags, and focus areas
- **Anki export** — Downloads a ready-to-import `.apkg` package
- **Dark mode UI** — Clean, minimal interface

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- pdf.js for PDF extraction
- sql.js + JSZip for Anki package generation
- OpenRouter API

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

1. Drop a document (PDF, MD, or TXT)
2. Configure deck name, card count, difficulty, and tags
3. Pick a model and click **Generate Flashcards**
4. Review the cards and click **Download .apkg**
5. Import the file into Anki

## License

MIT

