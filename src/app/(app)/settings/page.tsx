import type { Metadata } from "next";

import { Card, CardTitle, PageHeader } from "@/components/page-header";
import { ExportButtons, ImportBackup, LogoutButton, ProfileForm } from "@/components/settings/settings-forms";
import { getSettings } from "@/lib/queries";

export const metadata: Metadata = { title: "الإعدادات" };

export default async function SettingsPage() {
  const settings = await getSettings();

  return (
    <>
      <PageHeader title="الإعدادات" description="خصّص هدفك، وخذ نسخة احتياطية من بياناتك متى ما بغيت." />
      <div className="grid max-w-3xl gap-6">
        <Card aria-labelledby="profile-title">
          <CardTitle id="profile-title">ملفك وهدفك</CardTitle>
          <ProfileForm displayName={settings.displayName} weeklyGoal={settings.weeklyGoal} />
        </Card>

        <Card aria-labelledby="backup-title">
          <CardTitle id="backup-title">النسخ الاحتياطي</CardTitle>
          <p className="mb-4 text-sm leading-relaxed text-ink-muted">
            JSON نسخة كاملة تقدر ترجعها هنا. CSV للفتح في Excel أو Google Sheets.
          </p>
          <div className="flex flex-wrap gap-3">
            <ExportButtons />
            <ImportBackup />
          </div>
        </Card>

        <Card aria-labelledby="account-title">
          <CardTitle id="account-title">الحساب</CardTitle>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-ink-muted">الجلسة تبقى 30 يوم على هذا الجهاز.</p>
            <LogoutButton />
          </div>
        </Card>

        <p className="text-center text-xs text-ink-subtle">
          اختصارات: <kbd className="rounded-md border border-line bg-paper px-1.5 py-0.5 font-sans">N</kbd> طلب جديد ·{" "}
          <kbd className="rounded-md border border-line bg-paper px-1.5 py-0.5 font-sans">/</kbd> بحث في الطلبات
        </p>
      </div>
    </>
  );
}
