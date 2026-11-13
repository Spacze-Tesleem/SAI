/**
 * Copyright (c) 2026 SAI contributors. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

import { getOnaDashboardUrl } from "./minimal-mode";

describe("static Gitpod/Ona handoff", () => {
    it("opens Ona's AI dashboard from the static site's root", () => {
        expect(getOnaDashboardUrl("/", "", "")).toBe("https://app.gitpod.io/ai");
    });

    it("sends the legacy login route to the AI dashboard", () => {
        expect(getOnaDashboardUrl("/login", "", "")).toBe("https://app.gitpod.io/ai");
    });

    it("preserves supported app routes and query strings", () => {
        expect(getOnaDashboardUrl("/ai", "?tab=sessions", "")).toBe("https://app.gitpod.io/ai?tab=sessions");
    });

    it("keeps route fragments on the Ona origin", () => {
        expect(getOnaDashboardUrl("/ai", "", "#sessions")).toBe("https://app.gitpod.io/ai#sessions");
    });

    it("does not allow protocol-relative paths to change the destination host", () => {
        expect(getOnaDashboardUrl("//attacker.example/path", "", "")).toBe("https://app.gitpod.io/ai");
        const backslashPath = `/${String.fromCharCode(92)}attacker.example/path`;
        expect(getOnaDashboardUrl(backslashPath, "", "")).toBe("https://app.gitpod.io/ai");
    });
});
