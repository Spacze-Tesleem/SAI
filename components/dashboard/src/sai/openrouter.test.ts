/**
 * Copyright (c) 2026 SAI contributors. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

import {
    DEFAULT_OPENROUTER_MODEL_ID,
    OPENROUTER_MODELS,
    requestOpenRouterCompletion,
    requestOpenRouterEmbedding,
    verifyOpenRouterKey,
} from "./openrouter";

const mockFetch = jest.fn();

beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch as typeof fetch;
});

describe("SAI OpenRouter client", () => {
    it("offers the requested provider models and defaults to a free chat model", () => {
        expect(OPENROUTER_MODELS.map((model) => model.id)).toEqual([
            "poolside/laguna-s-2.1",
            "nvidia/llama-nemotron-embed-vl-1b-v2",
            "cohere/north-mini-code:free",
            "perplexity/pplx-decider-flash-v1.3:free",
        ]);
        expect(DEFAULT_OPENROUTER_MODEL_ID).toBe("cohere/north-mini-code:free");
    });

    it("verifies the key without storing it", async () => {
        mockFetch.mockResolvedValue({ ok: true, json: async () => ({ data: { label: "SAI" } }) });
        await verifyOpenRouterKey("sk-or-test");

        expect(mockFetch).toHaveBeenCalledWith(
            "https://openrouter.ai/api/v1/auth/key",
            expect.objectContaining({
                method: "GET",
                headers: expect.objectContaining({ Authorization: "Bearer sk-or-test" }),
            }),
        );
    });

    it("posts chat messages to the OpenRouter completion API", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ choices: [{ message: { content: "  Hello from SAI.  " } }] }),
        });

        const answer = await requestOpenRouterCompletion("sk-or-test", DEFAULT_OPENROUTER_MODEL_ID, [
            { role: "user", content: "Hello" },
        ]);

        expect(answer).toBe("Hello from SAI.");
        const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
        expect(JSON.parse(options.body as string)).toMatchObject({
            model: DEFAULT_OPENROUTER_MODEL_ID,
            messages: [{ role: "system" }, { role: "user", content: "Hello" }],
        });
    });

    it("uses the embeddings endpoint for the NVIDIA embedding model", async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({ data: [{ embedding: [0.1, -0.25, 0.9] }], usage: { prompt_tokens: 4 } }),
        });

        const result = await requestOpenRouterEmbedding(
            "sk-or-test",
            "nvidia/llama-nemotron-embed-vl-1b-v2",
            "search this text",
        );

        expect(result).toEqual({ vector: [0.1, -0.25, 0.9], tokens: 4 });
        expect(mockFetch).toHaveBeenCalledWith(
            "https://openrouter.ai/api/v1/embeddings",
            expect.objectContaining({ method: "POST" }),
        );
    });

    it("returns a useful error when OpenRouter rejects the key", async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 401,
            json: async () => ({ error: { message: "Invalid API key" } }),
        });

        await expect(verifyOpenRouterKey("bad-key")).rejects.toThrow("OpenRouter did not accept this API key");
    });
});
