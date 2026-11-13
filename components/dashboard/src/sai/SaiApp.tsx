/**
 * Copyright (c) 2026 SAI contributors. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { BrowserRouter, useHistory, useLocation } from "react-router-dom";
import {
    Activity,
    AlertTriangle,
    ArrowRight,
    ArrowUpRight,
    Bell,
    Check,
    ChevronDown,
    Clock3,
    Code2,
    Cpu,
    ExternalLink,
    FolderGit2,
    GitBranch,
    LayoutDashboard,
    LoaderCircle,
    Menu,
    Moon,
    MoreHorizontal,
    Play,
    Plus,
    Search,
    Send,
    Settings2,
    ShieldCheck,
    Sparkles,
    Square,
    Sun,
    Terminal,
    Trash2,
    Users,
    X,
    Zap,
} from "lucide-react";
import {
    createOrganization,
    createRepository,
    createWorkspace,
    deleteRepository,
    deleteWorkspace,
    getPlatformState,
    OrganizationRecord,
    PlatformSettings,
    PlatformState,
    RepositoryRecord,
    resetPlatformState,
    setActiveOrganization,
    setWorkspaceStatus,
    updateSettings,
    WorkspaceRecord,
} from "./local-api";
import {
    DEFAULT_OPENROUTER_MODEL_ID,
    OPENROUTER_MODELS,
    OpenRouterMessage,
    requestOpenRouterCompletion,
    requestOpenRouterEmbedding,
    verifyOpenRouterKey,
} from "./openrouter";
import "./sai.css";
import { isSupabaseConfigured } from "./supabase";
import { AgentHome } from "./AgentHome";
import {
    AutomationsPage as AgentAutomationsPage,
    InsightsPage as AgentInsightsPage,
    AgentSessionPage,
    AgentSessionsPage,
} from "./AgentPages";
import {
    AgentSession,
    AgentSessionDraft,
    createAgentSession,
    readAgentSessions,
    saveAgentSessions,
} from "./agent-sessions";

const pageDetails = {
    home: { title: "Home", eyebrow: "YOUR AI WORKSPACE" },
    overview: { title: "Overview", eyebrow: "YOUR SAI WORKSPACE" },
    workspaces: { title: "Workspaces", eyebrow: "DEVELOPMENT ENVIRONMENTS" },
    repositories: { title: "Projects", eyebrow: "CONNECTED PROJECTS" },
    automations: { title: "Automations", eyebrow: "REPEATABLE PROJECT WORK" },
    insights: { title: "Insights", eyebrow: "YOUR WORKSPACE ACTIVITY" },
    sessions: { title: "Sessions", eyebrow: "YOUR AGENT WORK" },
    session: { title: "Session", eyebrow: "SESSION DRAFT" },
    organizations: { title: "Organizations", eyebrow: "TEAMS & ACCESS" },
    ai: { title: "AI Studio", eyebrow: "YOUR OPENROUTER MODELS" },
    settings: { title: "Settings", eyebrow: "YOUR PREFERENCES" },
} as const;

type PageKey = keyof typeof pageDetails;
type DialogKind = "workspace" | "repository" | "organization" | null;
type AiMessage = OpenRouterMessage & { id: string; createdAt: number };

const navGroups: {
    label: string;
    items: { title: string; href: string; page: PageKey; icon: typeof LayoutDashboard }[];
}[] = [
    {
        label: "WORKSPACE",
        items: [
            { title: "Home", href: "/", page: "home", icon: LayoutDashboard },
            { title: "Projects", href: "/repositories", page: "repositories", icon: FolderGit2 },
            { title: "Automations", href: "/automations", page: "automations", icon: Zap },
            { title: "Insights", href: "/insights", page: "insights", icon: Activity },
            { title: "Sessions", href: "/sessions", page: "sessions", icon: Clock3 },
        ],
    },
    {
        label: "BUILD",
        items: [
            { title: "Workspaces", href: "/workspaces", page: "workspaces", icon: Terminal },
            { title: "AI Studio", href: "/ai", page: "ai", icon: Sparkles },
            { title: "Platform overview", href: "/overview", page: "overview", icon: LayoutDashboard },
        ],
    },
    {
        label: "MANAGE",
        items: [
            { title: "Organizations", href: "/organizations", page: "organizations", icon: Users },
            { title: "Settings", href: "/settings", page: "settings", icon: Settings2 },
        ],
    },
];

function pageFromPath(pathname: string): PageKey {
    if (pathname.startsWith("/sessions/")) return "session";
    if (pathname.startsWith("/sessions")) return "sessions";
    if (pathname.startsWith("/automations")) return "automations";
    if (pathname.startsWith("/insights")) return "insights";
    if (pathname.startsWith("/overview")) return "overview";
    if (pathname.startsWith("/workspaces")) return "workspaces";
    if (pathname.startsWith("/repositories") || pathname.startsWith("/projects")) return "repositories";
    if (pathname.startsWith("/organizations")) return "organizations";
    if (pathname.startsWith("/ai")) return "ai";
    if (pathname.startsWith("/settings")) return "settings";
    return "home";
}

function formatRelativeDate(date: string): string {
    const elapsed = Math.max(0, Date.now() - new Date(date).getTime());
    const minutes = Math.floor(elapsed / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function OverviewPage({
    state,
    onNavigate,
    onCreateWorkspace,
    onToggleWorkspace,
    onDeleteWorkspace,
    query,
}: {
    state: PlatformState;
    onNavigate: (page: PageKey) => void;
    onCreateWorkspace: () => void;
    onToggleWorkspace: (workspace: WorkspaceRecord) => void;
    onDeleteWorkspace: (workspace: WorkspaceRecord) => void;
    query: string;
}) {
    const running = state.workspaces.filter((workspace) => workspace.status === "running").length;
    const activeOrganization = state.organizations.find(
        (organization) => organization.id === state.activeOrganizationId,
    );
    const recentWorkspaces = [...state.workspaces]
        .filter((workspace) =>
            `${workspace.name} ${workspace.repository} ${workspace.branch}`.toLowerCase().includes(query.toLowerCase()),
        )
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

    return (
        <>
            <section className="welcome-row">
                <div>
                    <div className="page-eyebrow">{pageDetails.overview.eyebrow}</div>
                    <h1>
                        Good to have you back, <span>Spacze.</span>
                    </h1>
                    <p className="page-subtitle">Pick up where you left off, or create a workspace record.</p>
                </div>
                <button className="button button-primary" onClick={onCreateWorkspace}>
                    <Plus size={17} strokeWidth={2.3} /> New workspace
                </button>
            </section>

            <section className="sai-hero">
                <div className="hero-copy">
                    <div className="hero-kicker">
                        <span>
                            <Sparkles size={13} />
                        </span>{" "}
                        YOUR BUILD WORKSPACE
                    </div>
                    <h2>
                        Good ideas need
                        <br />
                        room to <em>build.</em>
                    </h2>
                    <p>
                        Keep project details, workspace records, and AI setup in one place. Cloud machines and agent
                        execution are the next layer to connect.
                    </p>
                    <button className="button button-hero" onClick={onCreateWorkspace}>
                        Create a workspace <ArrowRight size={16} />
                    </button>
                </div>
                <div className="hero-visual" aria-hidden="true">
                    <div className="hero-orbit orbit-one" />
                    <div className="hero-orbit orbit-two" />
                    <div className="hero-orbit orbit-three" />
                    <div className="hero-core">
                        <div className="hero-mark">S</div>
                        <span>SAI WORKSPACE</span>
                    </div>
                    <div className="hero-float float-code">
                        <Code2 size={17} />
                        <span>Project linked</span>
                        <i />
                    </div>
                    <div className="hero-float float-secure">
                        <ShieldCheck size={17} />
                        <span>Your setup</span>
                    </div>
                    <div className="hero-spark spark-a">✦</div>
                    <div className="hero-spark spark-b">✧</div>
                </div>
                <div className="hero-caption">
                    <span className="hero-caption-dot" /> Project records <span className="caption-divider" /> Built for
                    your flow
                </div>
            </section>

            <section className="metric-grid" aria-label="Workspace summary">
                <MetricCard
                    icon={<Activity size={17} />}
                    label="Marked active"
                    value={`${running}`}
                    detail={`of ${state.workspaces.length} saved workspaces`}
                    accent="mint"
                />
                <MetricCard
                    icon={<FolderGit2 size={17} />}
                    label="Repositories"
                    value={`${state.repositories.length}`}
                    detail="Available to select"
                    accent="violet"
                />
                <MetricCard
                    icon={<Users size={17} />}
                    label="Organization"
                    value={activeOrganization?.name ?? "Personal"}
                    detail={`${activeOrganization?.members ?? 1} member${activeOrganization?.members === 1 ? "" : "s"}`}
                    accent="amber"
                />
            </section>

            <div className="overview-columns">
                <section className="panel recent-panel">
                    <div className="section-heading">
                        <div>
                            <h2>Recent workspace records</h2>
                            <p>Saved setup details for your connected projects.</p>
                        </div>
                        <button className="text-button" onClick={() => onNavigate("workspaces")}>
                            View all <ArrowRight size={15} />
                        </button>
                    </div>
                    <div className="workspace-list compact-list">
                        {recentWorkspaces.slice(0, 3).map((workspace) => (
                            <WorkspaceRow
                                key={workspace.id}
                                workspace={workspace}
                                onToggle={onToggleWorkspace}
                                onDelete={onDeleteWorkspace}
                            />
                        ))}
                        {recentWorkspaces.length === 0 && (
                            <EmptyState
                                title={state.workspaces.length === 0 ? "A clean slate." : "No workspaces found."}
                                body={
                                    state.workspaces.length === 0
                                        ? "Create a workspace record to save your project, branch, and machine preference."
                                        : "Try searching for a different project or branch."
                                }
                                action={state.workspaces.length === 0 ? "New workspace" : undefined}
                                onClick={state.workspaces.length === 0 ? onCreateWorkspace : undefined}
                            />
                        )}
                    </div>
                </section>

                <aside className="overview-aside">
                    <section className="panel quickstart-panel">
                        <div className="quickstart-icon">
                            <Zap size={18} fill="currentColor" />
                        </div>
                        <div className="quickstart-label">QUICK START</div>
                        <h2>
                            Bring a project
                            <br />
                            to SAI.
                        </h2>
                        <p>Connect a Git URL to save project details and prepare a workspace record.</p>
                        <button className="text-button" onClick={onCreateWorkspace}>
                            Start with a repository <ArrowRight size={15} />
                        </button>
                        <div className="quickstart-decoration">
                            <div />
                            <div />
                            <div />
                        </div>
                    </section>
                    <section className="tip-card">
                        <div className="tip-icon">
                            <Clock3 size={17} />
                        </div>
                        <div>
                            <strong>Saved by SAI</strong>
                            <p>Platform data uses browser storage or your optional Supabase project.</p>
                        </div>
                    </section>
                </aside>
            </div>
        </>
    );
}

function MetricCard({
    icon,
    label,
    value,
    detail,
    accent,
}: {
    icon: ReactNode;
    label: string;
    value: string;
    detail: string;
    accent: string;
}) {
    return (
        <article className="metric-card">
            <div className={`metric-icon ${accent}`}>{icon}</div>
            <div className="metric-label">{label}</div>
            <div className="metric-value">{value}</div>
            <div className="metric-detail">{detail}</div>
        </article>
    );
}

function WorkspacePage({
    workspaces,
    query,
    onCreate,
    onToggle,
    onDelete,
    onSettings,
}: {
    workspaces: WorkspaceRecord[];
    query: string;
    onCreate: () => void;
    onToggle: (workspace: WorkspaceRecord) => void;
    onDelete: (workspace: WorkspaceRecord) => void;
    onSettings: () => void;
}) {
    const [filter, setFilter] = useState<"All" | "Running" | "Stopped">("All");
    const visible = workspaces.filter((workspace) => {
        const matchesFilter = filter === "All" || workspace.status === filter.toLowerCase();
        const haystack = `${workspace.name} ${workspace.repository} ${workspace.branch}`.toLowerCase();
        return matchesFilter && haystack.includes(query.toLowerCase());
    });
    const filters: ("All" | "Running" | "Stopped")[] = ["All", "Running", "Stopped"];

    return (
        <>
            <PageHeading
                eyebrow={pageDetails.workspaces.eyebrow}
                title="Your workspaces"
                subtitle="Review saved workspace settings. Cloud machines and code execution are not connected yet."
                action={
                    <button className="button button-primary" onClick={onCreate}>
                        <Plus size={17} /> New workspace
                    </button>
                }
            />
            <section className="panel list-panel">
                <div className="list-toolbar">
                    <div className="filter-tabs">
                        {filters.map((item) => (
                            <button
                                key={item}
                                className={filter === item ? "filter-tab selected" : "filter-tab"}
                                onClick={() => setFilter(item)}
                            >
                                {item}
                                <span>
                                    {item === "All"
                                        ? workspaces.length
                                        : workspaces.filter((workspace) => workspace.status === item.toLowerCase())
                                              .length}
                                </span>
                            </button>
                        ))}
                    </div>
                    <div className="list-count">
                        {visible.length} workspace record{visible.length === 1 ? "" : "s"}
                    </div>
                </div>
                <div className="workspace-list">
                    {visible.map((workspace) => (
                        <WorkspaceRow
                            key={workspace.id}
                            workspace={workspace}
                            onToggle={onToggle}
                            onDelete={onDelete}
                        />
                    ))}
                    {visible.length === 0 && (
                        <EmptyState
                            title={query ? "No matches found." : "Nothing here yet."}
                            body={
                                query
                                    ? "Try another search or clear your filters."
                                    : "Save a workspace record from one of your projects to get started."
                            }
                            action={query ? undefined : "Create workspace"}
                            onClick={query ? undefined : onCreate}
                        />
                    )}
                </div>
            </section>
            <div className="notice-strip">
                <Activity size={16} />
                <span>Status changes update saved metadata only; no cloud compute is running yet.</span>
                <button onClick={onSettings}>
                    Manage preferences <ArrowUpRight size={14} />
                </button>
            </div>
        </>
    );
}

function WorkspaceRow({
    workspace,
    onToggle,
    onDelete,
}: {
    workspace: WorkspaceRecord;
    onToggle: (workspace: WorkspaceRecord) => void;
    onDelete: (workspace: WorkspaceRecord) => void;
}) {
    const [menuOpen, setMenuOpen] = useState(false);
    const running = workspace.status === "running";
    return (
        <article className="workspace-row">
            <div className={`workspace-glyph ${running ? "is-running" : "is-stopped"}`}>
                <Terminal size={19} />
            </div>
            <div className="workspace-main">
                <div className="workspace-name-line">
                    <h3>{workspace.name}</h3>
                    <span className={`status-pill ${running ? "running" : "stopped"}`}>
                        <i />
                        {running ? "Marked active" : "Marked stopped"}
                    </span>
                </div>
                <div className="workspace-meta">
                    <span>
                        <FolderGit2 size={13} />
                        {workspace.repository}
                    </span>
                    <span className="meta-separator">·</span>
                    <span>
                        <GitBranch size={13} />
                        {workspace.branch}
                    </span>
                </div>
            </div>
            <div className="workspace-machine">
                <Cpu size={14} />
                {workspace.machine.split(" · ")[0]}
            </div>
            <div className="workspace-updated">
                <Clock3 size={14} />
                {formatRelativeDate(workspace.updatedAt)}
            </div>
            <div className="workspace-actions">
                <button
                    className={`button ${running ? "button-soft" : "button-run"}`}
                    onClick={() => onToggle(workspace)}
                    aria-label={running ? `Mark ${workspace.name} stopped` : `Mark ${workspace.name} active`}
                >
                    {running ? (
                        <>
                            <Square size={13} fill="currentColor" /> Mark stopped
                        </>
                    ) : (
                        <>
                            <Play size={14} fill="currentColor" /> Mark active
                        </>
                    )}
                </button>
                <div className="row-menu-wrap">
                    <button
                        className="icon-button row-menu-button"
                        aria-label={`More actions for ${workspace.name}`}
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        <MoreHorizontal size={18} />
                    </button>
                    {menuOpen && (
                        <div className="row-menu">
                            <button
                                onClick={() => {
                                    setMenuOpen(false);
                                    onDelete(workspace);
                                }}
                            >
                                <Trash2 size={14} /> Delete workspace
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </article>
    );
}

function RepositoryPage({
    repositories,
    workspaces,
    query,
    onAdd,
    onLaunch,
    onDelete,
}: {
    repositories: RepositoryRecord[];
    workspaces: WorkspaceRecord[];
    query: string;
    onAdd: () => void;
    onLaunch: (repository: RepositoryRecord) => void;
    onDelete: (repository: RepositoryRecord) => void;
}) {
    const visible = repositories.filter((repository) =>
        `${repository.name} ${repository.url} ${repository.branch}`.toLowerCase().includes(query.toLowerCase()),
    );
    return (
        <>
            <PageHeading
                eyebrow={pageDetails.repositories.eyebrow}
                title="Your projects"
                subtitle="Save Git repository details as project sources for workspace records and agent-session drafts."
                action={
                    <button className="button button-primary" onClick={onAdd}>
                        <Plus size={17} /> Add repository
                    </button>
                }
            />
            <section className="repository-grid">
                {visible.map((repository, index) => {
                    const linked = workspaces.filter((workspace) => workspace.repositoryId === repository.id).length;
                    return (
                        <article className="repository-card" key={repository.id}>
                            <div className="repo-card-top">
                                <div className={`repo-glyph repo-glyph-${index % 3}`}>
                                    <FolderGit2 size={20} />
                                </div>
                                <span className={`visibility-tag ${repository.visibility.toLowerCase()}`}>
                                    {repository.visibility}
                                </span>
                                <button
                                    className="icon-button repo-delete"
                                    aria-label={`Remove ${repository.name}`}
                                    onClick={() => onDelete(repository)}
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                            <h2>{repository.name}</h2>
                            <a className="repo-url" href={repository.url} target="_blank" rel="noreferrer">
                                {repository.url.replace(/^https:\/\//, "")} <ExternalLink size={12} />
                            </a>
                            <div className="repo-card-meta">
                                <span>
                                    <GitBranch size={13} />
                                    {repository.branch}
                                </span>
                                <span>
                                    <Terminal size={13} />
                                    {linked} workspace{linked === 1 ? "" : "s"}
                                </span>
                            </div>
                            <div className="repo-card-footer">
                                <span>Updated {formatRelativeDate(repository.updatedAt)}</span>
                                <button className="button button-soft" onClick={() => onLaunch(repository)}>
                                    <Plus size={14} /> New workspace
                                </button>
                            </div>
                        </article>
                    );
                })}
                {visible.length === 0 && (
                    <div className="panel empty-repos">
                        <EmptyState
                            title={query ? "No repositories found." : "Connect your first repository."}
                            body="Connect a Git URL and keep project details available for a new session."
                            action={query ? undefined : "Add repository"}
                            onClick={query ? undefined : onAdd}
                        />
                    </div>
                )}
            </section>
            <div className="notice-strip">
                <ShieldCheck size={16} />
                <span>
                    Repository URLs are stored with your SAI platform data. No Git credentials are requested or stored.
                </span>
            </div>
        </>
    );
}

function OrganizationPage({
    organizations,
    activeId,
    onChoose,
    onCreate,
}: {
    organizations: OrganizationRecord[];
    activeId: string;
    onChoose: (organization: OrganizationRecord) => void;
    onCreate: () => void;
}) {
    return (
        <>
            <PageHeading
                eyebrow={pageDetails.organizations.eyebrow}
                title="Your organizations"
                subtitle="Group your project records. Shared team membership is not connected yet."
                action={
                    <button className="button button-primary" onClick={onCreate}>
                        <Plus size={17} /> New organization
                    </button>
                }
            />
            <section className="organization-grid">
                {organizations.map((organization, index) => {
                    const active = organization.id === activeId;
                    return (
                        <article className={`organization-card ${active ? "is-active" : ""}`} key={organization.id}>
                            <div className="org-card-top">
                                <div className={`org-avatar org-avatar-${index % 3}`}>
                                    {organization.name.slice(0, 1).toUpperCase()}
                                </div>
                                {active && (
                                    <span className="active-label">
                                        <Check size={13} /> Current
                                    </span>
                                )}
                            </div>
                            <h2>{organization.name}</h2>
                            <p className="org-slug">slug: {organization.slug}</p>
                            <div className="org-stats">
                                <span>
                                    <Users size={15} />
                                    {organization.members} member{organization.members === 1 ? "" : "s"}
                                </span>
                                <span>
                                    <Sparkles size={14} />
                                    {organization.plan} plan
                                </span>
                            </div>
                            <button
                                className={
                                    active ? "button button-outline org-select" : "button button-soft org-select"
                                }
                                onClick={() => onChoose(organization)}
                            >
                                {active ? "Selected" : "Switch to organization"}
                                {!active && <ArrowRight size={15} />}
                            </button>
                        </article>
                    );
                })}
                <button className="organization-add" onClick={onCreate}>
                    <span className="add-org-icon">
                        <Plus size={20} />
                    </span>
                    <strong>Create an organization</strong>
                    <span>Bring your team and projects together.</span>
                </button>
            </section>
            <div className="notice-strip">
                <Users size={16} />
                <span>Organizations are personal groupings for now; collaborators cannot access these records.</span>
            </div>
        </>
    );
}

function AIStudioPage({
    apiKey,
    connecting,
    apiError,
    messages,
    selectedModelId,
    sending,
    onConnect,
    onDisconnect,
    onClearError,
    onSend,
    onSelectModel,
    onClearConversation,
}: {
    apiKey: string;
    connecting: boolean;
    apiError: string;
    messages: AiMessage[];
    selectedModelId: string;
    sending: boolean;
    onConnect: (apiKey: string) => Promise<boolean>;
    onDisconnect: () => void;
    onClearError: () => void;
    onSend: (message: string) => void;
    onSelectModel: (modelId: string) => void;
    onClearConversation: () => void;
}) {
    const [keyDraft, setKeyDraft] = useState("");
    const [showKeyInput, setShowKeyInput] = useState(!apiKey);
    const [chatDraft, setChatDraft] = useState("");
    const [embeddingInput, setEmbeddingInput] = useState("");
    const [embeddingBusy, setEmbeddingBusy] = useState(false);
    const [embeddingError, setEmbeddingError] = useState("");
    const [embeddingResult, setEmbeddingResult] = useState<{ vector: number[]; tokens?: number }>();
    const model = OPENROUTER_MODELS.find((item) => item.id === selectedModelId) ?? OPENROUTER_MODELS[0];

    useEffect(() => {
        setShowKeyInput(!apiKey);
    }, [apiKey]);

    useEffect(() => {
        setEmbeddingResult(undefined);
        setEmbeddingError("");
    }, [selectedModelId]);

    const handleConnect = async (event: FormEvent) => {
        event.preventDefault();
        onClearError();
        const connected = await onConnect(keyDraft.trim());
        if (connected) {
            setKeyDraft("");
            setShowKeyInput(false);
        }
    };

    const handleChatSubmit = (event: FormEvent) => {
        event.preventDefault();
        const message = chatDraft.trim();
        if (!message || !apiKey || sending) return;
        setChatDraft("");
        onSend(message);
    };

    const handleEmbed = async (event: FormEvent) => {
        event.preventDefault();
        if (!apiKey || !embeddingInput.trim() || embeddingBusy) return;
        setEmbeddingBusy(true);
        setEmbeddingError("");
        setEmbeddingResult(undefined);
        try {
            const result = await requestOpenRouterEmbedding(apiKey, model.id, embeddingInput.trim());
            setEmbeddingResult(result);
        } catch (error) {
            setEmbeddingError(error instanceof Error ? error.message : "The embedding request failed.");
        } finally {
            setEmbeddingBusy(false);
        }
    };

    const sendSuggestion = (suggestion: string) => {
        if (!apiKey || sending) return;
        setChatDraft("");
        onSend(suggestion);
    };

    return (
        <>
            <PageHeading
                eyebrow={pageDetails.ai.eyebrow}
                title="AI Studio"
                subtitle="Bring your OpenRouter models into SAI for coding help and embeddings."
                action={
                    <a
                        className="button button-soft ai-openrouter-link"
                        href="https://openrouter.ai/models"
                        target="_blank"
                        rel="noreferrer"
                    >
                        Explore models <ExternalLink size={14} />
                    </a>
                }
            />
            <div className="ai-layout">
                <section className="panel ai-workbench">
                    <div className="ai-workbench-header">
                        <div className="ai-assistant-avatar">
                            <Sparkles size={17} />
                        </div>
                        <div className="ai-workbench-title">
                            <strong>{model.task === "chat" ? "SAI Assistant" : "Embedding playground"}</strong>
                            <span>
                                {model.provider} <i /> {model.id}
                            </span>
                        </div>
                        {model.task === "chat" && (
                            <button
                                className="ai-new-chat"
                                onClick={onClearConversation}
                                disabled={!messages.length && !apiError}
                            >
                                <Plus size={14} /> New chat
                            </button>
                        )}
                    </div>
                    <div className="ai-selected-model-strip">
                        <span className="ai-model-label">MODEL</span>
                        <strong>{model.name}</strong>
                        <span className="ai-provider-chip">{model.provider}</span>
                        {model.free ? (
                            <span className="ai-free-chip">Free tier</span>
                        ) : (
                            <span className="ai-paid-chip">Usage may be billed</span>
                        )}
                        {apiKey ? (
                            <span className="ai-connected-chip">
                                <i /> Connected
                            </span>
                        ) : (
                            <span className="ai-disconnected-chip">API key needed</span>
                        )}
                    </div>
                    {apiError && (
                        <div className="ai-error-banner" role="alert">
                            <AlertTriangle size={15} />
                            <span>{apiError}</span>
                            <button onClick={onClearError} aria-label="Dismiss API error">
                                <X size={14} />
                            </button>
                        </div>
                    )}
                    {model.task === "chat" ? (
                        <>
                            <div
                                className={`ai-conversation ${messages.length ? "has-messages" : ""}`}
                                aria-live="polite"
                            >
                                {messages.length === 0 ? (
                                    <div className="ai-welcome">
                                        <div className="ai-welcome-icon">
                                            <Sparkles size={21} />
                                        </div>
                                        <h2>What are we building today?</h2>
                                        <p>Ask for help with code, debugging, planning, or your next idea.</p>
                                        <div className="ai-suggestions">
                                            {["Help me plan a feature", "Explain a tricky bug", "Review this code"].map(
                                                (suggestion) => (
                                                    <button
                                                        key={suggestion}
                                                        disabled={!apiKey || sending}
                                                        onClick={() => sendSuggestion(suggestion)}
                                                    >
                                                        {suggestion}
                                                        <ArrowRight size={13} />
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="ai-message-list">
                                        {messages.map((message) => (
                                            <article key={message.id} className={`ai-message ${message.role}`}>
                                                <div className={`ai-message-avatar ${message.role}`}>
                                                    {message.role === "assistant" ? <Sparkles size={14} /> : "ST"}
                                                </div>
                                                <div className="ai-message-body">
                                                    <div className="ai-message-name">
                                                        {message.role === "assistant" ? "SAI Assistant" : "You"}
                                                    </div>
                                                    <div className="ai-message-content">{message.content}</div>
                                                </div>
                                            </article>
                                        ))}
                                        {sending && (
                                            <article className="ai-message assistant">
                                                <div className="ai-message-avatar assistant">
                                                    <Sparkles size={14} />
                                                </div>
                                                <div className="ai-message-body">
                                                    <div className="ai-message-name">SAI Assistant</div>
                                                    <div className="ai-thinking">
                                                        <i />
                                                        <i />
                                                        <i /> Thinking with {model.provider}…
                                                    </div>
                                                </div>
                                            </article>
                                        )}
                                    </div>
                                )}
                            </div>
                            <form className="ai-composer" onSubmit={handleChatSubmit}>
                                <textarea
                                    value={chatDraft}
                                    onChange={(event) => setChatDraft(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === "Enter" && !event.shiftKey) {
                                            event.preventDefault();
                                            handleChatSubmit(event);
                                        }
                                    }}
                                    placeholder={
                                        apiKey
                                            ? "Message SAI Assistant…"
                                            : "Connect your OpenRouter key to start chatting"
                                    }
                                    aria-label="Message SAI Assistant"
                                    disabled={!apiKey || sending}
                                    rows={2}
                                />
                                <div className="ai-composer-footer">
                                    <span>
                                        <ShieldCheck size={13} /> Sent to OpenRouter · chat stays in this tab
                                    </span>
                                    <button
                                        className="button button-primary ai-send-button"
                                        type="submit"
                                        disabled={!apiKey || sending || !chatDraft.trim()}
                                    >
                                        {sending ? <LoaderCircle className="spin" size={15} /> : <Send size={14} />}{" "}
                                        Send
                                    </button>
                                </div>
                            </form>
                        </>
                    ) : (
                        <div className="embedding-playground">
                            <div className="embedding-intro">
                                <div className="embedding-icon">
                                    <Code2 size={18} />
                                </div>
                                <div>
                                    <h2>Turn text into vectors.</h2>
                                    <p>
                                        Embeddings capture the meaning of your text for semantic search,
                                        recommendations, and retrieval.
                                    </p>
                                </div>
                            </div>
                            <form className="embedding-form" onSubmit={handleEmbed}>
                                <label htmlFor="embedding-input">Text to embed</label>
                                <textarea
                                    id="embedding-input"
                                    value={embeddingInput}
                                    onChange={(event) => setEmbeddingInput(event.target.value)}
                                    placeholder="Paste a sentence, document excerpt, or search query…"
                                    rows={5}
                                    disabled={!apiKey || embeddingBusy}
                                />
                                <div className="embedding-form-footer">
                                    <span>{embeddingInput.length} characters</span>
                                    <button
                                        className="button button-primary"
                                        type="submit"
                                        disabled={!apiKey || embeddingBusy || !embeddingInput.trim()}
                                    >
                                        {embeddingBusy ? (
                                            <LoaderCircle className="spin" size={15} />
                                        ) : (
                                            <Zap size={14} />
                                        )}{" "}
                                        Generate embedding
                                    </button>
                                </div>
                            </form>
                            {embeddingError && (
                                <div className="ai-error-banner" role="alert">
                                    <AlertTriangle size={15} />
                                    <span>{embeddingError}</span>
                                </div>
                            )}
                            {embeddingResult && (
                                <div className="embedding-result">
                                    <div className="embedding-result-heading">
                                        <div>
                                            <strong>Vector generated</strong>
                                            <span>
                                                {embeddingResult.vector.length.toLocaleString()} dimensions
                                                {embeddingResult.tokens
                                                    ? ` · ${embeddingResult.tokens} input tokens`
                                                    : ""}
                                            </span>
                                        </div>
                                        <span className="ai-connected-chip">
                                            <Check size={13} /> Ready
                                        </span>
                                    </div>
                                    <code>
                                        [
                                        {embeddingResult.vector
                                            .slice(0, 12)
                                            .map((value) => value.toFixed(5))
                                            .join(", ")}
                                        {embeddingResult.vector.length > 12 ? ", …" : ""}]
                                    </code>
                                    <small>
                                        Showing first {Math.min(12, embeddingResult.vector.length)} values of the
                                        returned vector.
                                    </small>
                                </div>
                            )}
                            {!apiKey && (
                                <div className="ai-inline-hint">
                                    <ShieldCheck size={15} /> Connect your OpenRouter key to generate an embedding.
                                </div>
                            )}
                        </div>
                    )}
                </section>

                <aside className="ai-side-column">
                    <section className="panel ai-models-panel">
                        <div className="ai-side-heading">
                            <div>
                                <h2>Available models</h2>
                                <p>Choose what powers your next request.</p>
                            </div>
                            <span>{OPENROUTER_MODELS.length}</span>
                        </div>
                        <div className="ai-model-list">
                            {OPENROUTER_MODELS.map((item) => (
                                <button
                                    key={item.id}
                                    className={`ai-model-option ${selectedModelId === item.id ? "selected" : ""}`}
                                    aria-label={`${item.provider}: ${item.name} (${item.task})`}
                                    onClick={() => {
                                        onSelectModel(item.id);
                                        onClearError();
                                    }}
                                >
                                    <span className={`ai-model-icon ${item.task}`}>
                                        <Sparkles size={15} />
                                    </span>
                                    <span className="ai-model-option-copy">
                                        <strong>{item.name}</strong>
                                        <small>
                                            {item.provider} · {item.task === "embedding" ? "Embeddings" : "Chat"}
                                        </small>
                                    </span>
                                    <span className="ai-model-tags">
                                        {item.free ? (
                                            <i className="ai-free-chip">Free</i>
                                        ) : (
                                            <i className="ai-paid-chip">Paid</i>
                                        )}
                                        {selectedModelId === item.id && <Check size={14} />}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <div className="ai-model-footnote">
                            <ShieldCheck size={14} />
                            <span>Free models may have provider rate limits. Poolside usage may incur charges.</span>
                        </div>
                    </section>

                    <section className="panel ai-key-panel">
                        <div className="ai-side-heading">
                            <div>
                                <h2>OpenRouter API</h2>
                                <p>Connect your personal API key.</p>
                            </div>
                            <div className={`ai-key-status ${apiKey ? "connected" : ""}`}>
                                <i />
                                {apiKey ? "Ready" : "Not connected"}
                            </div>
                        </div>
                        {apiKey && !showKeyInput ? (
                            <div className="ai-key-connected">
                                <div className="ai-key-success">
                                    <span>
                                        <Check size={15} />
                                    </span>
                                    <div>
                                        <strong>Key verified</strong>
                                        <small>Held in memory for this tab only</small>
                                    </div>
                                </div>
                                <div className="ai-key-actions">
                                    <button className="button button-soft" onClick={() => setShowKeyInput(true)}>
                                        Replace key
                                    </button>
                                    <button className="ai-disconnect-button" onClick={onDisconnect}>
                                        Disconnect
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form className="ai-key-form" onSubmit={handleConnect}>
                                <label htmlFor="openrouter-key">API key</label>
                                <input
                                    id="openrouter-key"
                                    type="password"
                                    value={keyDraft}
                                    onChange={(event) => {
                                        setKeyDraft(event.target.value);
                                        onClearError();
                                    }}
                                    placeholder="sk-or-v1-…"
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                                <button
                                    type="submit"
                                    className="button button-primary"
                                    disabled={connecting || !keyDraft.trim()}
                                >
                                    {connecting ? <LoaderCircle className="spin" size={15} /> : <Check size={14} />}
                                    {connecting ? "Verifying…" : "Verify & connect"}
                                </button>
                                {apiKey && (
                                    <button
                                        type="button"
                                        className="ai-cancel-replace"
                                        onClick={() => {
                                            setKeyDraft("");
                                            setShowKeyInput(false);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </form>
                        )}
                        <div className="ai-key-security">
                            <ShieldCheck size={14} />
                            <p>
                                Your key stays in this tab's memory and is never saved in SAI or browser storage.
                                Requests go directly from your browser to OpenRouter.
                            </p>
                        </div>
                        <a
                            className="ai-create-key-link"
                            href="https://openrouter.ai/settings/keys"
                            target="_blank"
                            rel="noreferrer"
                        >
                            Get an OpenRouter API key <ArrowUpRight size={13} />
                        </a>
                    </section>

                    <section className="ai-privacy-card">
                        <div>
                            <ShieldCheck size={17} />
                        </div>
                        <strong>Your key, your control.</strong>
                        <p>
                            Use a restricted key and set a spend limit in OpenRouter. Avoid sending secrets or private
                            code unless you trust the selected model provider.
                        </p>
                    </section>
                </aside>
            </div>
        </>
    );
}

function SettingsPage({
    settings,
    onUpdate,
    onReset,
    cloudStorageEnabled,
}: {
    settings: PlatformSettings;
    onUpdate: (settings: Partial<PlatformSettings>) => void;
    onReset: () => void;
    cloudStorageEnabled: boolean;
}) {
    const editors: PlatformSettings["editor"][] = ["VS Code", "Cursor", "JetBrains"];
    const machines: PlatformSettings["machine"][] = ["Standard · 4 vCPU", "Performance · 8 vCPU", "GPU · 16 vCPU"];
    return (
        <>
            <PageHeading
                eyebrow={pageDetails.settings.eyebrow}
                title="Make it yours"
                subtitle={
                    cloudStorageEnabled
                        ? "Set up SAI the way you like to work. Changes are saved to your Supabase profile."
                        : "Set up SAI the way you like to work. Changes are saved in this browser."
                }
            />
            <div className="settings-layout">
                <div className="settings-main">
                    <section className="panel settings-card">
                        <div className="settings-section-heading">
                            <div className="settings-section-icon">
                                <Sun size={17} />
                            </div>
                            <div>
                                <h2>Appearance</h2>
                                <p>Choose how SAI looks on this device.</p>
                            </div>
                        </div>
                        <div className="choice-grid two-choices">
                            {(["light", "dark"] as const).map((theme) => (
                                <button
                                    key={theme}
                                    className={`choice-card ${settings.theme === theme ? "selected" : ""}`}
                                    onClick={() => onUpdate({ theme })}
                                >
                                    <span className={`theme-preview ${theme}`}>
                                        <i />
                                        <i />
                                        <i />
                                    </span>
                                    <span>
                                        <strong>{theme === "light" ? "Light" : "Dark"}</strong>
                                        <small>{theme === "light" ? "Bright and clear" : "Easy on the eyes"}</small>
                                    </span>
                                    {settings.theme === theme && <Check size={16} className="choice-check" />}
                                </button>
                            ))}
                        </div>
                    </section>
                    <section className="panel settings-card">
                        <div className="settings-section-heading">
                            <div className="settings-section-icon lilac">
                                <Code2 size={17} />
                            </div>
                            <div>
                                <h2>Default editor</h2>
                                <p>Save your preferred editor for future workspace records.</p>
                            </div>
                        </div>
                        <div className="choice-grid editor-choices">
                            {editors.map((editor) => (
                                <button
                                    key={editor}
                                    className={`editor-choice ${settings.editor === editor ? "selected" : ""}`}
                                    onClick={() => onUpdate({ editor })}
                                >
                                    <span className="editor-icon">
                                        <Code2 size={18} />
                                    </span>
                                    <span>
                                        <strong>{editor}</strong>
                                        <small>
                                            {editor === "VS Code"
                                                ? "The familiar, flexible editor"
                                                : editor === "Cursor"
                                                ? "AI-first code editor"
                                                : "Full-featured IDE"}
                                        </small>
                                    </span>
                                    {settings.editor === editor && <Check size={16} className="choice-check" />}
                                </button>
                            ))}
                        </div>
                    </section>
                    <section className="panel settings-card">
                        <div className="settings-section-heading">
                            <div className="settings-section-icon amber">
                                <Cpu size={17} />
                            </div>
                            <div>
                                <h2>Default machine</h2>
                                <p>Save a machine-size preference for future workspace records.</p>
                            </div>
                        </div>
                        <div className="machine-options">
                            {machines.map((machine) => (
                                <button
                                    key={machine}
                                    className={`machine-option ${settings.machine === machine ? "selected" : ""}`}
                                    onClick={() => onUpdate({ machine })}
                                >
                                    <span className="machine-radio" />{" "}
                                    <span>
                                        <strong>{machine.split(" · ")[0]}</strong>
                                        <small>
                                            {machine.split(" · ")[1]} ·{" "}
                                            {machine.startsWith("GPU")
                                                ? "GPU accelerated"
                                                : machine.startsWith("Performance")
                                                ? "For larger builds"
                                                : "Great for everyday work"}
                                        </small>
                                    </span>
                                    {settings.machine === machine && <Check size={16} className="choice-check" />}
                                </button>
                            ))}
                        </div>
                    </section>
                    <section className="settings-danger-zone">
                        <div>
                            <strong>{cloudStorageEnabled ? "Reset platform data" : "Reset demo data"}</strong>
                            <p>
                                {cloudStorageEnabled
                                    ? "Restore starter workspaces and preferences in your Supabase profile."
                                    : "Restore the sample workspaces and preferences on this device."}
                            </p>
                        </div>
                        <button className="button button-danger" onClick={onReset}>
                            Reset data
                        </button>
                    </section>
                </div>
                <aside className="settings-aside">
                    <div className="settings-aside-icon">
                        <ShieldCheck size={20} />
                    </div>
                    <h3>Your settings stay yours.</h3>
                    <p>
                        {cloudStorageEnabled
                            ? "Your SAI platform state is stored in Supabase and isolated by your Auth user. This anonymous session belongs to this browser profile."
                            : "This standalone SAI demo stores your preferences in this browser only. Nothing is synced to a remote service."}
                    </p>
                    <div className="settings-aside-rule" />
                    <span>
                        <Check size={14} /> Saved automatically
                    </span>
                    <span>
                        <Check size={14} /> {cloudStorageEnabled ? "Stored in Supabase" : "Stored on this device"}
                    </span>
                </aside>
            </div>
        </>
    );
}

function PageHeading({
    eyebrow,
    title,
    subtitle,
    action,
}: {
    eyebrow: string;
    title: string;
    subtitle: string;
    action?: ReactNode;
}) {
    return (
        <section className="page-heading">
            <div>
                <div className="page-eyebrow">{eyebrow}</div>
                <h1>{title}</h1>
                <p className="page-subtitle">{subtitle}</p>
            </div>
            {action && <div className="page-heading-action">{action}</div>}
        </section>
    );
}

function EmptyState({
    title,
    body,
    action,
    onClick,
}: {
    title: string;
    body: string;
    action?: string;
    onClick?: () => void;
}) {
    return (
        <div className="empty-state">
            <div className="empty-state-mark">
                <Terminal size={19} />
            </div>
            <h3>{title}</h3>
            <p>{body}</p>
            {action && onClick && (
                <button className="button button-primary" onClick={onClick}>
                    <Plus size={15} />
                    {action}
                </button>
            )}
        </div>
    );
}

function ModalFrame({
    title,
    description,
    onClose,
    children,
}: {
    title: string;
    description: string;
    onClose: () => void;
    children: ReactNode;
}) {
    return (
        <div
            className="modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                <div className="modal-header">
                    <div>
                            <div className="modal-kicker">SAI WORKSPACE</div>
                        <h2 id="modal-title">{title}</h2>
                        <p>{description}</p>
                    </div>
                    <button className="icon-button" onClick={onClose} aria-label="Close dialog">
                        <X size={18} />
                    </button>
                </div>
                {children}
            </section>
        </div>
    );
}

function CreateWorkspaceModal({
    defaultMachine,
    defaultRepository,
    onClose,
    onCreate,
}: {
    defaultMachine: string;
    defaultRepository?: string;
    onClose: () => void;
    onCreate: (input: { name?: string; repository: string; branch?: string; machine?: string }) => void;
}) {
    const [repository, setRepository] = useState(defaultRepository ?? "https://github.com/Spacze-Tesleem/SAI");
    const [name, setName] = useState("");
    const [branch, setBranch] = useState("main");
    const [machine, setMachine] = useState(defaultMachine);
    const [error, setError] = useState("");
    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!repository.trim() || !repository.trim().includes("/")) {
            setError("Enter a repository URL or owner/repository name.");
            return;
        }
        onCreate({ name, repository, branch, machine });
    };
    return (
        <ModalFrame
            title="Create a workspace"
            description="Save a workspace configuration for this project. Cloud compute is not connected yet."
            onClose={onClose}
        >
            <form className="modal-form" onSubmit={submit}>
                <label>
                    Repository URL
                    <input
                        autoFocus
                        value={repository}
                        onChange={(event) => {
                            setRepository(event.target.value);
                            setError("");
                        }}
                        placeholder="https://github.com/you/project"
                    />{" "}
                    <small>Paste a Git URL or enter owner/repository.</small>
                </label>
                <div className="form-row">
                    <label>
                        Workspace name <span className="optional-label">Optional</span>
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="e.g. feature-branch"
                        />
                    </label>
                    <label>
                        Branch
                        <input value={branch} onChange={(event) => setBranch(event.target.value)} placeholder="main" />
                    </label>
                </div>
                <label>
                    Preferred machine size
                    <select value={machine} onChange={(event) => setMachine(event.target.value)}>
                        <option>Standard · 4 vCPU</option>
                        <option>Performance · 8 vCPU</option>
                        <option>GPU · 16 vCPU</option>
                    </select>
                </label>
                {error && <p className="form-error">{error}</p>}
                <div className="modal-footer">
                    <span>
                        <ShieldCheck size={14} /> Saved as SAI platform metadata
                    </span>
                    <button className="button button-primary" type="submit">
                        <Plus size={14} /> Save workspace record
                    </button>
                </div>
            </form>
        </ModalFrame>
    );
}

function CreateRepositoryModal({
    onClose,
    onCreate,
}: {
    onClose: () => void;
    onCreate: (input: { name: string; url: string; branch: string; visibility: "Private" | "Public" }) => void;
}) {
    const [name, setName] = useState("");
    const [url, setUrl] = useState("");
    const [branch, setBranch] = useState("main");
    const [visibility, setVisibility] = useState<"Private" | "Public">("Private");
    const [error, setError] = useState("");
    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!url.trim() || !url.trim().includes("/")) {
            setError("Enter a repository URL or owner/repository name.");
            return;
        }
        onCreate({ name: name.trim(), url, branch, visibility });
    };
    return (
        <ModalFrame
            title="Add a repository"
            description="Save project metadata for a workspace record or agent-session draft."
            onClose={onClose}
        >
            <form className="modal-form" onSubmit={submit}>
                <label>
                    Git URL
                    <input
                        autoFocus
                        value={url}
                        onChange={(event) => {
                            setUrl(event.target.value);
                            setError("");
                        }}
                        placeholder="https://github.com/you/project"
                    />
                    <small>Only the repository URL and settings are saved; no Git credentials are stored.</small>
                </label>
                <div className="form-row">
                    <label>
                        Display name <span className="optional-label">Optional</span>
                        <input
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Project name"
                        />
                    </label>
                    <label>
                        Default branch
                        <input value={branch} onChange={(event) => setBranch(event.target.value)} />
                    </label>
                </div>
                <label>
                    Visibility
                    <select
                        value={visibility}
                        onChange={(event) => setVisibility(event.target.value as "Private" | "Public")}
                    >
                        <option>Private</option>
                        <option>Public</option>
                    </select>
                </label>
                {error && <p className="form-error">{error}</p>}
                <div className="modal-footer">
                    <span>
                        <FolderGit2 size={14} /> Git URL only · no token required
                    </span>
                    <button className="button button-primary" type="submit">
                        <Plus size={15} /> Add repository
                    </button>
                </div>
            </form>
        </ModalFrame>
    );
}

function CreateOrganizationModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string) => void }) {
    const [name, setName] = useState("");
    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (name.trim()) onCreate(name.trim());
    };
    return (
        <ModalFrame
            title="Create an organization"
            description="Create a personal grouping for related SAI project records."
            onClose={onClose}
        >
            <form className="modal-form" onSubmit={submit}>
                <label>
                    Organization name
                    <input
                        autoFocus
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="e.g. SAI Studio"
                        required
                    />
                </label>
                <div className="org-create-note">
                    <Users size={16} />
                    <span>Shared membership and invitations are not connected yet.</span>
                </div>
                <div className="modal-footer">
                    <span>
                        <ShieldCheck size={14} /> You control who joins
                    </span>
                    <button className="button button-primary" type="submit">
                        <Plus size={15} /> Create organization
                    </button>
                </div>
            </form>
        </ModalFrame>
    );
}

function SaiPlatform() {
    const history = useHistory();
    const location = useLocation();
    const page = pageFromPath(location.pathname);
    const [platform, setPlatform] = useState<PlatformState>();
    const [sessions, setSessions] = useState<AgentSession[]>(() => readAgentSessions());
    const [loadError, setLoadError] = useState("");
    const [loadAttempts, setLoadAttempts] = useState(0);
    const [dialog, setDialog] = useState<DialogKind>(null);
    const [workspaceRepository, setWorkspaceRepository] = useState<string>();
    const [query, setQuery] = useState("");
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [toast, setToast] = useState("");
    const [openRouterApiKey, setOpenRouterApiKey] = useState("");
    const [openRouterConnecting, setOpenRouterConnecting] = useState(false);
    const [openRouterError, setOpenRouterError] = useState("");
    const [selectedAiModelId, setSelectedAiModelId] = useState(DEFAULT_OPENROUTER_MODEL_ID);
    const [aiMessages, setAiMessages] = useState<AiMessage[]>([]);
    const [aiSending, setAiSending] = useState(false);
    const activeOrganization = useMemo(
        () => platform?.organizations.find((organization) => organization.id === platform.activeOrganizationId),
        [platform],
    );
    const currentSessionId = page === "session" ? location.pathname.slice("/sessions/".length) : "";
    const currentSession = sessions.find((session) => session.id === currentSessionId);

    useEffect(() => {
        document.title = "SAI — Cloud Dev Platform";
        let mounted = true;
        getPlatformState()
            .then((result) => {
                if (mounted) {
                    setPlatform(result);
                    setLoadError("");
                }
            })
            .catch((error) => {
                if (mounted) {
                    setLoadError(error instanceof Error ? error.message : "Could not load your SAI platform data.");
                }
            });
        return () => {
            mounted = false;
        };
    }, [loadAttempts]);

    useEffect(() => {
        saveAgentSessions(sessions);
    }, [sessions]);

    useEffect(() => {
        if (!toast) return;
        const timeout = window.setTimeout(() => setToast(""), 2800);
        return () => window.clearTimeout(timeout);
    }, [toast]);

    const mutate = useCallback(async (operation: () => Promise<PlatformState>, message?: string) => {
        try {
            const next = await operation();
            setPlatform(next);
            if (message) setToast(message);
        } catch (error) {
            setToast(error instanceof Error ? error.message : "That didn't work. Please try again.");
        }
    }, []);

    const connectOpenRouter = useCallback(async (key: string): Promise<boolean> => {
        if (!key) {
            setOpenRouterError("Paste an OpenRouter API key first.");
            return false;
        }
        setOpenRouterConnecting(true);
        setOpenRouterError("");
        try {
            await verifyOpenRouterKey(key);
            setOpenRouterApiKey(key);
            setToast("OpenRouter API key verified. It's active for this tab only.");
            return true;
        } catch (error) {
            setOpenRouterError(error instanceof Error ? error.message : "Could not verify this OpenRouter key.");
            return false;
        } finally {
            setOpenRouterConnecting(false);
        }
    }, []);

    const sendAiMessage = useCallback(
        async (content: string) => {
            const selectedModel = OPENROUTER_MODELS.find((model) => model.id === selectedAiModelId);
            if (!openRouterApiKey || !selectedModel || selectedModel.task !== "chat" || aiSending) return;
            const userMessage: AiMessage = {
                id: `message-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                role: "user",
                content,
                createdAt: Date.now(),
            };
            const conversation = [...aiMessages, userMessage];
            setAiMessages(conversation);
            setAiSending(true);
            setOpenRouterError("");
            try {
                const answer = await requestOpenRouterCompletion(
                    openRouterApiKey,
                    selectedModel.id,
                    conversation.map(({ role, content: messageContent }) => ({ role, content: messageContent })),
                );
                setAiMessages((current) => [
                    ...current,
                    {
                        id: `message-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        role: "assistant",
                        content: answer,
                        createdAt: Date.now(),
                    },
                ]);
            } catch (error) {
                setOpenRouterError(error instanceof Error ? error.message : "The OpenRouter request failed.");
            } finally {
                setAiSending(false);
            }
        },
        [aiMessages, aiSending, openRouterApiKey, selectedAiModelId],
    );

    const disconnectOpenRouter = () => {
        setOpenRouterApiKey("");
        setOpenRouterError("");
        setToast("OpenRouter key removed from this tab.");
    };

    const navigate = (nextPage: PageKey) => {
        const href = navGroups.flatMap((group) => group.items).find((item) => item.page === nextPage)?.href ?? "/";
        history.push(href);
        setMobileNavOpen(false);
        setQuery("");
    };

    const openSession = (sessionId: string) => {
        history.push(`/sessions/${encodeURIComponent(sessionId)}`);
        setMobileNavOpen(false);
        setQuery("");
    };

    const createSession = (draft: AgentSessionDraft) => {
        const session = createAgentSession(draft);
        setSessions((current) => [session, ...current]);
        history.push(`/sessions/${encodeURIComponent(session.id)}`);
        setMobileNavOpen(false);
        setQuery("");
        setToast("Session draft saved in this browser.");
    };

    const toggleWorkspace = (workspace: WorkspaceRecord) => {
        const status = workspace.status === "running" ? "stopped" : "running";
        void mutate(
            () => setWorkspaceStatus(workspace.id, status),
            status === "running"
                ? `${workspace.name} marked active in SAI; no compute was started.`
                : `${workspace.name} marked stopped in SAI.`,
        );
    };

    const removeWorkspace = (workspace: WorkspaceRecord) => {
        if (window.confirm(`Delete the “${workspace.name}” workspace?`))
            void mutate(() => deleteWorkspace(workspace.id), "Workspace deleted.");
    };

    const removeRepository = (repository: RepositoryRecord) => {
        if (window.confirm(`Remove “${repository.name}” and its linked workspaces?`))
            void mutate(() => deleteRepository(repository.id), "Repository removed.");
    };

    const openWorkspaceDialog = () => {
        setWorkspaceRepository(undefined);
        setDialog("workspace");
    };

    const createWorkspaceFromRepository = (repository: RepositoryRecord) => {
        setWorkspaceRepository(repository.url);
        setDialog("workspace");
    };

    const submitWorkspace = (input: { name?: string; repository: string; branch?: string; machine?: string }) => {
        setDialog(null);
        setWorkspaceRepository(undefined);
        void mutate(() => createWorkspace(input), "Workspace settings saved in SAI.");
        history.push("/workspaces");
    };

    if (!platform && loadError) {
        return (
            <div className="sai-loading sai-load-error">
                <div className="sai-loading-mark">S</div>
                <h1>SAI couldn’t load your platform data</h1>
                <p role="alert">{loadError}</p>
                {isSupabaseConfigured && (
                    <p className="sai-load-help">
                        Check the project URL and public key, apply the SAI database migration, and enable Anonymous
                        Sign-Ins in Supabase Auth.
                    </p>
                )}
                <button
                    className="button button-primary"
                    onClick={() => {
                        setLoadError("");
                        setLoadAttempts((attempts) => attempts + 1);
                    }}
                >
                    Try again
                </button>
            </div>
        );
    }

    if (!platform) {
        return (
            <div className="sai-loading">
                <div className="sai-loading-mark">S</div>
                <span>Preparing your workspace...</span>
            </div>
        );
    }

    const handleReset = () => {
        const prompt = isSupabaseConfigured
            ? "Reset your SAI workspaces, repositories, organizations and preferences to starter data?"
            : "Reset workspaces, repositories, organizations and preferences to the starter demo?";
        if (window.confirm(prompt)) {
            void mutate(resetPlatformState, "Starter data restored.");
        }
    };

    return (
        <div className={`sai-app ${platform.settings.theme === "dark" ? "theme-dark" : ""}`}>
            {mobileNavOpen && (
                <button
                    className="mobile-scrim"
                    aria-label="Close navigation"
                    onClick={() => setMobileNavOpen(false)}
                />
            )}
            <aside className={`sai-sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
                <div className="brand-row">
                    <div className="brand-mark">
                        <span />
                    </div>
                    <div className="brand-type">
                        <strong>SAI</strong>
                        <small>CLOUD PLATFORM</small>
                    </div>
                    <span
                        className="brand-status"
                        title={isSupabaseConfigured ? "Supabase configured" : "Local browser storage"}
                    />
                </div>
                <div className="org-switcher-wrap">
                    <label className="side-label" htmlFor="org-switcher">
                        CURRENT SPACE
                    </label>
                    <div className="org-switcher">
                        <span className="org-switcher-avatar">
                            {activeOrganization?.name.slice(0, 1).toUpperCase() ?? "S"}
                        </span>
                        <select
                            id="org-switcher"
                            value={platform.activeOrganizationId}
                            onChange={(event) => void mutate(() => setActiveOrganization(event.target.value))}
                        >
                            {platform.organizations.map((organization) => (
                                <option key={organization.id} value={organization.id}>
                                    {organization.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown size={14} />
                    </div>
                </div>
                <nav className="side-navigation" aria-label="Main navigation">
                    {navGroups.map((group) => (
                        <div className="nav-group" key={group.label}>
                            <div className="side-label">{group.label}</div>
                            {group.items.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.page}
                                        className={`nav-item ${page === item.page || (item.page === "sessions" && page === "session") ? "active" : ""}`}
                                        onClick={() => navigate(item.page)}
                                    >
                                        <Icon size={17} strokeWidth={1.8} />
                                        <span>{item.title}</span>
                                        {(item.page === "repositories" || item.page === "sessions" || item.page === "workspaces") && (
                                            <span className="nav-count">
                                                {item.page === "repositories"
                                                    ? platform.repositories.length
                                                    : item.page === "sessions"
                                                    ? sessions.length
                                                    : platform.workspaces.length}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    ))}
                </nav>
                <div className="sidebar-bottom">
                    <button
                        className="sidebar-help"
                        onClick={() =>
                            setToast(
                                isSupabaseConfigured
                                    ? "Platform state is stored in your Supabase Auth profile."
                                    : "SAI is using local browser storage. Configure Supabase to enable remote persistence.",
                            )
                        }
                    >
                        <span className="help-icon">?</span>
                        <span>
                            <strong>Need a hand?</strong>
                            <small>
                                {isSupabaseConfigured ? "Supabase storage is configured" : "You're in local demo mode"}
                            </small>
                        </span>
                        <ArrowUpRight size={14} />
                    </button>
                    <div className="sidebar-user">
                        <div className="user-avatar">{isSupabaseConfigured ? "SA" : "ST"}</div>
                        <div className="user-details">
                            <strong>{isSupabaseConfigured ? "SAI profile" : "Spacze Tesleem"}</strong>
                            <small>{isSupabaseConfigured ? "Anonymous session" : "Workspace owner"}</small>
                        </div>
                        <button
                            className="icon-button sidebar-user-menu"
                            aria-label="User menu"
                            onClick={() =>
                                setToast(
                                    isSupabaseConfigured
                                        ? "Using an anonymous Supabase Auth session for this browser profile."
                                        : "Signed in as Spacze Tesleem.",
                                )
                            }
                        >
                            <MoreHorizontal size={18} />
                        </button>
                    </div>
                    <div className="sidebar-local">
                        <span className="local-status-dot" />
                        {isSupabaseConfigured ? "Supabase" : "Local demo"}
                        <span>·</span>
                        {isSupabaseConfigured ? "Remote database" : "Data stays here"}
                    </div>
                </div>
            </aside>

            <main className="sai-main">
                <header className="topbar">
                    <button
                        className="icon-button mobile-menu-button"
                        aria-label="Open navigation"
                        onClick={() => setMobileNavOpen(true)}
                    >
                        <Menu size={20} />
                    </button>
                    <div className="breadcrumbs">
                        <span>Workspace</span>
                        <span className="breadcrumb-slash">/</span>
                        <strong>{pageDetails[page].title}</strong>
                    </div>
                    <div className="topbar-actions">
                        <label className="global-search">
                            <Search size={16} />
                            <input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search workspaces & repos..."
                                aria-label="Search workspaces and repositories"
                            />
                            <kbd>⌘ K</kbd>
                        </label>
                        <button
                            className="icon-button theme-toggle"
                            aria-label={`Switch to ${platform.settings.theme === "light" ? "dark" : "light"} theme`}
                            onClick={() =>
                                void mutate(() =>
                                    updateSettings({ theme: platform.settings.theme === "light" ? "dark" : "light" }),
                                )
                            }
                        >
                            {platform.settings.theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
                        </button>
                        <button
                            className="icon-button notification-button"
                            aria-label="Notifications"
                            onClick={() => setToast("You're all caught up.")}
                        >
                            <Bell size={17} />
                            <i />
                        </button>
                        <div className="topbar-divider" />
                        <button className="topbar-user" onClick={() => navigate("settings")} aria-label="Open settings">
                            <span>ST</span>
                        </button>
                    </div>
                </header>
                <div className="sai-content" key={page}>
                    {page === "home" && (
                        <AgentHome
                            repositories={platform.repositories}
                            sessions={sessions}
                            defaultMachine={platform.settings.machine}
                            onCreateSession={createSession}
                            onOpenSession={openSession}
                            onOpenProjects={() => navigate("repositories")}
                            onOpenAiStudio={() => navigate("ai")}
                        />
                    )}
                    {page === "sessions" && (
                        <AgentSessionsPage
                            sessions={sessions}
                            onOpenSession={openSession}
                            onNewSession={() => navigate("home")}
                        />
                    )}
                    {page === "session" && (
                        <AgentSessionPage
                            session={currentSession}
                            onNewSession={() => navigate("home")}
                            onOpenAiStudio={() => navigate("ai")}
                            onBackToSessions={() => navigate("sessions")}
                        />
                    )}
                    {page === "automations" && <AgentAutomationsPage onNewSession={() => navigate("home")} />}
                    {page === "insights" && <AgentInsightsPage state={platform} sessions={sessions} />}
                    {page === "overview" && (
                        <OverviewPage
                            state={platform}
                            onNavigate={navigate}
                            onCreateWorkspace={openWorkspaceDialog}
                            onToggleWorkspace={toggleWorkspace}
                            onDeleteWorkspace={removeWorkspace}
                            query={query}
                        />
                    )}
                    {page === "workspaces" && (
                        <WorkspacePage
                            workspaces={platform.workspaces}
                            query={query}
                            onCreate={openWorkspaceDialog}
                            onToggle={toggleWorkspace}
                            onDelete={removeWorkspace}
                            onSettings={() => navigate("settings")}
                        />
                    )}
                    {page === "repositories" && (
                        <RepositoryPage
                            repositories={platform.repositories}
                            workspaces={platform.workspaces}
                            query={query}
                            onAdd={() => setDialog("repository")}
                            onLaunch={createWorkspaceFromRepository}
                            onDelete={removeRepository}
                        />
                    )}
                    {page === "organizations" && (
                        <OrganizationPage
                            organizations={platform.organizations}
                            activeId={platform.activeOrganizationId}
                            onChoose={(organization) =>
                                void mutate(
                                    () => setActiveOrganization(organization.id),
                                    `${organization.name} selected.`,
                                )
                            }
                            onCreate={() => setDialog("organization")}
                        />
                    )}
                    {page === "ai" && (
                        <AIStudioPage
                            apiKey={openRouterApiKey}
                            connecting={openRouterConnecting}
                            apiError={openRouterError}
                            messages={aiMessages}
                            selectedModelId={selectedAiModelId}
                            sending={aiSending}
                            onConnect={connectOpenRouter}
                            onDisconnect={disconnectOpenRouter}
                            onClearError={() => setOpenRouterError("")}
                            onSend={(message) => void sendAiMessage(message)}
                            onSelectModel={setSelectedAiModelId}
                            onClearConversation={() => {
                                setAiMessages([]);
                                setOpenRouterError("");
                            }}
                        />
                    )}
                    {page === "settings" && (
                        <SettingsPage
                            settings={platform.settings}
                            onUpdate={(settings) => void mutate(() => updateSettings(settings))}
                            onReset={handleReset}
                            cloudStorageEnabled={isSupabaseConfigured}
                        />
                    )}
                    <footer className="page-footer">
                        <span>SAI Cloud Dev Platform</span>
                        <span>Projects and session drafts, in one place.</span>
                        <span className="footer-version">
                            {isSupabaseConfigured ? "SUPABASE · REMOTE STORAGE" : "DEMO · LOCAL STORAGE"}
                        </span>
                    </footer>
                </div>
            </main>

            {dialog === "workspace" && (
                <CreateWorkspaceModal
                    defaultMachine={platform.settings.machine}
                    defaultRepository={workspaceRepository}
                    onClose={() => {
                        setDialog(null);
                        setWorkspaceRepository(undefined);
                    }}
                    onCreate={submitWorkspace}
                />
            )}
            {dialog === "repository" && (
                <CreateRepositoryModal
                    onClose={() => setDialog(null)}
                    onCreate={(input) => {
                        setDialog(null);
                        void mutate(() => createRepository(input), "Repository added.");
                    }}
                />
            )}
            {dialog === "organization" && (
                <CreateOrganizationModal
                    onClose={() => setDialog(null)}
                    onCreate={(name) => {
                        setDialog(null);
                        void mutate(() => createOrganization(name), `${name} created.`);
                    }}
                />
            )}
            {toast && (
                <div className="sai-toast">
                    <span>
                        <Check size={15} />
                    </span>
                    {toast}
                    <button onClick={() => setToast("")} aria-label="Dismiss notification">
                        <X size={15} />
                    </button>
                </div>
            )}
        </div>
    );
}

export default function SaiApp() {
    return (
        <BrowserRouter>
            <SaiPlatform />
        </BrowserRouter>
    );
}
