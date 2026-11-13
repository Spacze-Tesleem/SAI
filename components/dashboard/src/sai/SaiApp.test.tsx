/**
 * Copyright (c) 2026 SAI contributors. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import SaiApp from "./SaiApp";

jest.mock("lucide-react", () => {
    const React = require("react");
    const icon = (name: string) => (props: Record<string, unknown>) =>
        React.createElement("svg", { ...props, "data-icon": name });
    return {
        Activity: icon("Activity"),
        AlertTriangle: icon("AlertTriangle"),
        ArrowRight: icon("ArrowRight"),
        ArrowUpRight: icon("ArrowUpRight"),
        Bell: icon("Bell"),
        Check: icon("Check"),
        ChevronDown: icon("ChevronDown"),
        Clock3: icon("Clock3"),
        Code2: icon("Code2"),
        Cpu: icon("Cpu"),
        ExternalLink: icon("ExternalLink"),
        FolderGit2: icon("FolderGit2"),
        GitBranch: icon("GitBranch"),
        LayoutDashboard: icon("LayoutDashboard"),
        LoaderCircle: icon("LoaderCircle"),
        Menu: icon("Menu"),
        Moon: icon("Moon"),
        MoreHorizontal: icon("MoreHorizontal"),
        Play: icon("Play"),
        Plus: icon("Plus"),
        Search: icon("Search"),
        Send: icon("Send"),
        Settings2: icon("Settings2"),
        ShieldCheck: icon("ShieldCheck"),
        Sparkles: icon("Sparkles"),
        Square: icon("Square"),
        Sun: icon("Sun"),
        Terminal: icon("Terminal"),
        Trash2: icon("Trash2"),
        Users: icon("Users"),
        X: icon("X"),
        Zap: icon("Zap"),
    };
});

const mockFetch = jest.fn();

afterEach(() => cleanup());

beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/");
    mockFetch.mockReset();
    global.fetch = mockFetch as typeof fetch;
    mockFetch.mockImplementation((url: string) => {
        if (url.endsWith("/auth/key")) {
            return Promise.resolve({ ok: true, json: async () => ({ data: { label: "SAI test key" } }) });
        }
        if (url.endsWith("/chat/completions")) {
            return Promise.resolve({
                ok: true,
                json: async () => ({ choices: [{ message: { content: "Mock SAI response." } }] }),
            });
        }
        if (url.endsWith("/embeddings")) {
            return Promise.resolve({
                ok: true,
                json: async () => ({ data: [{ embedding: [0.125, -0.25, 0.5] }], usage: { prompt_tokens: 3 } }),
            });
        }
        return Promise.reject(new Error(`Unexpected API URL: ${url}`));
    });
});

async function connectOpenRouter() {
    const key = screen.getByLabelText("API key");
    fireEvent.change(key, { target: { value: "sk-or-test-key" } });
    fireEvent.click(screen.getByRole("button", { name: "Verify & connect" }));
    await screen.findByText("Key verified");
}

describe("SAI agent workspace", () => {
    it("creates a local session draft and opens it from Sessions", async () => {
        render(<SaiApp />);
        await screen.findByRole("heading", { name: "What do you want to build today?" });
        await screen.findByRole("option", { name: "SAI" });

        const prompt = "Add a focused unit test for the workspace filter.";
        fireEvent.change(screen.getByRole("combobox", { name: "Project" }), {
            target: { value: "repo-portfolio" },
        });
        fireEvent.change(screen.getByRole("textbox", { name: "Branch" }), {
            target: { value: "feature/session-ui" },
        });
        fireEvent.change(screen.getByRole("combobox", { name: "Model" }), {
            target: { value: "perplexity/pplx-decider-flash-v1.3:free" },
        });
        fireEvent.change(screen.getByRole("combobox", { name: "Session mode" }), {
            target: { value: "Plan" },
        });
        fireEvent.change(screen.getByRole("combobox", { name: "Compute size" }), {
            target: { value: "Performance · 8 vCPU" },
        });
        fireEvent.change(screen.getByRole("textbox", { name: "Describe a task for SAI" }), {
            target: { value: prompt },
        });
        fireEvent.click(screen.getByRole("button", { name: "Start session" }));

        await screen.findByText("SESSION DRAFT · SAVED LOCALLY");
        expect(screen.getByRole("heading", { name: prompt })).toBeInTheDocument();
        expect(screen.getByText("This draft is ready for an agent runtime.")).toBeInTheDocument();
        await waitFor(() =>
            expect(JSON.parse(window.localStorage.getItem("sai.agent-sessions.v1") || "[]")).toHaveLength(1),
        );
        const saved = JSON.parse(window.localStorage.getItem("sai.agent-sessions.v1") || "[]");
        expect(saved[0]).toMatchObject({
            prompt,
            repositoryName: "portfolio",
            branch: "feature/session-ui",
            modelId: "perplexity/pplx-decider-flash-v1.3:free",
            mode: "Plan",
            machine: "Performance · 8 vCPU",
        });
        expect(mockFetch).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole("button", { name: /Sessions/ }));
        await screen.findByRole("heading", { name: "Sessions" });
        expect(screen.getByText(prompt)).toBeInTheDocument();
    });
});

describe("SAI AI Studio", () => {
    it("verifies a key, sends chat to OpenRouter, and keeps the key out of local storage", async () => {
        render(<SaiApp />);
        await screen.findByRole("heading", { name: "What do you want to build today?" });
        fireEvent.click(screen.getByRole("button", { name: "AI Studio" }));
        await screen.findByRole("heading", { name: "AI Studio" });
        await connectOpenRouter();

        const composer = screen.getByRole("textbox", { name: "Message SAI Assistant" });
        fireEvent.change(composer, { target: { value: "Help me plan a feature" } });
        fireEvent.click(screen.getByRole("button", { name: "Send" }));

        await screen.findByText("Mock SAI response.");
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockFetch.mock.calls[1][0]).toBe("https://openrouter.ai/api/v1/chat/completions");
        expect(window.localStorage.getItem("sai.cloud-platform.v1")).not.toContain("sk-or-test-key");
    });

    it("runs the selected NVIDIA embeddings model against the embeddings endpoint", async () => {
        render(<SaiApp />);
        await screen.findByRole("heading", { name: "What do you want to build today?" });
        fireEvent.click(screen.getByRole("button", { name: "AI Studio" }));
        await screen.findByRole("heading", { name: "AI Studio" });
        await connectOpenRouter();
        fireEvent.click(screen.getByRole("button", { name: /Llama Nemotron Embed VL 1B V2/ }));

        fireEvent.change(screen.getByRole("textbox", { name: "Text to embed" }), {
            target: { value: "A private cloud workspace for the SAI project." },
        });
        fireEvent.click(screen.getByRole("button", { name: "Generate embedding" }));

        await screen.findByText("Vector generated");
        expect(mockFetch.mock.calls[1][0]).toBe("https://openrouter.ai/api/v1/embeddings");
        expect(window.localStorage.getItem("sai.cloud-platform.v1")).not.toContain("sk-or-test-key");
    });
});
