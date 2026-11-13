/**
 * Copyright (c) 2026 SAI contributors. All rights reserved.
 * Licensed under the GNU Affero General Public License (AGPL).
 * See License.AGPL.txt in the project root for license information.
 */

const ONA_APP_URL = "https://app.gitpod.io";

/**
 * Resolve a static-site app route to the hosted Ona app.
 * Root and the legacy Gitpod login URL go to Ona's AI dashboard. Ona handles
 * authentication itself and returns signed-out users to the requested route.
 */
export function getOnaDashboardUrl(pathname: string, search: string, hash: string): string {
    const requestedPath = pathname === "/" || pathname === "" || pathname === "/login" ? "/ai" : pathname;
    const hasProtocolRelativePrefix = requestedPath.startsWith("//") || requestedPath.startsWith("/\\");
    const safePath = requestedPath.startsWith("/") && !hasProtocolRelativePrefix ? requestedPath : "/ai";
    const destination = new URL(ONA_APP_URL);
    destination.pathname = safePath;
    destination.search = search;
    destination.hash = hash;
    return destination.toString();
}
