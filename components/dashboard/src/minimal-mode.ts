/**
 * Copyright (c) 2026 SAI contributors. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

const ONA_LOGIN_URL = "https://app.ona.com/login";

/**
 * Build the hosted Ona sign-in URL for a route coming from the static Vercel site.
 * Keep the requested app route as a relative return target so Ona can send the user
 * back there after authentication without forwarding an external URL.
 */
export function getOnaLoginUrl(pathname: string, search: string, hash: string): string {
    const loginUrl = new URL(ONA_LOGIN_URL);
    const returnTo = `${pathname}${search}${hash}`;

    if (returnTo !== "/" && returnTo !== "" && pathname !== "/login") {
        loginUrl.searchParams.set("returnTo", returnTo);
    }

    return loginUrl.toString();
}
