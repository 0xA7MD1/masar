import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// The cron route checks CRON_SECRET itself; everything else needs a signed-in user.
const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/api/cron/(.*)"]);

export default clerkMiddleware(
  async (auth, request) => {
    if (isPublicRoute(request)) return NextResponse.next();

    const { userId, redirectToSignIn } = await auth();
    if (userId) return NextResponse.next();

    // Server actions and API calls get a plain 401 instead of an HTML redirect.
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return redirectToSignIn({ returnBackUrl: request.url });
  },
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
);

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|icons/|manifest.webmanifest|sw.js|offline.html|robots.txt).*)",
  ],
};
