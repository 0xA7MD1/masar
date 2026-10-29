"use client";

import { Card, CardTitle, PageHeader } from "@/components/page-header";
import { useSettings } from "@/hooks/use-masar-data";

import { AccountEmail, ExportButtons, ImportBackup, LogoutButton, ProfileForm } from "./settings-forms";

export function SettingsView() {
  const settings = useSettings();

  return (
    <>
      <PageHeader title="الإعدادات" description="خصّص هدفك، وخذ نسخة احتياطية من بياناتك متى ما بغيت." />
      <div className="grid max-w-3xl gap-6">
        <Card aria-labelledby="profile-title">
          <CardTitle id="profile-title">ملفك وهدفك</CardTitle>
          <ProfileForm displayName={settings.displayName} goal={settings.goal} />
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
            <AccountEmail />
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
