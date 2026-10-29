// Stands in for "@clerk/nextjs/server" during the isolation check: the signed-in user is
// whatever the check sets on globalThis.__isolationUserId (null = signed out).
export async function auth() {
  const userId = globalThis.__isolationUserId ?? null;
  return {
    userId,
    redirectToSignIn() {
      throw new Error("REDIRECT_TO_SIGN_IN");
    },
  };
}
