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
  const { pathname } = request.nextUrl;

  if (!replacedRoutes.has(pathname)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(anchors[pathname] ?? "/", request.url));
}

export const config = {
  matcher: [
    "/booking",
    "/contact",
    "/locations",
    "/memberships",
  ],
};
