"use server";

import { createHash, timingSafeEqual } from "node:crypto";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { countPhrase } from "@/lib/arabic";
import { clearFailures, getLockState, registerFailure } from "@/lib/auth/rate-limit";
import { startSession } from "@/lib/auth/server";

export type LoginState = { error?: string };

const loginSchema = z.object({
  password: z.string().min(1, "اكتب كلمة المرور").max(256),
  next: z.string().optional(),
});

function sameSecret(a: string, b: string): boolean {
  const hash = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(hash(a), hash(b));
}

async function clientKey(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `ip:${forwarded || h.get("x-real-ip") || "unknown"}`;
}

/** Only allow same-site relative paths so `next` can't become an open redirect. */
function safeNextPath(next: string | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });
  if (!parsed.success) return { error: "اكتب كلمة المرور" };

  const appPassword = process.env.APP_PASSWORD;
  if (!appPassword || !process.env.SESSION_SECRET) {
    return { error: "الخادم ما فيه إعدادات الدخول. أضف APP_PASSWORD و SESSION_SECRET." };
  }

  const key = await clientKey();
  const lock = await getLockState(key);
  if (lock.locked) {
    const minutes = Math.max(1, Math.ceil(lock.retryAfterMs / 60_000));
    return { error: `محاولات كثيرة. جرّب بعد ${minutes} دقيقة.` };
  }

  if (!sameSecret(parsed.data.password, appPassword)) {
    const remaining = await registerFailure(key);
    const left = countPhrase(remaining, {
      one: "محاولة وحدة",
      two: "محاولتين",
      few: "محاولات",
      many: "محاولة",
    });
    return {
      error:
        remaining > 0
          ? `كلمة المرور غير صحيحة. باقي لك ${left}.`
          : "كلمة المرور غير صحيحة. انقفل الدخول 15 دقيقة.",
    };
  }

  await clearFailures(key);
  await startSession();
  redirect(safeNextPath(parsed.data.next));
}
