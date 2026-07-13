import { cn } from "@/lib/utils";

export function InstrumentPanel({
  title,
  eyebrow,
  action,
  children,
  className,
}: {
  title?: React.ReactNode;
  eyebrow?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("instrument-panel", className)}>
      {(title || eyebrow || action) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {eyebrow && <div className="instrument-label">{eyebrow}</div>}
            {title && <h2 className="font-heading text-xl font-extrabold uppercase tracking-wide">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
