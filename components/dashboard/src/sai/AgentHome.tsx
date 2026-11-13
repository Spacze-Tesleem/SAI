/**
 * Copyright (c) 2026 SAI contributors. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Activity, ArrowRight, ChevronDown, Code2, GitBranch, Plus, Send, Sparkles } from "lucide-react";
import "./AgentHome.css";
import { AgentSession, AgentSessionDraft } from "./agent-sessions";
import { PlatformSettings, RepositoryRecord } from "./local-api";
import { DEFAULT_OPENROUTER_MODEL_ID, OPENROUTER_MODELS } from "./openrouter";

type MachineSize = PlatformSettings["machine"];

const machineSizes: MachineSize[] = ["Standard · 4 vCPU", "Performance · 8 vCPU", "GPU · 16 vCPU"];
const machineDetails: Record<MachineSize, string> = {
    "Standard · 4 vCPU": "4 vCPU · 16 GiB · 80 GiB disk",
    "Performance · 8 vCPU": "8 vCPU · 32 GiB · 160 GiB disk",
    "GPU · 16 vCPU": "16 vCPU · 64 GiB · GPU enabled",
};

const quickPrompts = [
    {
        label: "Automate environment setup",
        icon: Code2,
        prompt: "Inspect this project and suggest a reliable development environment setup.",
    },
    {
        label: "Fix a bug",
        icon: Activity,
        prompt: "Investigate a bug in this project. Explain the cause and propose a focused fix.",
    },
    {
        label: "Boost test coverage",
        icon: Sparkles,
        prompt: "Review the main business logic and add one focused unit test for an untested execution path.",
    },
];

function promptTitle(prompt: string): string {
    const firstLine = prompt.trim().split(/\r?\n/)[0];
    return firstLine.length > 56 ? `${firstLine.slice(0, 53)}…` : firstLine;
}

export function AgentHome({
    repositories,
    sessions,
    defaultMachine,
    onCreateSession,
    onOpenSession,
    onOpenProjects,
    onOpenAiStudio,
}: {
    repositories: RepositoryRecord[];
    sessions: AgentSession[];
    defaultMachine: MachineSize;
    onCreateSession: (draft: AgentSessionDraft) => void;
    onOpenSession: (sessionId: string) => void;
    onOpenProjects: () => void;
    onOpenAiStudio: () => void;
}) {
    const chatModels = useMemo(() => OPENROUTER_MODELS.filter((model) => model.task === "chat"), []);
    const [prompt, setPrompt] = useState("");
    const [repositoryId, setRepositoryId] = useState(repositories[0]?.id ?? "");
    const [branch, setBranch] = useState(repositories[0]?.branch ?? "main");
    const [modelId, setModelId] = useState(DEFAULT_OPENROUTER_MODEL_ID);
    const [mode, setMode] = useState<AgentSessionDraft["mode"]>("Agent");
    const [machine, setMachine] = useState<MachineSize>(defaultMachine);
    const [formError, setFormError] = useState("");
    const repository = repositories.find((item) => item.id === repositoryId);
    const selectedModel = chatModels.find((item) => item.id === modelId) ?? chatModels[0];

    useEffect(() => {
        if (!repositories.some((item) => item.id === repositoryId)) {
            setRepositoryId(repositories[0]?.id ?? "");
            setBranch(repositories[0]?.branch ?? "main");
        }
    }, [repositories, repositoryId]);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const trimmedPrompt = prompt.trim();
        if (!trimmedPrompt) {
            setFormError("Describe a task first, and SAI will save it as a session draft.");
            return;
        }
        if (!repository) {
            setFormError("Add a project before creating a session.");
            return;
        }
        setFormError("");
        onCreateSession({
            prompt: trimmedPrompt,
            repositoryId: repository.id,
            repositoryName: repository.name,
            repositoryUrl: repository.url,
            branch: branch.trim() || repository.branch || "main",
            modelId: selectedModel.id,
            modelName: selectedModel.name,
            mode,
            machine,
        });
    };

    const changeRepository = (nextId: string) => {
        setRepositoryId(nextId);
        const nextRepository = repositories.find((item) => item.id === nextId);
        setBranch(nextRepository?.branch ?? "main");
    };

    return (
        <div className="agent-home-page">
            <div className="agent-preview-banner">
                <span className="agent-preview-dot" />
                <span>
                    <strong>Your workspace, your product.</strong> SAI is independently built; session drafts are saved
                    in this browser.
                </span>
                <button onClick={onOpenAiStudio}>AI setup <ArrowRight size={14} /></button>
            </div>

            <section className="agent-home-welcome">
                <div className="agent-home-mark" aria-hidden="true">S</div>
                <p className="agent-home-eyebrow">SAI CLOUD WORKSPACE</p>
                <h1>What do you want to build today?</h1>
                <p className="agent-home-subtitle">Start with a task. Choose a project. Keep your work moving.</p>
            </section>

            <form className="agent-composer" onSubmit={submit}>
                <label className="agent-prompt-label" htmlFor="agent-prompt">
                    Describe a task for SAI
                </label>
                <textarea
                    id="agent-prompt"
                    value={prompt}
                    onChange={(event) => {
                        setPrompt(event.target.value);
                        if (formError) setFormError("");
                    }}
                    placeholder="Ask SAI to explore your code, fix a bug, write a test, or plan a feature…"
                    rows={4}
                />
                <div className="agent-composer-toolbar">
                    <button
                        className="agent-attach-button"
                        type="button"
                        aria-label="Add a project"
                        onClick={onOpenProjects}
                    >
                        <Plus size={19} />
                    </button>
                    <div className="agent-toolbar-selects">
                        <label className="agent-toolbar-select">
                            <span>Model</span>
                            <select aria-label="Model" value={modelId} onChange={(event) => setModelId(event.target.value)}>
                                {chatModels.map((model) => (
                                    <option key={model.id} value={model.id}>
                                        {model.name}{model.free ? " · Free" : ""}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={13} />
                        </label>
                        <label className="agent-toolbar-select mode-select">
                            <span>Mode</span>
                            <select
                                aria-label="Session mode"
                                value={mode}
                                onChange={(event) => setMode(event.target.value as AgentSessionDraft["mode"])}
                            >
                                <option value="Agent">Agent</option>
                                <option value="Plan">Plan</option>
                            </select>
                            <ChevronDown size={13} />
                        </label>
                        <button
                            className="agent-submit-button"
                            type="submit"
                            aria-label="Start session"
                            disabled={!prompt.trim() || !repository}
                        >
                            <Send size={19} />
                        </button>
                    </div>
                </div>
                <div className="agent-context-row">
                    <label className="agent-context-select project-context">
                        <Code2 size={16} />
                        <span className="sr-only">Project</span>
                        <select
                            aria-label="Project"
                            value={repositoryId}
                            onChange={(event) => changeRepository(event.target.value)}
                        >
                            {repositories.length === 0 && <option value="">No projects connected</option>}
                            {repositories.map((item) => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={13} />
                    </label>
                    <label className="agent-context-select branch-context">
                        <GitBranch size={15} />
                        <span className="sr-only">Branch</span>
                        <input
                            aria-label="Branch"
                            value={branch}
                            onChange={(event) => setBranch(event.target.value)}
                            placeholder="branch"
                        />
                    </label>
                    <label className="agent-context-select machine-context">
                        <span className="agent-machine-glyph">▦</span>
                        <span className="sr-only">Compute size</span>
                        <select
                            aria-label="Compute size"
                            value={machine}
                            onChange={(event) => setMachine(event.target.value as MachineSize)}
                        >
                            {machineSizes.map((size) => (
                                <option key={size} value={size}>{size.split(" · ")[0]} · {machineDetails[size]}</option>
                            ))}
                        </select>
                        <ChevronDown size={13} />
                    </label>
                </div>
                {formError && <p className="agent-form-error" role="alert">{formError}</p>}
                <p className="agent-model-caption">
                    {selectedModel.provider} · {selectedModel.id} · Prompts are stored locally in this prototype.
                </p>
            </form>

            <div className="agent-quick-actions" aria-label="Suggested tasks">
                {quickPrompts.map(({ label, icon: Icon, prompt: suggestedPrompt }) => (
                    <button key={label} type="button" onClick={() => { setPrompt(suggestedPrompt); setFormError(""); }}>
                        <Icon size={17} />
                        <span>{label}</span>
                        <ArrowRight size={14} className="quick-action-arrow" />
                    </button>
                ))}
            </div>

            {sessions.length > 0 && (
                <section className="agent-recent-sessions">
                    <div className="agent-recent-heading">
                        <div>
                            <span className="agent-section-eyebrow">PICK UP WHERE YOU LEFT OFF</span>
                            <h2>Recent sessions</h2>
                        </div>
                        <span>{sessions.length} saved locally</span>
                    </div>
                    <div className="agent-recent-grid">
                        {sessions.slice(0, 3).map((session) => (
                            <button key={session.id} type="button" onClick={() => onOpenSession(session.id)}>
                                <span className="agent-recent-icon"><Sparkles size={16} /></span>
                                <span className="agent-recent-copy">
                                    <strong>{promptTitle(session.prompt)}</strong>
                                    <small>{session.repositoryName} · {session.branch}</small>
                                </span>
                                <ArrowRight size={15} />
                            </button>
                        ))}
                    </div>
                </section>
            )}

            <p className="agent-runtime-note">
                SAI saves session drafts here. A cloud code runner is not connected yet; use AI Studio for model chat.
            </p>
        </div>
    );
}
