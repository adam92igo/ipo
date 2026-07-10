import { Compass } from "lucide-react";
import { SectionLabel } from "@/components/section-label";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        {/* Decorative arc */}
        <div
          aria-hidden
          className="absolute -right-1/3 -top-1/2 size-[900px] rounded-full border-[80px] border-primary/20"
        />
        <div className="relative flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary">
            <Compass className="size-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            IPO Compass
          </span>
        </div>
        <div className="relative max-w-md space-y-4">
          <SectionLabel className="text-sidebar-foreground/70">
            IPO Readiness
          </SectionLabel>
          <h1 className="text-4xl font-bold leading-tight text-white">
            Get your company ready for the public markets.
          </h1>
          <p className="leading-relaxed text-sidebar-foreground/80">
            Readiness diagnostic, valuation estimate and a personalised roadmap —
            everything an SME needs before talking to banks and advisors.
          </p>
        </div>
        <p className="relative text-xs text-sidebar-foreground/60">
          © {new Date().getFullYear()} IPO Compass
        </p>
      </div>
      {/* Form panel */}
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
