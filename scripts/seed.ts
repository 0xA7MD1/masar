import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

type Status = import("../src/lib/constants").Status;
type NewApplication = import("../src/db/schema").NewApplication;

type SampleApplication = Omit<NewApplication, "appliedDate" | "status" | "nextFollowUp" | "userId"> & {
  /** days before today */
  appliedDaysAgo: number;
  followUpInDays?: number;
  /** status path after creation, each with days before today */
  path: Array<[Status, number]>;
};

const SAMPLES: SampleApplication[] = [
  {
    jobTitle: "Frontend Developer",
    company: "Tamara",
    source: "linkedin",
    jobType: "tech",
    workMode: "hybrid",
    location: "الرياض",
    jobUrl: "https://www.linkedin.com/jobs/",
    expectedSalary: "16,000 ريال",
    cvTailored: true,
    priority: "high",
    notes: "المقابلة الثانية مع فريق الـ Checkout. أراجع React Server Components وأسئلة الأداء.",
    appliedDaysAgo: 34,
    followUpInDays: 0,
    path: [
      ["applied", 34],
      ["contacted", 27],
      ["interview", 20],
    ],
  },
  {
    jobTitle: "Data Analyst",
    company: "علم",
    source: "jadarat",
    jobType: "tech",
    workMode: "onsite",
    location: "الرياض",
    cvTailored: false,
    priority: "medium",
    notes: "قدّمت عن طريق جدارات، ما وصلني أي رد للحين.",
    appliedDaysAgo: 30,
    path: [["applied", 30]],
  },
  {
    jobTitle: "Backend Engineer (Node.js)",
    company: "Foodics",
    source: "company_site",
    jobType: "tech",
    workMode: "remote",
    location: "عن بعد — السعودية",
    jobUrl: "https://www.foodics.com/careers/",
    cvTailored: true,
    priority: "high",
    notes: "سوّيت اختبار تقني (Take-home) وكان جيد، بس اختاروا شخص خبرته أكثر في Go.",
    appliedDaysAgo: 25,
    path: [
      ["applied", 25],
      ["contacted", 18],
      ["rejected", 12],
    ],
  },
  {
    jobTitle: "أخصائي تجربة عملاء",
    company: "stc",
    source: "walk_in",
    jobType: "non_tech",
    workMode: "onsite",
    location: "جدة",
    cvTailored: true,
    priority: "medium",
    notes: "تقابلت معهم في معرض التوظيف وأعطيتهم السيرة مباشرة.",
    appliedDaysAgo: 14,
    followUpInDays: -2,
    path: [
      ["applied", 14],
      ["contacted", 8],
    ],
  },
  {
    jobTitle: "Product Designer",
    company: "Salla",
    source: "referral",
    jobType: "tech",
    workMode: "remote",
    location: "عن بعد",
    expectedSalary: "14,000 ريال",
    cvTailored: true,
    priority: "high",
    notes: "توصية من صديق في الفريق. وصل العرض، أراجع التفاصيل قبل الرد.",
    appliedDaysAgo: 9,
    followUpInDays: 2,
    path: [
      ["applied", 9],
      ["contacted", 6],
      ["interview", 4],
      ["offer", 1],
    ],
  },
  {
    jobTitle: "IT Support Specialist",
    company: "سدايا",
    source: "jadarat",
    jobType: "tech",
    workMode: "onsite",
    location: "الرياض",
    cvTailored: false,
    priority: "low",
    appliedDaysAgo: 40,
    path: [
      ["applied", 40],
      ["ghosted", 5],
    ],
  },
  {
    jobTitle: "منسق مشاريع",
    company: "NEOM",
    source: "indeed",
    jobType: "non_tech",
    workMode: "onsite",
    location: "تبوك",
    cvTailored: false,
    priority: "low",
    appliedDaysAgo: 3,
    path: [["applied", 3]],
  },
  {
    jobTitle: "Business Analyst",
    company: "Mozn",
    source: "linkedin",
    jobType: "tech",
    workMode: "hybrid",
    location: "الرياض",
    cvTailored: true,
    priority: "medium",
    appliedDaysAgo: 2,
    path: [["applied", 2]],
  },
  {
    jobTitle: "Junior React Developer",
    company: "Lean Technologies",
    source: "linkedin",
    jobType: "tech",
    workMode: "hybrid",
    location: "الرياض",
    cvTailored: true,
    priority: "medium",
    notes: "الوصف يطلب TypeScript و Testing، ضفت مشروع مسار للسيرة.",
    appliedDaysAgo: 1,
    followUpInDays: 6,
    path: [["applied", 1]],
  },
  {
    jobTitle: "Full Stack Developer",
    company: "Jahez",
    source: "whatsapp",
    jobType: "tech",
    workMode: "hybrid",
    location: "الرياض",
    cvTailored: false,
    priority: "medium",
    notes: "لقيته في قروب واتساب. أرسل السيرة قبل الخميس.",
    appliedDaysAgo: 0,
    path: [["saved", 0]],
  },
];

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

async function main() {
  const userId = argValue("--user");
  if (!userId) {
    console.error(
      "Usage: pnpm db:seed --user <clerk user id>\nIt replaces that user's data (and only theirs) with sample data.",
    );
    process.exit(1);
  }

  const { eq } = await import("drizzle-orm");
  const { createDb } = await import("../src/db/client");
  const { applications, settings, statusHistory } = await import("../src/db/schema");
  const { addDays, todayISO } = await import("../src/lib/dates");

  const { db, client } = createDb();
  const today = todayISO();
  // 10:00 in Riyadh (UTC+3) on the given day
  const at = (daysAgo: number, hourOffset = 0) =>
    new Date(`${addDays(today, -daysAgo)}T07:00:00.000Z`).getTime() + hourOffset * 3_600_000;

  await db.transaction(async (tx) => {
    // History goes with the applications through ON DELETE CASCADE.
    await tx.delete(applications).where(eq(applications.userId, userId));
    const profile = { goalPeriod: "week" as const, goalTarget: 10, displayName: "أحمد" };
    await tx.insert(settings).values({ userId, ...profile }).onConflictDoUpdate({ target: settings.userId, set: profile });

    for (const sample of SAMPLES) {
      const { appliedDaysAgo, followUpInDays, path, ...fields } = sample;
      const [first] = path;
      const last = path[path.length - 1];
      const [created] = await tx
        .insert(applications)
        .values({
          ...fields,
          userId,
          appliedDate: addDays(today, -appliedDaysAgo),
          status: last[0],
          nextFollowUp: followUpInDays === undefined ? null : addDays(today, followUpInDays),
          createdAt: new Date(at(first[1])),
          updatedAt: new Date(at(last[1], 2)),
        })
        .returning({ id: applications.id });

      await tx.insert(statusHistory).values(
        path.map(([status, daysAgo], i) => ({
          userId,
          applicationId: created.id,
          fromStatus: i === 0 ? null : path[i - 1][0],
          toStatus: status,
          changedAt: new Date(at(daysAgo, i === 0 ? 0 : 2)),
        })),
      );
    }
  });

  await client.end();
  console.log(`Seeded ${SAMPLES.length} applications for ${userId}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
