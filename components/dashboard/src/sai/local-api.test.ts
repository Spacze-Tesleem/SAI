/**
 * Copyright (c) 2026 SAI contributors. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

import {
    createOrganization,
    createRepository,
    createWorkspace,
    deleteWorkspace,
    getPlatformState,
    resetPlatformState,
    setWorkspaceStatus,
    updateSettings,
} from "./local-api";

describe("SAI local demo API", () => {
    beforeEach(() => {
        window.localStorage.clear();
    });

    it("seeds a personal workspace, repositories and organizations", async () => {
        const state = await getPlatformState();

        expect(state.workspaces.length).toBeGreaterThan(0);
        expect(state.repositories.some((repository) => repository.url.endsWith("/SAI"))).toBe(true);
        expect(state.organizations.some((organization) => organization.id === state.activeOrganizationId)).toBe(true);
        expect(window.localStorage.getItem("sai.cloud-platform.v1")).not.toBeNull();
    });

    it("creates a workspace and persists lifecycle changes", async () => {
        const created = await createWorkspace({
            name: "feature-checkout",
            repository: "https://github.com/example/checkout",
            branch: "feature/cart",
        });
        const workspace = created.workspaces.find((item) => item.name === "feature-checkout");

        expect(workspace).toBeDefined();
        expect(workspace?.status).toBe("running");
        expect(workspace?.branch).toBe("feature/cart");
        expect(created.repositories.some((repository) => repository.id === workspace?.repositoryId)).toBe(true);

        const stopped = await setWorkspaceStatus(workspace!.id, "stopped");
        expect(stopped.workspaces.find((item) => item.id === workspace!.id)?.status).toBe("stopped");

        const deleted = await deleteWorkspace(workspace!.id);
        expect(deleted.workspaces.some((item) => item.id === workspace!.id)).toBe(false);
        expect((await getPlatformState()).workspaces.some((item) => item.id === workspace!.id)).toBe(false);
    });

    it("persists organization creation and user preferences", async () => {
        const withOrganization = await createOrganization("SAI Studio");
        const organization = withOrganization.organizations[0];
        expect(withOrganization.activeOrganizationId).toBe(organization.id);
        expect(organization.slug).toBe("sai-studio");

        const customized = await updateSettings({ editor: "Cursor", theme: "dark" });
        expect(customized.settings.editor).toBe("Cursor");
        expect(customized.settings.theme).toBe("dark");

        const reset = await resetPlatformState();
        expect(reset.settings.theme).toBe("light");
        expect(reset.organizations).toHaveLength(2);
    });

    it("reuses a saved repository when given an owner/repository path", async () => {
        const initial = await getPlatformState();
        const repository = initial.repositories.find((item) => item.name === "SAI");
        const state = await createWorkspace({ repository: "Spacze-Tesleem/SAI" });
        const workspace = state.workspaces[0];

        expect(state.repositories).toHaveLength(initial.repositories.length);
        expect(workspace.repositoryId).toBe(repository?.id);
    });

    it("normalizes a short repository path", async () => {
        const state = await createRepository({
            name: "Docs",
            url: "example/docs",
            branch: "trunk",
            visibility: "Public",
        });

        expect(state.repositories[0]).toMatchObject({
            name: "Docs",
            url: "https://github.com/example/docs",
            branch: "trunk",
            visibility: "Public",
        });
    });
});
