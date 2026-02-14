export interface Flashcard {
  front: string;
  back: string;
  type?: "basic" | "cloze";
  tags?: string[];
}

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  free?: boolean;
}

// Fallback used while the live list loads or if the fetch fails
export const FALLBACK_MODELS: ModelOption[] = [
  {
    id: "google/gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    free: true,
  },
  {
    id: "deepseek/deepseek-chat-v3-0324",
    name: "DeepSeek V3",
    provider: "DeepSeek",
  },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI" },
  { id: "openai/gpt-4o", name: "GPT-4o", provider: "OpenAI" },
  {
    id: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B",
    provider: "Meta",
  },
];

/** Preferred models that get sorted to the top when found in the live list */
const PREFERRED_IDS = new Set([
  "google/gemini-2.0-flash-001",
  "deepseek/deepseek-chat-v3-0324",
  "openai/gpt-4o-mini",
  "openai/gpt-4o",
  "anthropic/claude-3.5-sonnet",
  "meta-llama/llama-3.3-70b-instruct",
]);

/**
 * Fetch available models from the OpenRouter API.
 * A model is marked free when both prompt and completion pricing are "0".
 * Only text-output models are included, capped at 50 results.
 */
export async function fetchAvailableModels(): Promise<ModelOption[]> {
  try {
    console.log("[Flashy] Fetching models from OpenRouter...");
    const res = await fetch("https://openrouter.ai/api/v1/models");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = await res.json();
    const models: ModelOption[] = [];

    for (const m of json.data ?? []) {
      // Only include models that produce text output
      const outputMods: string[] = m.architecture?.output_modalities ?? [];
      if (!outputMods.includes("text")) continue;

      const isFree = m.pricing?.prompt === "0" && m.pricing?.completion === "0";

      // Extract provider from the id (e.g. "openai/gpt-4o" → "OpenAI")
      const rawProvider = (m.id as string).split("/")[0] ?? "";
      const provider =
        rawProvider.charAt(0).toUpperCase() + rawProvider.slice(1);

      models.push({
        id: m.id,
        name: m.name ?? m.id,
        provider,
        free: isFree || undefined,
      });
    }

    // Sort: preferred first, then free, then alphabetical
    models.sort((a, b) => {
      const aPreferred = PREFERRED_IDS.has(a.id) ? 0 : 1;
      const bPreferred = PREFERRED_IDS.has(b.id) ? 0 : 1;
      if (aPreferred !== bPreferred) return aPreferred - bPreferred;
      const aFree = a.free ? 0 : 1;
      const bFree = b.free ? 0 : 1;
      if (aFree !== bFree) return aFree - bFree;
      return a.name.localeCompare(b.name);
    });

    console.log(
      `[Flashy] Fetched ${models.length} models (${models.filter((m) => m.free).length} free)`,
    );
    return models;
  } catch (err) {
    console.warn("[Flashy] Failed to fetch models, using fallback list:", err);
    return FALLBACK_MODELS;
  }
}

export interface GenerationConfig {
  apiKey: string;
  model: string;
  numCards: number;
  difficulty: string;
  deckName: string;
  focusAreas?: string;
  tags?: string[];
}

