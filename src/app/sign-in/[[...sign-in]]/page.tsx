import type { Metadata } from "next";
import { SignIn } from "@clerk/nextjs";

import { AuthShell, embeddedClerkAppearance } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "تسجيل الدخول" };

export default function SignInPage() {
  return (
    <AuthShell
      title={
        <>
          كل طلب خطوة على <span className="text-brand">مسارك</span>
        </>
      }
      description="سجّل دخولك وكمّل من حيث وقفت."
    >
      <SignIn appearance={embeddedClerkAppearance} />
    </AuthShell>
  );
}
