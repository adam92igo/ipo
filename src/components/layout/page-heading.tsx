import { cn } from "@/lib/utils";

export function PageHeading({
  eyebrow,
  title,
  description,
  metadata,
  actions,
  className,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  metadata?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <div className="font-utility text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </div>
        <h1 className="mt-1 font-heading text-4xl font-extrabold uppercase leading-none tracking-tight text-primary md:text-5xl">
          {title}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {(metadata || actions) && (
        <div className="flex flex-wrap items-center gap-3">
          {metadata}
          {actions}
        </div>
      )}
    </header>
  );
}