export async function generateFlashcards(
  content: string,
  config: GenerationConfig,
): Promise<Flashcard[]> {
  if (!config.apiKey) {
    throw new Error("API Key is required");
  }

  const truncatedContent = content.slice(0, 100000);

  const systemPrompt = `You are an expert educational content creator specializing in Anki flashcard design. Create flashcards optimized for spaced repetition learning.

DIFFICULTY LEVELS — you MUST match the requested level:

BASIC:
- Simple recall and definitions
- "What is X?" / "Define X"
- Short, direct answers
- Suitable for beginners first encountering the material

INTERMEDIATE:
- Application and comparison questions
- "How does X differ from Y?" / "Explain how X works" / "What happens when...?"
- Answers require understanding, not just memorization
- Expect the learner to connect ideas

ADVANCED:
- Analysis, synthesis, and evaluation questions
- "Why does X lead to Y?" / "Compare and contrast..." / "What would happen if...?" / "Evaluate the tradeoffs of..."
- Answers are nuanced, multi-part, and may involve edge cases
- Expect deep domain knowledge

PRINCIPLES:
1. Atomic: One concept per card
2. Clear: Unambiguous questions
3. Concise: Focused answers (but advanced cards can have longer answers)
4. Difficulty-appropriate: STRICTLY follow the requested difficulty level
5. Memorable: Use examples and context

AVOID:
- Yes/no questions
- Overly broad questions
- Multiple concepts in one card
- Ambiguous wording
- Generating basic recall cards when intermediate or advanced is requested`;

  const userPrompt = `
Document Content:
${truncatedContent}

Configuration:
- Difficulty: ${config.difficulty}
- Target Cards: ${config.numCards}
- Focus Areas: ${config.focusAreas || "Key concepts"}
- Tags: ${config.tags?.join(", ") || "general"}

IMPORTANT: The difficulty is "${config.difficulty}". You MUST generate ${config.difficulty}-level questions. ${
    config.difficulty === "Basic"
      ? "Focus on definitions, key terms, and simple recall."
      : config.difficulty === "Intermediate"
        ? 'Focus on application, comparison, and "how/why" questions that require understanding.'
        : "Focus on analysis, synthesis, edge cases, and evaluation that require deep expertise."
  }

Generate ${config.numCards} flashcards as a JSON array.
Format:
[
  {
    "type": "basic",
    "front": "Your ${config.difficulty}-level question here",
    "back": "Answer appropriate for ${config.difficulty} difficulty",
    "tags": ["tag1", "theme"]
  }
]

Return ONLY valid JSON. No markdown formatting.
`;

  try {
    console.log("[Flashy] Starting generation...", {
      model: config.model,
      contentLength: truncatedContent.length,
      numCards: config.numCards,
      difficulty: config.difficulty,
    });
    const result = await callOpenRouter(
      config.apiKey,
      config.model,
      systemPrompt,
      userPrompt,
    );
    console.log("[Flashy] Generation complete!", result.length, "cards");
    return result;
  } catch (error) {
    console.error("[Flashy] AI Generation Error:", error);
    throw error;
  }
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  system: string,
  user: string,
): Promise<Flashcard[]> {
  console.log("[Flashy] Calling OpenRouter API...", {
    model,
    url: "https://openrouter.ai/api/v1/chat/completions",
  });
  const startTime = performance.now();

  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": window.location.origin,
        "X-Title": "Flashy",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });
  } catch (fetchErr) {
    console.error("[Flashy] Network/fetch error:", fetchErr);
    throw new Error(
      `Network error: ${fetchErr instanceof Error ? fetchErr.message : "Failed to reach OpenRouter"}`,
    );
  }

  const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
  console.log(
    `[Flashy] Response received in ${elapsed}s — status: ${response.status}`,
  );

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    console.error("[Flashy] API error response:", response.status, errBody);
    let message = `OpenRouter API failed (${response.status})`;
    try {
      const parsed = JSON.parse(errBody);
      message = parsed.error?.message || message;
    } catch {
      /* use default message */
    }

    // Provide user-friendly messages for common errors
    if (
      response.status === 401 ||
      response.status === 403 ||
      message.toLowerCase().includes("authenticate")
    ) {
      throw new Error(
        "Invalid API key. Please check your OpenRouter API key and try again.",
      );
    }
    if (response.status === 402) {
      throw new Error(
        "Insufficient credits. Add credits at openrouter.ai or pick a free model.",
      );
    }
    if (response.status === 429) {
      throw new Error("Rate limited. Please wait a moment and try again.");
    }
    if (response.status === 502 || response.status === 503) {
      throw new Error(
        "OpenRouter is temporarily unavailable. Please try again in a few seconds or pick a different model.",
      );
    }
    throw new Error(message);
  }

  const data = await response.json();
  console.log("[Flashy] API response data:", {
    id: data.id,
    model: data.model,
    usage: data.usage,
    finishReason: data.choices?.[0]?.finish_reason,
    contentLength: data.choices?.[0]?.message?.content?.length,
  });

  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    console.error(
      "[Flashy] No content in response:",
      JSON.stringify(data).slice(0, 500),
    );
    throw new Error("No response content from model");
  }

  console.log("[Flashy] Raw response (first 300 chars):", text.slice(0, 300));
  return parseJSON(text);
}

function parseJSON(text: string): Flashcard[] {
  let cleanText = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  // Try direct parse first
  try {
    const parsed = JSON.parse(cleanText);
    console.log(`[Flashy] Parsed ${parsed.length} cards from JSON`);
    return parsed;
  } catch {
    // continue to recovery
  }

  // Recovery: response was likely truncated by token limit
  console.warn(
    "[Flashy] Direct parse failed, attempting truncation recovery...",
  );

  // Find the array start
  const arrStart = cleanText.indexOf("[");
  if (arrStart === -1) {
    console.error(
      "[Flashy] No JSON array found. Raw text:",
      cleanText.slice(0, 500),
    );
    throw new Error("Failed to parse AI response as JSON");
  }
  cleanText = cleanText.slice(arrStart);

  // Find the last complete object (last valid '}')
  const lastBrace = cleanText.lastIndexOf("}");
  if (lastBrace === -1) {
    throw new Error(
      "Failed to parse AI response as JSON — no complete cards found",
    );
  }

  // Slice up to last complete object and close the array
  const recovered = cleanText.slice(0, lastBrace + 1) + "]";

  try {
    const parsed = JSON.parse(recovered);
    console.log(
      `[Flashy] Recovered ${parsed.length} cards from truncated response`,
    );
    return parsed;
  } catch (e) {
    // Last resort: extract individual objects with regex
    console.warn(
      "[Flashy] Bracket recovery failed, trying regex extraction...",
    );
    const objectPattern =
      /\{[^{}]*"front"\s*:\s*"[^"]*"[^{}]*"back"\s*:\s*"[^"]*"[^{}]*\}/g;
    const matches = cleanText.match(objectPattern);
    if (matches && matches.length > 0) {
      const cards: Flashcard[] = [];
      for (const m of matches) {
        try {
          cards.push(JSON.parse(m));
        } catch {
          /* skip malformed */
        }
      }
      if (cards.length > 0) {
        console.log(`[Flashy] Regex-extracted ${cards.length} cards`);
        return cards;
      }
    }

    console.error(
      "[Flashy] All parse attempts failed. Raw text:",
      cleanText.slice(0, 500),
    );
    throw new Error("Failed to parse AI response as JSON");
  }
}
