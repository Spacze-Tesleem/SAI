/**
 * Copyright (c) 2026 SAI contributors. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

type JsonObject = Record<string, unknown>;
type SupabaseError = { code?: string; message: string };

type QueryBuilder = {
    select: jest.Mock;
    eq: jest.Mock;
    maybeSingle: jest.Mock;
    upsert: jest.Mock;
};

const mockBackend = {
    userId: "anonymous-user-1",
    row: null as { state: unknown } | null,
    readError: null as SupabaseError | null,
    writeError: null as SupabaseError | null,
    upsertPayloads: [] as JsonObject[],
    getUserId: jest.fn().mockResolvedValue("anonymous-user-1"),
};

function createMockClient() {
    return {
        from: jest.fn((table: string) => {
            if (table !== "sai_platform_state") {
                throw new Error(`Unexpected Supabase table: ${table}`);
            }

            let queryUserId = "";
            const query = {} as QueryBuilder;
            query.select = jest.fn(() => query);
            query.eq = jest.fn((_column: string, value: string) => {
                queryUserId = value;
                return query;
            });
            query.maybeSingle = jest.fn(async () => ({
                data: mockBackend.row && queryUserId === mockBackend.userId ? mockBackend.row : null,
                error: mockBackend.readError,
            }));
            query.upsert = jest.fn(async (payload: JsonObject) => {
                mockBackend.upsertPayloads.push(payload);
                if (mockBackend.writeError) {
                    return { error: mockBackend.writeError };
                }
                if (payload.user_id === mockBackend.userId) {
                    mockBackend.row = { state: payload.state };
                }
                return { error: null };
            });
            return query;
        }),
    };
}

describe("SAI Supabase persistence", () => {
    let api: typeof import("./local-api");

    beforeEach(() => {
        jest.resetModules();
        window.localStorage.clear();
        mockBackend.userId = "anonymous-user-1";
        mockBackend.row = null;
        mockBackend.readError = null;
        mockBackend.writeError = null;
        mockBackend.upsertPayloads = [];
        mockBackend.getUserId.mockReset().mockResolvedValue(mockBackend.userId);

        jest.doMock("./supabase", () => ({
            supabaseClient: createMockClient(),
            supabaseConfigurationError: undefined,
            getSupabaseUserId: mockBackend.getUserId,
        }));
        api = require("./local-api") as typeof import("./local-api");
    });

    afterEach(() => {
        jest.dontMock("./supabase");
    });

    it("reads the signed-in user's remote state and removes a stale local snapshot", async () => {
        mockBackend.row = {
            state: {
                workspaces: [],
                repositories: [],
                organizations: [],
                activeOrganizationId: "org-remote",
                settings: { theme: "dark", editor: "Cursor", machine: "GPU · 16 vCPU" },
            },
        };
        window.localStorage.setItem("sai.cloud-platform.v1", JSON.stringify({ settings: { theme: "light" } }));

        const state = await api.getPlatformState();

        expect(state.workspaces).toEqual([]);
        expect(state.settings).toEqual({ theme: "dark", editor: "Cursor", machine: "GPU · 16 vCPU" });
        expect(mockBackend.upsertPayloads).toHaveLength(0);
        expect(window.localStorage.getItem("sai.cloud-platform.v1")).toBeNull();
    });

    it("migrates existing browser data to the anonymous user's row on first access", async () => {
        window.localStorage.setItem(
            "sai.cloud-platform.v1",
            JSON.stringify({ settings: { theme: "dark", editor: "Cursor" }, activeOrganizationId: "org-local" }),
        );

        const state = await api.getPlatformState();

        expect(state.settings).toMatchObject({ theme: "dark", editor: "Cursor" });
        expect(mockBackend.upsertPayloads).toHaveLength(1);
        expect(mockBackend.upsertPayloads[0]).toMatchObject({ user_id: "anonymous-user-1" });
        expect(mockBackend.row?.state).toMatchObject({
            activeOrganizationId: "org-local",
            settings: { theme: "dark", editor: "Cursor" },
        });
        expect(window.localStorage.getItem("sai.cloud-platform.v1")).toBeNull();
    });

    it("persists updates through Supabase after the initial migration", async () => {
        const state = await api.updateSettings({ theme: "dark" });
        const lastWrite = mockBackend.upsertPayloads[mockBackend.upsertPayloads.length - 1];

        expect(state.settings.theme).toBe("dark");
        expect(mockBackend.upsertPayloads).toHaveLength(2);
        expect(lastWrite.user_id).toBe("anonymous-user-1");
        expect(lastWrite.state).toMatchObject({ settings: { theme: "dark" } });
    });

    it("explains when the Supabase migration has not been applied", async () => {
        mockBackend.readError = {
            code: "PGRST205",
            message: "Could not find the table public.sai_platform_state in the schema cache",
        };

        await expect(api.getPlatformState()).rejects.toThrow(/Apply the migration/);
    });

    it("does not discard local data when Supabase rejects the initial row", async () => {
        window.localStorage.setItem("sai.cloud-platform.v1", JSON.stringify({ settings: { theme: "dark" } }));
        mockBackend.writeError = {
            code: "42501",
            message: 'new row violates row-level security policy for table "sai_platform_state"',
        };

        await expect(api.getPlatformState()).rejects.toThrow(/RLS policies/);
        expect(window.localStorage.getItem("sai.cloud-platform.v1")).not.toBeNull();
    });
});
