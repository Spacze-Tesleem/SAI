/**
 * Copyright (c) 2026 SAI contributors. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

const projectUrl = process.env.REACT_APP_SUPABASE_URL?.trim();
const publishableKey = process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY?.trim();
const legacyAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY?.trim();
const publicKey = publishableKey || legacyAnonKey;

let client: SupabaseClient | undefined;
let configurationError: string | undefined;

if ((projectUrl && !publicKey) || (!projectUrl && publicKey)) {
    configurationError =
        "Set REACT_APP_SUPABASE_URL and either REACT_APP_SUPABASE_PUBLISHABLE_KEY or REACT_APP_SUPABASE_ANON_KEY to enable Supabase.";
} else if (projectUrl && publicKey) {
    try {
        const parsedUrl = new URL(projectUrl);
        const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(parsedUrl.hostname);
        if (parsedUrl.protocol !== "https:" && !(parsedUrl.protocol === "http:" && isLocalhost)) {
            throw new Error("The Supabase project URL must use HTTPS (HTTP is allowed for local development only).");
        }
        client = createClient(projectUrl, publicKey, {
            auth: {
                autoRefreshToken: true,
                detectSessionInUrl: false,
                persistSession: true,
            },
        });
    } catch (error) {
        configurationError = error instanceof Error ? error.message : "Invalid Supabase configuration.";
    }
}

export const supabaseClient = client;
export const supabaseConfigurationError = configurationError;
export const isSupabaseConfigured = Boolean(client);

export async function getSupabaseUserId(): Promise<string> {
    if (configurationError) {
        throw new Error(configurationError);
    }
    if (!client) {
        throw new Error("Supabase is not configured.");
    }

    const {
        data: { session },
        error: sessionError,
    } = await client.auth.getSession();
    if (sessionError) {
        throw new Error(`Could not restore the Supabase session: ${sessionError.message}`);
    }
    if (session?.user) {
        return session.user.id;
    }

    const { data, error } = await client.auth.signInAnonymously();
    if (error) {
        throw new Error(
            `Could not start an anonymous Supabase session: ${error.message}. Enable Anonymous Sign-Ins in your Supabase Auth settings.`,
        );
    }
    if (!data.user) {
        throw new Error("Supabase did not return a user for the anonymous session.");
    }
    return data.user.id;
}
