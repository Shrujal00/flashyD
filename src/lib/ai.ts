export interface Flashcard {
    front: string;
    back: string;
    type?: 'basic' | 'cloze';
    tags?: string[];
}

export interface ModelOption {
    id: string;
    name: string;
    provider: string;
    free?: boolean;
}

export const AVAILABLE_MODELS: ModelOption[] = [
    { id: 'stepfun/step-3.5-flash', name: 'Step 3.5 Flash', provider: 'StepFun', free: true },
    { id: 'arcee-ai/trinity-large-preview', name: 'Trinity Large Preview', provider: 'Arcee AI', free: true },
    { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google', free: true },
    { id: 'deepseek/deepseek-chat-v3-0324', name: 'DeepSeek V3', provider: 'DeepSeek' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI' },
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic' },
    { id: 'meta-llama/llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta' },
];

export interface GenerationConfig {
    apiKey: string;
    model: string;
    numCards: number;
    difficulty: string;
    deckName: string;
    focusAreas?: string;
    tags?: string[];
}

export async function generateFlashcards(content: string, config: GenerationConfig): Promise<Flashcard[]> {
    if (!config.apiKey) {
        throw new Error('API Key is required');
    }

    const truncatedContent = content.slice(0, 100000);

    const systemPrompt = `You are an expert educational content creator specializing in Anki flashcard design. Create flashcards optimized for spaced repetition learning.

PRINCIPLES:
1. Atomic: One concept per card
2. Clear: Unambiguous questions
3. Concise: Focused answers
4. Progressive: Build complexity gradually
5. Memorable: Use examples and context

AVOID:
- Yes/no questions
- Overly broad questions
- Multiple concepts in one card
- Ambiguous wording`;

    const userPrompt = `
Document Content:
${truncatedContent}

Configuration:
- Difficulty: ${config.difficulty}
- Target Cards: ${config.numCards}
- Focus Areas: ${config.focusAreas || 'Key concepts'}
- Tags: ${config.tags?.join(', ') || 'general'}

Generate ${config.numCards} flashcards as a JSON array.
Format:
[
  {
    "type": "basic",
    "front": "Question...",
    "back": "Answer...",
    "tags": ["tag1", "theme"]
  }
]

Return ONLY valid JSON. No markdown formatting.
`;

    try {
        console.log('[Flashy] Starting generation...', {
            model: config.model,
            contentLength: truncatedContent.length,
            numCards: config.numCards,
            difficulty: config.difficulty,
        });
        const result = await callOpenRouter(config.apiKey, config.model, systemPrompt, userPrompt);
        console.log('[Flashy] Generation complete!', result.length, 'cards');
        return result;
    } catch (error) {
        console.error('[Flashy] AI Generation Error:', error);
        throw error;
    }
}

async function callOpenRouter(apiKey: string, model: string, system: string, user: string): Promise<Flashcard[]> {
    console.log('[Flashy] Calling OpenRouter API...', { model, url: 'https://openrouter.ai/api/v1/chat/completions' });
    const startTime = performance.now();

    let response: Response;
    try {
        response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Flashy',
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: user }
                ],
                temperature: 0.7
            })
        });
    } catch (fetchErr) {
        console.error('[Flashy] Network/fetch error:', fetchErr);
        throw new Error(`Network error: ${fetchErr instanceof Error ? fetchErr.message : 'Failed to reach OpenRouter'}`);
    }

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
    console.log(`[Flashy] Response received in ${elapsed}s — status: ${response.status}`);

    if (!response.ok) {
        const errBody = await response.text().catch(() => '');
        console.error('[Flashy] API error response:', response.status, errBody);
        let message = `OpenRouter API failed (${response.status})`;
        try {
            const parsed = JSON.parse(errBody);
            message = parsed.error?.message || message;
        } catch { /* use default message */ }
        throw new Error(message);
    }

    const data = await response.json();
    console.log('[Flashy] API response data:', {
        id: data.id,
        model: data.model,
        usage: data.usage,
        finishReason: data.choices?.[0]?.finish_reason,
        contentLength: data.choices?.[0]?.message?.content?.length,
    });

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
        console.error('[Flashy] No content in response:', JSON.stringify(data).slice(0, 500));
        throw new Error('No response content from model');
    }

    console.log('[Flashy] Raw response (first 300 chars):', text.slice(0, 300));
    return parseJSON(text);
}

function parseJSON(text: string): Flashcard[] {
    try {
        const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleanText);
        console.log(`[Flashy] Parsed ${parsed.length} cards from JSON`);
        return parsed;
    } catch (e) {
        console.error('[Flashy] JSON Parse Error. Raw text:', text.slice(0, 500));
        throw new Error('Failed to parse AI response as JSON');
    }
}
