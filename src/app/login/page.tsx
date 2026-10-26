import type { Metadata } from "next";

import { Logo } from "@/components/logo";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-12">
      <div className="relative w-full max-w-md">
        <div
          aria-hidden="true"
          className="sticker animate-float-soft absolute -top-10 -start-6 hidden rotate-[-7deg] px-3.5 py-2 text-sm font-semibold sm:block"
        >
          🔥 <span className="text-coral">7</span> أيام متتالية
        </div>
        <div
          aria-hidden="true"
          className="sticker animate-float-soft absolute -bottom-8 -end-8 hidden rotate-[5deg] px-3.5 py-2 text-sm font-semibold [animation-delay:1.5s] sm:block"
        >
          🎙️ أول مقابلة
        </div>

        <div className="card-surface animate-rise-in relative p-8 sm:p-10">
          <Logo />
          <h1 className="display mt-8 text-4xl sm:text-5xl">
            كل طلب خطوة على <span className="text-teal">مسارك</span>
          </h1>
          <p className="mt-3 text-ink-muted">ادخل كلمة المرور وكمّل من حيث وقفت.</p>
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
