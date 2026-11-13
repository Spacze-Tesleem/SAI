/**
 * Copyright (c) 2026 SAI contributors. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

import {
    AGENT_SESSIONS_STORAGE_KEY,
    createAgentSession,
    readAgentSessions,
    saveAgentSessions,
} from "./agent-sessions";

const draft = {
    prompt: "Add a focused unit test for the workspace filter.",
    repositoryId: "repo-sai",
    repositoryName: "SAI",
    repositoryUrl: "https://github.com/example/SAI",
    branch: "main",
    modelId: "cohere/north-mini-code:free",
    modelName: "North Mini Code",
    mode: "Agent" as const,
    machine: "Standard · 4 vCPU",
};

describe("SAI agent session drafts", () => {
    beforeEach(() => window.localStorage.clear());

    it("creates and persists a complete session draft", () => {
        const createdAt = new Date("2026-11-12T10:00:00.000Z");
        const session = createAgentSession(draft, createdAt);

        saveAgentSessions([session]);

        expect(session).toMatchObject({ ...draft, createdAt: createdAt.toISOString() });
        expect(session.id).toMatch(/^sai-session-1794477600000-/);
        expect(readAgentSessions()).toEqual([session]);
    });

    it("ignores malformed saved data instead of breaking the workspace", () => {
        window.localStorage.setItem(AGENT_SESSIONS_STORAGE_KEY, "not-json");

        expect(readAgentSessions()).toEqual([]);
    });
});
