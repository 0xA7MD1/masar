import "server-only";

import { auth } from "@clerk/nextjs/server";

/** The signed-in Clerk user id, or null. Every data access is scoped by it. */
export async function currentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/** For server components: sends signed-out visitors to the sign-in page. */
export async function requireUserId(): Promise<string> {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();
  return userId;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("UNAUTHORIZED");
  }
}
