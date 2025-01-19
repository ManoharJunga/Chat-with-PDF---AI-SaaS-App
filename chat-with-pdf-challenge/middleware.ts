import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define the protected routes
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Protect the routes that match the protected pattern
  if (isProtectedRoute(req)) {
    // Enforce authentication for matching routes
    await auth();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',

  ],
};
