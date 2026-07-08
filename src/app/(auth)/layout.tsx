import { Compass } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-[#21324e] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        {/* Signature decorative arc */}
        <div
          aria-hidden
          className="absolute -right-1/3 -top-1/2 size-[900px] rounded-full border-[80px] border-[#c187a1]/30"
        />
        <div className="relative flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary">
            <Compass className="size-5 text-white" />
          </div>
          <span className="text-lg font-bold uppercase tracking-[0.2em]">
            IPO Compass
          </span>
        </div>
        <div className="relative max-w-md space-y-4">
          <p className="text-sm uppercase italic tracking-wider text-[#c187a1]">
            /IPO Readiness/
          </p>
          <h1 className="text-4xl font-extrabold leading-tight">
            Get your company ready for the public markets.
          </h1>
          <p className="leading-relaxed text-[#a7b3c6]">
            Readiness diagnostic, valuation estimate and a personalised roadmap —
            everything an SME needs before talking to banks and advisors.
          </p>
        </div>
        <p className="relative text-xs text-[#a7b3c6]">
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
