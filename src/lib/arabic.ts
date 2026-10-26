type PluralForms = {
  /** used for exactly one, e.g. "طلب واحد" */
  one: string;
  /** used for exactly two, e.g. "طلبين" */
  two: string;
  /** noun after 3–10, e.g. "طلبات" */
  few: string;
  /** noun after 0 and 11+, e.g. "طلب" */
  many: string;
};

export function countPhrase(n: number, forms: PluralForms): string {
  if (n === 1) return forms.one;
  if (n === 2) return forms.two;
  if (n >= 3 && n <= 10) return `${n} ${forms.few}`;
  return `${n} ${forms.many}`;
}

export const applicationsPhrase = (n: number) =>
  countPhrase(n, { one: "طلب واحد", two: "طلبين", few: "طلبات", many: "طلب" });

/** "يوم واحد" / "يومين متتاليين" / "5 أيام متتالية" / "12 يوم متتالي" */
export function streakPhrase(n: number): string {
  if (n === 1) return "يوم واحد";
  if (n === 2) return "يومين متتاليين";
  if (n >= 3 && n <= 10) return `${n} أيام متتالية`;
  return `${n} يوم متتالي`;
}

export const interviewsPhrase = (n: number) =>
  countPhrase(n, { one: "مقابلة وحدة", two: "مقابلتين", few: "مقابلات", many: "مقابلة" });
