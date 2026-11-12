/**
 * Copyright (c) 2026 SAI contributors. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

export type OpenRouterMessage = {
    role: "user" | "assistant";
    content: string;
};

export interface OpenRouterModel {
    id: string;
    name: string;
    provider: string;
    description: string;
    task: "chat" | "embedding";
    free: boolean;
}

export const OPENROUTER_MODELS: OpenRouterModel[] = [
    {
        id: "poolside/laguna-s-2.1",
        name: "Laguna S 2.1",
        provider: "Poolside",
        description: "A capable general-purpose model for coding and problem solving.",
        task: "chat",
        free: false,
    },
    {
        id: "nvidia/llama-nemotron-embed-vl-1b-v2",
        name: "Llama Nemotron Embed VL 1B V2",
        provider: "NVIDIA",
        description: "A compact multimodal embedding model for text and visual search.",
        task: "embedding",
        free: true,
    },
    {
        id: "cohere/north-mini-code:free",
        name: "North Mini Code",
        provider: "Cohere",
        description: "A code-focused assistant available on OpenRouter's free tier.",
        task: "chat",
        free: true,
    },
    {
        id: "perplexity/pplx-decider-flash-v1.3:free",
        name: "PPLX Decider Flash v1.3",
        provider: "Perplexity",
        description: "A fast reasoning model available on OpenRouter's free tier.",
        task: "chat",
        free: true,
    },
];

export const DEFAULT_OPENROUTER_MODEL_ID = "cohere/north-mini-code:free";
const OPENROUTER_API = "https://openrouter.ai/api/v1";

type OpenRouterErrorBody = {
    error?: { message?: string; code?: number | string };
    message?: string;
};

function requestHeaders(apiKey: string): HeadersInit {
    return {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": typeof window === "undefined" ? "https://sai.local" : window.location.origin,
        "X-Title": "SAI Cloud Dev Platform",
    };
}

async function readResponse<T>(response: Response): Promise<T> {
    const body = (await response.json().catch(() => ({}))) as T & OpenRouterErrorBody;
    if (!response.ok) {
        const detail = body.error?.message || body.message;
        const status = response.status;
        if (status === 401 || status === 403) {
            throw new Error("OpenRouter did not accept this API key. Check it and try again.");
        }
        if (status === 402) {
            throw new Error("This request needs a funded OpenRouter account or a free-tier model.");
        }
        if (status === 429) {
            throw new Error("OpenRouter rate limit reached. Wait a moment and try again.");
        }
        throw new Error(detail ? `OpenRouter: ${detail}` : `OpenRouter request failed (${status}).`);
    }
    return body;
}

function networkError(error: unknown): never {
    if (error instanceof TypeError) {
        throw new Error("Could not reach OpenRouter. Check your network connection and browser access to the API.");
    }
    throw error;
}

export async function verifyOpenRouterKey(apiKey: string): Promise<void> {
    try {
        const response = await fetch(`${OPENROUTER_API}/auth/key`, {
            method: "GET",
            headers: requestHeaders(apiKey),
        });
        await readResponse(response);
    } catch (error) {
        networkError(error);
    }
}

export async function requestOpenRouterCompletion(
    apiKey: string,
    model: string,
    messages: OpenRouterMessage[],
): Promise<string> {
    try {
        const response = await fetch(`${OPENROUTER_API}/chat/completions`, {
            method: "POST",
            headers: requestHeaders(apiKey),
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: "system",
                        content:
                            "You are SAI, a helpful cloud development assistant. Be clear, practical, and concise.",
                    },
                    ...messages,
                ],
            }),
        });
        const result = await readResponse<{
            choices?: { message?: { content?: string | { type?: string; text?: string }[] } }[];
        }>(response);
        const content = result.choices?.[0]?.message?.content;
        const text = typeof content === "string" ? content : content?.map((part) => part.text || "").join("");
        if (!text?.trim()) {
            throw new Error("OpenRouter returned an empty response. Try a different model.");
        }
        return text.trim();
    } catch (error) {
        networkError(error);
    }
}

export async function requestOpenRouterEmbedding(
    apiKey: string,
    model: string,
    input: string,
): Promise<{ vector: number[]; tokens?: number }> {
    try {
        const response = await fetch(`${OPENROUTER_API}/embeddings`, {
            method: "POST",
            headers: requestHeaders(apiKey),
            body: JSON.stringify({ model, input }),
        });
        const result = await readResponse<{
            data?: { embedding?: number[] }[];
            usage?: { prompt_tokens?: number };
        }>(response);
        const vector = result.data?.[0]?.embedding;
        if (!Array.isArray(vector) || vector.length === 0) {
            throw new Error("OpenRouter returned no embedding vector for this model.");
        }
        return { vector, tokens: result.usage?.prompt_tokens };
    } catch (error) {
        networkError(error);
    }
}
