import "server-only";

import { auth } from "@clerk/nextjs/server";

import { createSupabase } from "./client";

/** For server components and route handlers: a client acting as the user of this request. */
export async function createServerSupabase() {
  const { getToken } = await auth();
  return createSupabase(() => getToken());
}
