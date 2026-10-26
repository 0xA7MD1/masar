import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  highlight,
  description,
  actions,
  className,
}: {
  title: string;
  /** Word appended to the title in brand. */
  highlight?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="display text-4xl sm:text-5xl">
          {title}
          {highlight ? <span className="text-brand"> {highlight}</span> : null}
        </h1>
        {description ? <p className="mt-3 max-w-2xl text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Card({
  className,
  children,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section className={cn("card-surface p-5 sm:p-6", className)} {...props}>
      {children}
    </section>
  );
}

export function CardTitle({
  children,
  action,
  id,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 id={id} className="text-lg font-bold">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function EmptyState({
  emoji,
  title,
  description,
  action,
  className,
}: {
  emoji: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <span aria-hidden="true" className="sticker mb-5 grid size-16 rotate-[-6deg] place-items-center text-3xl">
        {emoji}
      </span>
      <p className="text-lg font-bold">{title}</p>
      {description ? <p className="mt-1.5 max-w-sm text-sm text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
