import { Logo } from "@/components/logo";

/** Clerk's card sits inside ours, so its own frame and header are removed. */
export const embeddedClerkAppearance = {
  elements: {
    rootBox: { width: "100%" },
    cardBox: { width: "100%", maxWidth: "100%", boxShadow: "none", border: "none", borderRadius: 0, background: "transparent" },
    card: { boxShadow: "none", border: "none", background: "transparent", padding: 0 },
    header: { display: "none" },
    footer: { background: "transparent" },
  },
};

export function AuthShell({
  title,
  description,
  children,
}: {
  title: React.ReactNode;
  description: string;
  children: React.ReactNode;
}) {
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
          <h1 className="display mt-8 text-4xl sm:text-5xl">{title}</h1>
          <p className="mt-3 text-ink-muted">{description}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </main>
  );
}
