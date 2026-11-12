/**
 * Copyright (c) 2026 SAI contributors. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

export type WorkspaceStatus = "running" | "stopped";

export interface WorkspaceRecord {
    id: string;
    name: string;
    repositoryId: string;
    repository: string;
    branch: string;
    status: WorkspaceStatus;
    machine: string;
    updatedAt: string;
}

export interface RepositoryRecord {
    id: string;
    name: string;
    url: string;
    branch: string;
    visibility: "Private" | "Public";
    updatedAt: string;
}

export interface OrganizationRecord {
    id: string;
    name: string;
    slug: string;
    members: number;
    plan: string;
}

export interface PlatformSettings {
    theme: "light" | "dark";
    editor: "VS Code" | "Cursor" | "JetBrains";
    machine: "Standard · 4 vCPU" | "Performance · 8 vCPU" | "GPU · 16 vCPU";
}

export interface PlatformState {
    workspaces: WorkspaceRecord[];
    repositories: RepositoryRecord[];
    organizations: OrganizationRecord[];
    activeOrganizationId: string;
    settings: PlatformSettings;
}

const STORAGE_KEY = "sai.cloud-platform.v1";
const now = Date.now();
const ago = (hours: number) => new Date(now - hours * 60 * 60 * 1000).toISOString();

const starterState: PlatformState = {
    workspaces: [
        {
            id: "ws-sai-main",
            name: "sai-main",
            repositoryId: "repo-sai",
            repository: "Spacze-Tesleem/SAI",
            branch: "main",
            status: "running",
            machine: "Standard · 4 vCPU",
            updatedAt: ago(0.2),
        },
        {
            id: "ws-portfolio",
            name: "portfolio-refresh",
            repositoryId: "repo-portfolio",
            repository: "Spacze-Tesleem/portfolio",
            branch: "redesign/homepage",
            status: "stopped",
            machine: "Performance · 8 vCPU",
            updatedAt: ago(5),
        },
        {
            id: "ws-api",
            name: "api-playground",
            repositoryId: "repo-api",
            repository: "Spacze-Tesleem/api-playground",
            branch: "main",
            status: "running",
            machine: "Standard · 4 vCPU",
            updatedAt: ago(28),
        },
    ],
    repositories: [
        {
            id: "repo-sai",
            name: "SAI",
            url: "https://github.com/Spacze-Tesleem/SAI",
            branch: "main",
            visibility: "Private",
            updatedAt: ago(0.2),
        },
        {
            id: "repo-portfolio",
            name: "portfolio",
            url: "https://github.com/Spacze-Tesleem/portfolio",
            branch: "main",
            visibility: "Public",
            updatedAt: ago(5),
        },
        {
            id: "repo-api",
            name: "api-playground",
            url: "https://github.com/Spacze-Tesleem/api-playground",
            branch: "main",
            visibility: "Private",
            updatedAt: ago(28),
        },
    ],
    organizations: [
        { id: "org-personal", name: "Spacze Tesleem", slug: "spacze-tesleem", members: 1, plan: "Personal" },
        { id: "org-sai-labs", name: "SAI Labs", slug: "sai-labs", members: 4, plan: "Team" },
    ],
    activeOrganizationId: "org-personal",
    settings: {
        theme: "light",
        editor: "VS Code",
        machine: "Standard · 4 vCPU",
    },
};

function clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

function readState(): PlatformState {
    try {
        const saved = window.localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved) as Partial<PlatformState>;
            return {
                ...clone(starterState),
                ...parsed,
                workspaces: Array.isArray(parsed.workspaces) ? parsed.workspaces : clone(starterState.workspaces),
                repositories: Array.isArray(parsed.repositories)
                    ? parsed.repositories
                    : clone(starterState.repositories),
                organizations: Array.isArray(parsed.organizations)
                    ? parsed.organizations
                    : clone(starterState.organizations),
                settings: { ...starterState.settings, ...parsed.settings },
            };
        }
    } catch {
        // A blocked or malformed local-storage value should never prevent the demo from opening.
    }
    const initial = clone(starterState);
    persist(initial);
    return initial;
}

function persist(state: PlatformState): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // Keep the in-memory experience usable if storage is disabled by the browser.
    }
}

async function snapshot(): Promise<PlatformState> {
    await new Promise((resolve) => window.setTimeout(resolve, 90));
    return clone(readState());
}

function saveAndReturn(state: PlatformState): Promise<PlatformState> {
    persist(state);
    return snapshot();
}

function normalizeRepositoryUrl(url: string): string {
    const clean = url
        .trim()
        .replace(/\.git$/i, "")
        .replace(/\/+$/, "");
    const sshMatch = clean.match(/^git@([^:]+):(.+)$/i);
    if (sshMatch) {
        return `https://${sshMatch[1]}/${sshMatch[2]}`;
    }
    return /^https?:\/\//i.test(clean) ? clean : `https://github.com/${clean}`;
}

function slugFromRepository(url: string): string {
    const finalPart = normalizeRepositoryUrl(url).split(/[/:]/).filter(Boolean).pop();
    return (finalPart || "new-workspace").toLowerCase().replace(/[^a-z0-9-]/g, "-");
}

function makeId(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function getPlatformState(): Promise<PlatformState> {
    return snapshot();
}

export async function createWorkspace(input: {
    name?: string;
    repository: string;
    branch?: string;
    machine?: string;
}): Promise<PlatformState> {
    const state = readState();
    const repositoryUrl = normalizeRepositoryUrl(input.repository);
    const repositoryName = slugFromRepository(repositoryUrl);
    const existing = state.repositories.find(
        (item) => normalizeRepositoryUrl(item.url).toLowerCase() === repositoryUrl.toLowerCase(),
    );
    const repositoryId = existing?.id ?? makeId("repo");

    if (!existing) {
        state.repositories.unshift({
            id: repositoryId,
            name: repositoryName,
            url: repositoryUrl,
            branch: input.branch?.trim() || "main",
            visibility: "Private",
            updatedAt: new Date().toISOString(),
        });
    }

    state.workspaces.unshift({
        id: makeId("ws"),
        name: input.name?.trim() || repositoryName,
        repositoryId,
        repository: repositoryUrl.replace(/^https?:\/\//i, "").replace(/\.git$/i, ""),
        branch: input.branch?.trim() || existing?.branch || "main",
        status: "running",
        machine: input.machine || state.settings.machine,
        updatedAt: new Date().toISOString(),
    });
    return saveAndReturn(state);
}

export async function setWorkspaceStatus(id: string, status: WorkspaceStatus): Promise<PlatformState> {
    const state = readState();
    state.workspaces = state.workspaces.map((workspace) =>
        workspace.id === id ? { ...workspace, status, updatedAt: new Date().toISOString() } : workspace,
    );
    return saveAndReturn(state);
}

export async function deleteWorkspace(id: string): Promise<PlatformState> {
    const state = readState();
    state.workspaces = state.workspaces.filter((workspace) => workspace.id !== id);
    return saveAndReturn(state);
}

export async function createRepository(input: {
    name: string;
    url: string;
    branch?: string;
    visibility: "Private" | "Public";
}): Promise<PlatformState> {
    const state = readState();
    const normalizedUrl = normalizeRepositoryUrl(input.url);
    state.repositories.unshift({
        id: makeId("repo"),
        name: input.name.trim() || slugFromRepository(normalizedUrl),
        url: normalizedUrl,
        branch: input.branch?.trim() || "main",
        visibility: input.visibility,
        updatedAt: new Date().toISOString(),
    });
    return saveAndReturn(state);
}

export async function deleteRepository(id: string): Promise<PlatformState> {
    const state = readState();
    const linkedWorkspaceIds = new Set(
        state.workspaces.filter((workspace) => workspace.repositoryId === id).map((workspace) => workspace.id),
    );
    state.repositories = state.repositories.filter((repository) => repository.id !== id);
    state.workspaces = state.workspaces.filter((workspace) => !linkedWorkspaceIds.has(workspace.id));
    return saveAndReturn(state);
}

export async function createOrganization(name: string): Promise<PlatformState> {
    const state = readState();
    const slug =
        name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "") || "new-organization";
    const organization = {
        id: makeId("org"),
        name: name.trim(),
        slug,
        members: 1,
        plan: "Personal",
    };
    state.organizations.unshift(organization);
    state.activeOrganizationId = organization.id;
    return saveAndReturn(state);
}

export async function setActiveOrganization(id: string): Promise<PlatformState> {
    const state = readState();
    if (state.organizations.some((organization) => organization.id === id)) {
        state.activeOrganizationId = id;
    }
    return saveAndReturn(state);
}

export async function updateSettings(settings: Partial<PlatformSettings>): Promise<PlatformState> {
    const state = readState();
    state.settings = { ...state.settings, ...settings };
    return saveAndReturn(state);
}

export async function resetPlatformState(): Promise<PlatformState> {
    const state = clone(starterState);
    return saveAndReturn(state);
}
