"use client";

import { useEffect } from "react";

import { Card, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card>
      <EmptyState
        emoji="🧩"
        title="صار خطأ غير متوقع"
        description="بياناتك بأمان. جرّب مرة ثانية، ولو تكرر الخطأ تأكد من اتصال قاعدة البيانات."
        action={<Button onClick={reset}>جرّب مرة ثانية</Button>}
      />
    </Card>
  );
}
