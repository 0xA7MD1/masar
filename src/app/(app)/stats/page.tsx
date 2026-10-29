import type { Metadata } from "next";

import { StatsView } from "@/components/stats/stats-view";

export const metadata: Metadata = { title: "الإحصائيات" };

export default function StatsPage() {
  return <StatsView />;
}
