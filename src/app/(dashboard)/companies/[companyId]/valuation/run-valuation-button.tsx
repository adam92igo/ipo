"use client";

import { Calculator } from "lucide-react";
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
  const [running, startRunning] = useTransition();

  function handleRun() {
    startRunning(async () => {
      // revalidatePath in the action already streams the re-rendered page.
      const result = await runValuationAction({ companyId });
      if (!result.ok) {
        toast.error(result.error ?? "Could not run the valuation");
        return;
      }
      toast.success("Valuation updated");
    });
  }

  return (
    <Button onClick={handleRun} disabled={running || !hasFinancials}>
      <Calculator data-slot="icon" />
      {running
        ? "Computing…"
        : hasExistingRun
          ? "Re-run valuation"
          : "Run valuation"}
    </Button>
  );
}
