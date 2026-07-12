import { BrandMark } from "@/components/brand/brand-mark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden border-b-4 border-accent bg-primary p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-40 top-24 h-20 w-[44rem] -rotate-[18deg] border-y border-white/10" />
          <div className="absolute -right-48 top-48 h-24 w-[48rem] -rotate-[18deg] border-y-2 border-accent/70" />
          <div className="absolute -right-32 top-72 h-20 w-[40rem] -rotate-[18deg] border-y border-white/15" />
          <div className="absolute -bottom-16 -right-10 h-72 w-[34rem] bg-white/[0.035] [clip-path:polygon(20%_0,100%_0,100%_100%,0_100%)]" />
        </div>
        <div className="relative flex items-center gap-4">
          <BrandMark priority className="w-16" />
          <div aria-hidden="true">
            <span className="block font-heading text-2xl font-extrabold uppercase leading-none tracking-wide">
              IPO Compass
            </span>
            <span className="mt-1 block font-utility text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-primary-foreground/60">
              IPO readiness command
            </span>
          </div>
        </div>
        <div className="relative max-w-lg border-l-4 border-accent pl-6">
          <p className="font-utility text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-accent">
            IPO readiness · France
          </p>
          <h1 className="mt-3 font-heading text-6xl font-extrabold uppercase leading-[0.9] tracking-tight">
            Navigate. Prepare. Go public.
          </h1>
          <p className="mt-5 max-w-md leading-relaxed text-primary-foreground/70">
            Readiness diagnostic, valuation estimate and a personalised roadmap —
            everything an SME needs before talking to banks and advisors.
          </p>
        </div>
        <p className="relative font-utility text-[0.625rem] uppercase tracking-[0.12em] text-primary-foreground/50">
          © {new Date().getFullYear()} IPO Compass
        </p>
      </div>
      {/* Form panel */}
      <div className="workspace-grid flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 border-b border-border pb-5 lg:hidden">
            <div className="flex items-center gap-3">
              <BrandMark priority className="w-12" />
              <span
                aria-hidden="true"
                className="font-heading text-xl font-extrabold uppercase tracking-wide text-primary"
              >
                IPO Compass
              </span>
            </div>
            <p className="mt-3 border-l-4 border-accent pl-3 font-heading text-2xl font-extrabold uppercase leading-none text-primary">
              Navigate. Prepare. Go public.
            </p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
