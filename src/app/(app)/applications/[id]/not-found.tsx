import Link from "next/link";

import { Card, EmptyState } from "@/components/page-header";
import { Button } from "@/components/ui/button";

export default function ApplicationNotFound() {
  return (
    <Card>
      <EmptyState
        emoji="🧭"
        title="ما لقينا هذا الطلب"
        description="يمكن انحذف، أو الرابط فيه غلط."
        action={
          <Button asChild variant="outline">
            <Link href="/applications">ارجع للطلبات</Link>
          </Button>
        }
      />
    </Card>
  );
}
