/**
 * Copyright (c) 2021 Gitpod GmbH. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

import React from "react";
import ReactDOM from "react-dom";

const STANDALONE_MODE_OVERRIDE_KEY = "sai_standalone_mode";

/**
 * Boot SAI's standalone dashboard. Static deployments use this path and load
 * only SAI's product UI, without requiring Gitpod APIs or WebSocket services.
 */
function bootSaiStandaloneApp(): void {
    const root = document.getElementById("root");
    if (!root) return;

    void import("./sai/SaiApp")
        .then(({ default: SaiApp }) => {
            ReactDOM.render(
                <React.StrictMode>
                    <SaiApp />
                </React.StrictMode>,
                root,
            );
        })
        .catch((error: unknown) => {
            // Make a failed static chunk load actionable rather than presenting a blank page.
            // eslint-disable-next-line no-console
            console.error("Could not load the SAI standalone dashboard.", error);
            root.textContent = "SAI could not load. Refresh the page to try again.";
        });
}

/**
 * Boot the API-dependent legacy application only in builds that need it.
 */
function bootLegacyApp(): void {
    void import("./legacy-entry")
        .then(({ bootLegacyApp: boot }) => boot())
        .catch((error: unknown) => {
            // eslint-disable-next-line no-console
            console.error("Could not load the legacy dashboard.", error);
            const root = document.getElementById("root");
            if (root) root.textContent = "The dashboard could not load. Refresh the page to try again.";
        });
}

/**
 * Static SAI builds don't have the Gitpod API; Gitpod-capable builds retain the
 * existing dashboard. The local override is useful for testing the standalone
 * experience without changing a build.
 */
const bootApp = () => {
    let standaloneMode = process.env.REACT_APP_SAI_STATIC_MODE === "true";

    try {
        if (localStorage.getItem(STANDALONE_MODE_OVERRIDE_KEY) === "true") {
            standaloneMode = true;
        }
    } catch {
        // localStorage might be disabled; the build-time setting still works.
    }

    if (standaloneMode) {
        bootSaiStandaloneApp();
        return;
    }

    bootLegacyApp();
};

bootApp();
