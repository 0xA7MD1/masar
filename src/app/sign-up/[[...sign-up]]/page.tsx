import type { Metadata } from "next";
import { SignUp } from "@clerk/nextjs";

import { AuthShell, embeddedClerkAppearance } from "@/components/auth/auth-shell";

export const metadata: Metadata = { title: "حساب جديد" };

export default function SignUpPage() {
  return (
    <AuthShell
      title={
        <>
          ابدأ <span className="text-brand">مسارك</span>
        </>
      }
      description="سوّ حسابك وسجّل أول طلب بأقل من دقيقة."
    >
      <SignUp appearance={embeddedClerkAppearance} />
    </AuthShell>
  );
}
