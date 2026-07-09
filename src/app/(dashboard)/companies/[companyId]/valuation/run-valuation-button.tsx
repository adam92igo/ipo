"use client";

import { Calculator } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runValuationAction } from "./actions";

export function RunValuationButton({
  companyId,
  hasFinancials,
  hasExistingRun,
}: {
  companyId: string;
  hasFinancials: boolean;
  hasExistingRun: boolean;
}) {
  const router = useRouter();
  const [running, startRunning] = useTransition();

  function handleRun() {
    startRunning(async () => {
      const result = await runValuationAction({ companyId });
      if (!result.ok) {
        toast.error(result.error ?? "Could not run the valuation");
        return;
      }
      toast.success("Valuation updated");
      router.refresh();
    });
  }

  return (
    <Button
      onClick={handleRun}
      disabled={running || !hasFinancials}
      className="uppercase tracking-[0.15em]"
    >
      <Calculator data-slot="icon" />
      {running
        ? "Computing…"
        : hasExistingRun
          ? "Re-run valuation"
          : "Run valuation"}
    </Button>
  );
}
