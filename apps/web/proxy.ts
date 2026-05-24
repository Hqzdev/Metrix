import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const replacedRoutes = new Set([
  "/booking",
  "/contact",
  "/locations",
  "/memberships",
]);

const anchors: Record<string, string> = {
  "/booking": "/#demo",
  "/memberships": "/#b2b",
};

export function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = buildCsp(nonce);
  const { pathname } = request.nextUrl;

  const response = replacedRoutes.has(pathname)
    ? NextResponse.redirect(new URL(anchors[pathname] ?? "/", request.url))
    : NextResponse.next({
        request: {
          headers: new Headers({
            ...Object.fromEntries(request.headers),
            "x-nonce": nonce,
          }),
        },
      });

  response.headers.set("Content-Security-Policy", csp);

  return response;
}

function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function buildCsp(nonce: string): string {
  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}'`,
    "connect-src 'self' https: wss:",
  ];

  return directives.join("; ");
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
