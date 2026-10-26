// Job title and company are optional, so every place that shows them goes through here.

type Named = { jobTitle: string; company: string };

/** The bold line: the title, else the company, else a placeholder. */
export function primaryName(app: Named): string {
  return app.jobTitle || app.company || "وظيفة بدون اسم";
}

/** The muted line under it: the company, unless it already took the bold line. */
export function secondaryName(app: Named): string {
  return app.jobTitle ? app.company : "";
}

/** For sentences: "Frontend Developer في Tamara", or whichever part is known. */
export function fullName(app: Named): string {
  return app.jobTitle && app.company ? `${app.jobTitle} في ${app.company}` : primaryName(app);
}
