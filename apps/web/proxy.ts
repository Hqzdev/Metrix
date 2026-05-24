import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const replacedRoutes = new Set([
  "/about",
  "/booking",
  "/contact",
  "/faq",
  "/locations",
  "/memberships",
  "/privacy",
  "/terms",
]);

const anchors: Record<string, string> = {
  "/booking": "/#demo",
  "/faq": "/#faq",
  "/memberships": "/#b2b",
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!replacedRoutes.has(pathname)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(anchors[pathname] ?? "/", request.url));
}

export const config = {
  matcher: [
    "/about",
    "/booking",
    "/contact",
    "/faq",
    "/locations",
    "/memberships",
    "/privacy",
    "/terms",
  ],
};
