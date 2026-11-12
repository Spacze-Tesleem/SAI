/**
 * Copyright (c) 2026 SAI contributors. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

import { getOnaLoginUrl } from "./minimal-mode";

describe("static Gitpod/Ona handoff", () => {
    it("sends the root page straight to the hosted Ona sign-in", () => {
        expect(getOnaLoginUrl("/", "", "")).toBe("https://app.ona.com/login");
    });

    it("does not add a return target when the requested page is already login", () => {
        expect(getOnaLoginUrl("/login", "", "")).toBe("https://app.ona.com/login");
    });

    it("preserves an app route as a relative return target after sign-in", () => {
        const target = new URL(getOnaLoginUrl("/workspaces", "?filter=active", ""));

        expect(target.origin).toBe("https://app.ona.com");
        expect(target.pathname).toBe("/login");
        expect(target.searchParams.get("returnTo")).toBe("/workspaces?filter=active");
    });

    it("keeps route fragments safely inside the return target", () => {
        const target = new URL(getOnaLoginUrl("/settings", "", "#profile"));

        expect(target.searchParams.get("returnTo")).toBe("/settings#profile");
    });
});
