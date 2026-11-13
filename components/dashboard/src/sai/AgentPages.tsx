/**
 * Copyright (c) 2026 SAI contributors. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

import { ArrowRight, Clock3, Code2, GitBranch, Play, Sparkles, Zap } from "lucide-react";
import { AgentSession } from "./agent-sessions";
import { PlatformState } from "./local-api";

function sessionTitle(prompt: string): string {
    const firstLine = prompt.trim().split(/\r?\n/)[0];
    return firstLine.length > 72 ? `${firstLine.slice(0, 69)}…` : firstLine;
}

function formatSessionDate(createdAt: string): string {
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return "Saved session";
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date);
}

export function AgentSessionsPage({
    sessions,
    onOpenSession,
    onNewSession,
}: {
    sessions: AgentSession[];
    onOpenSession: (id: string) => void;
    onNewSession: () => void;
}) {
    return (
        <section className="agent-secondary-page">
            <div className="agent-secondary-heading">
                <div>
                    <span className="agent-section-eyebrow">YOUR WORK, IN ONE PLACE</span>
                    <h1>Sessions</h1>
                    <p>Task drafts created in this browser.</p>
                </div>
                <button className="agent-outline-button" onClick={onNewSession}><Sparkles size={16} /> New session</button>
            </div>
            {sessions.length === 0 ? (
                <div className="agent-empty-state">
                    <span><Clock3 size={22} /></span>
                    <h2>No sessions yet</h2>
                    <p>Start with a task on Home. Your draft will appear here.</p>
                    <button className="agent-primary-button" onClick={onNewSession}>Start a session <ArrowRight size={15} /></button>
                </div>
            ) : (
                <div className="agent-session-list">
                    {sessions.map((session) => (
                        <button key={session.id} className="agent-session-row" onClick={() => onOpenSession(session.id)}>
                            <span className="agent-recent-icon"><Sparkles size={17} /></span>
                            <span className="agent-session-row-copy">
                                <strong>{sessionTitle(session.prompt)}</strong>
                                <small>{session.repositoryName} <i /> {session.branch} <i /> {session.mode} mode</small>
                            </span>
                            <span className="agent-session-date">{formatSessionDate(session.createdAt)}</span>
                            <ArrowRight size={16} />
                        </button>
                    ))}
                </div>
            )}
            <p className="agent-runtime-note">Sessions are saved locally for now. Cloud execution will need an agent runtime connected to SAI.</p>
        </section>
    );
}

export function AgentSessionPage({
    session,
    onNewSession,
    onOpenAiStudio,
    onBackToSessions,
}: {
    session?: AgentSession;
    onNewSession: () => void;
    onOpenAiStudio: () => void;
    onBackToSessions: () => void;
}) {
    if (!session) {
        return (
            <section className="agent-secondary-page">
                <div className="agent-empty-state">
                    <span><Clock3 size={22} /></span>
                    <h2>Session not found</h2>
                    <p>This draft may have been cleared from local browser storage.</p>
                    <button className="agent-primary-button" onClick={onBackToSessions}>View sessions <ArrowRight size={15} /></button>
                </div>
            </section>
        );
    }

    return (
        <section className="agent-secondary-page">
            <div className="agent-secondary-heading session-heading-row">
                <div>
                    <span className="agent-section-eyebrow">SESSION DRAFT · SAVED LOCALLY</span>
                    <h1>{sessionTitle(session.prompt)}</h1>
                    <p>Created {formatSessionDate(session.createdAt)}</p>
                </div>
                <button className="agent-outline-button" onClick={onNewSession}><Sparkles size={16} /> New session</button>
            </div>
            <div className="agent-session-context">
                <span><Code2 size={15} /> {session.repositoryName}</span>
                <span><GitBranch size={15} /> {session.branch}</span>
                <span><Sparkles size={15} /> {session.modelName} · {session.mode}</span>
                <span><Play size={15} /> {session.machine}</span>
            </div>
            <article className="agent-prompt-card">
                <span className="agent-section-eyebrow">TASK</span>
                <p>{session.prompt}</p>
            </article>
            <article className="agent-runner-card">
                <div className="runner-card-icon"><Zap size={19} /></div>
                <div>
                    <span className="agent-section-eyebrow">RUNTIME NOT CONNECTED</span>
                    <h2>This draft is ready for an agent runtime.</h2>
                    <p>SAI currently saves the task and project details in your browser. It does not clone repositories or run code yet.</p>
                    <button className="agent-outline-button" onClick={onOpenAiStudio}>Open AI Studio <ArrowRight size={15} /></button>
                </div>
            </article>
        </section>
    );
}

export function AutomationsPage({ onNewSession }: { onNewSession: () => void }) {
    const automations = [
        { title: "Environment setup", detail: "Prepare a project workspace from a repository and branch.", state: "Not connected" },
        { title: "Test run", detail: "Run your project's checks before an agent session is ready for review.", state: "Not connected" },
        { title: "Pull request review", detail: "Summarize changes and call out risky areas for a human review.", state: "Planned" },
    ];
    return (
        <section className="agent-secondary-page">
            <div className="agent-secondary-heading">
                <div>
                    <span className="agent-section-eyebrow">REPEATABLE PROJECT WORK</span>
                    <h1>Automations</h1>
                    <p>Set up repeatable flows for your own coding workspace.</p>
                </div>
                <button className="agent-outline-button" onClick={onNewSession}><Sparkles size={16} /> Start a task</button>
            </div>
            <div className="agent-automation-grid">
                {automations.map((automation) => (
                    <article key={automation.title} className="agent-automation-card">
                        <span className="agent-recent-icon"><Zap size={17} /></span>
                        <span className="automation-state">{automation.state}</span>
                        <h2>{automation.title}</h2>
                        <p>{automation.detail}</p>
                        <button disabled>Connect a runner <ArrowRight size={14} /></button>
                    </article>
                ))}
            </div>
            <p className="agent-runtime-note">Automations are a UI preview until SAI has a cloud runner and repository permissions configured.</p>
        </section>
    );
}

export function InsightsPage({ state, sessions }: { state: PlatformState; sessions: AgentSession[] }) {
    const running = state.workspaces.filter((workspace) => workspace.status === "running").length;
    return (
        <section className="agent-secondary-page">
            <div className="agent-secondary-heading">
                <div>
                    <span className="agent-section-eyebrow">YOUR WORKSPACE ACTIVITY</span>
                    <h1>Insights</h1>
                    <p>A snapshot of the projects and session drafts saved in this browser.</p>
                </div>
            </div>
            <div className="agent-insight-grid">
                <article><span>Projects</span><strong>{state.repositories.length}</strong><small>Connected repositories</small></article>
                <article><span>Workspaces</span><strong>{running} / {state.workspaces.length}</strong><small>Running environments</small></article>
                <article><span>Sessions</span><strong>{sessions.length}</strong><small>Saved task drafts</small></article>
            </div>
            <p className="agent-runtime-note">Usage, runtime health, and agent metrics will appear when SAI connects to its own execution backend.</p>
        </section>
    );
}
