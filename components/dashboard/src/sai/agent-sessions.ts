/**
 * Copyright (c) 2026 SAI contributors. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

export type AgentMode = "Agent" | "Plan";

export interface AgentSessionDraft {
    prompt: string;
    repositoryId: string;
    repositoryName: string;
    repositoryUrl: string;
    branch: string;
    modelId: string;
    modelName: string;
    mode: AgentMode;
    machine: string;
}

export interface AgentSession extends AgentSessionDraft {
    id: string;
    createdAt: string;
}

export const AGENT_SESSIONS_STORAGE_KEY = "sai.agent-sessions.v1";

function isAgentSession(value: unknown): value is AgentSession {
    if (!value || typeof value !== "object") return false;
    const session = value as Partial<AgentSession>;
    return (
        typeof session.id === "string" &&
        typeof session.createdAt === "string" &&
        typeof session.prompt === "string" &&
        typeof session.repositoryId === "string" &&
        typeof session.repositoryName === "string" &&
        typeof session.repositoryUrl === "string" &&
        typeof session.branch === "string" &&
        typeof session.modelId === "string" &&
        typeof session.modelName === "string" &&
        (session.mode === "Agent" || session.mode === "Plan") &&
        typeof session.machine === "string"
    );
}

export function createAgentSession(draft: AgentSessionDraft, createdAt = new Date()): AgentSession {
    const randomSuffix = Math.random().toString(36).slice(2, 8);
    return {
        ...draft,
        id: `sai-session-${createdAt.getTime()}-${randomSuffix}`,
        createdAt: createdAt.toISOString(),
    };
}

export function readAgentSessions(storage?: Pick<Storage, "getItem">): AgentSession[] {
    try {
        const saved = (storage ?? window.localStorage).getItem(AGENT_SESSIONS_STORAGE_KEY);
        if (!saved) return [];
        const parsed: unknown = JSON.parse(saved);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(isAgentSession);
    } catch {
        // Keep the workspace available if local storage is blocked or old data is malformed.
        return [];
    }
}

export function saveAgentSessions(sessions: AgentSession[], storage?: Pick<Storage, "setItem">): void {
    try {
        (storage ?? window.localStorage).setItem(AGENT_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    } catch {
        // Session drafts remain usable in memory if local storage is disabled.
    }
}
