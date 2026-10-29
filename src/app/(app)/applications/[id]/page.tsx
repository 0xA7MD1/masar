import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { ApplicationDetailView } from "@/components/applications/application-detail-view";
import { primaryName, secondaryName } from "@/lib/application-name";
import { getApplicationDetail } from "@/lib/queries";
import { makeQueryClient } from "@/lib/query-client";
import { queryKeys } from "@/lib/query-keys";
import { requireUserId } from "@/lib/user";
import { idSchema } from "@/lib/validation";

type Props = { params: Promise<{ id: string }> };

/** Shared by the metadata and the page, so one request reads the row once. */
const load = cache(async (rawId: string) => {
  const parsed = idSchema.safeParse(rawId);
  if (!parsed.success) notFound();
  const detail = await getApplicationDetail(await requireUserId(), parsed.data);
  // Another user's application is "not found" too.
  if (!detail) notFound();
  return detail;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { app } = await load((await params).id);
  return { title: [primaryName(app), secondaryName(app)].filter(Boolean).join(" — ") };
}

export default async function ApplicationPage({ params }: Props) {
  const detail = await load((await params).id);
  const queryClient = makeQueryClient();
  queryClient.setQueryData(queryKeys.application(detail.app.id), detail);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ApplicationDetailView id={detail.app.id} />
    </HydrationBoundary>
  );
}
