/**
 * Copyright (c) 2026 SAI contributors. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

describe("SAI Supabase configuration", () => {
    const originalUrl = process.env.REACT_APP_SUPABASE_URL;
    const originalPublishableKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY;
    const originalAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

    beforeEach(() => {
        jest.resetModules();
        delete process.env.REACT_APP_SUPABASE_URL;
        delete process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY;
        delete process.env.REACT_APP_SUPABASE_ANON_KEY;
    });

    afterAll(() => {
        if (originalUrl === undefined) delete process.env.REACT_APP_SUPABASE_URL;
        else process.env.REACT_APP_SUPABASE_URL = originalUrl;
        if (originalPublishableKey === undefined) delete process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY;
        else process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY = originalPublishableKey;
        if (originalAnonKey === undefined) delete process.env.REACT_APP_SUPABASE_ANON_KEY;
        else process.env.REACT_APP_SUPABASE_ANON_KEY = originalAnonKey;
    });

    it("keeps browser-only local storage as the default when no credentials are configured", () => {
        const supabase = require("./supabase") as typeof import("./supabase");

        expect(supabase.isSupabaseConfigured).toBe(false);
        expect(supabase.supabaseClient).toBeUndefined();
        expect(supabase.supabaseConfigurationError).toBeUndefined();
    });

    it("reports partial configuration instead of silently falling back to local storage", () => {
        process.env.REACT_APP_SUPABASE_URL = "https://example.supabase.co";
        const supabase = require("./supabase") as typeof import("./supabase");

        expect(supabase.isSupabaseConfigured).toBe(false);
        expect(supabase.supabaseConfigurationError).toMatch(/Set REACT_APP_SUPABASE_URL/);
    });

    it("accepts a project URL and public browser key", () => {
        process.env.REACT_APP_SUPABASE_URL = "https://example.supabase.co";
        process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test-key";
        const supabase = require("./supabase") as typeof import("./supabase");

        expect(supabase.isSupabaseConfigured).toBe(true);
        expect(supabase.supabaseClient).toBeDefined();
        expect(supabase.supabaseConfigurationError).toBeUndefined();
    });

    it("allows HTTP only for local Supabase development", () => {
        process.env.REACT_APP_SUPABASE_URL = "http://localhost:54321";
        process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test-key";
        const supabase = require("./supabase") as typeof import("./supabase");

        expect(supabase.isSupabaseConfigured).toBe(true);
    });
});
