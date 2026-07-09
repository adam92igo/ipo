"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/field-error";
import type { FinancialYear } from "@/engines/valuation/types";
import { formatEur } from "@/lib/format";
import {
  deleteFinancialYearAction,
  saveFinancialYearAction,
  type FinancialsActionState,
} from "./actions";

const initialState: FinancialsActionState = { ok: false };

const METRICS = [
  { name: "revenue", label: "Revenue" },
  { name: "ebitda", label: "EBITDA" },
  { name: "netIncome", label: "Net income" },
  { name: "netDebt", label: "Net debt" },
  { name: "freeCashFlow", label: "Free cash flow" },
] as const;

function YearForm({
  companyId,
  year,
  existingYears,
  onSaved,
}: {
  companyId: string;
  year: FinancialYear | null;
  existingYears: number[];
  onSaved: () => void;
}) {
  const action = saveFinancialYearAction.bind(null, companyId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [fiscalYear, setFiscalYear] = useState<string>(
    year ? String(year.fiscalYear) : "",
  );
  // Guard against silently overwriting an existing year via the Add dialog.
  const duplicate = year === null && existingYears.includes(Number(fiscalYear));

  useEffect(() => {
    if (state.ok) onSaved();
    else if (state.error) toast.error(state.error);
  }, [state, onSaved]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fiscalYear">Fiscal year *</Label>
        <Input
          id="fiscalYear"
          name="fiscalYear"
          type="number"
          min={1990}
          max={2100}
          value={fiscalYear}
          onChange={(e) => setFiscalYear(e.target.value)}
          readOnly={year !== null}
          required
        />
        {duplicate && (
          <FieldError
            errors={[
              `${fiscalYear} already exists — use its edit button to change it.`,
            ]}
          />
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {METRICS.map((metric) => (
          <div key={metric.name} className="space-y-2">
            <Label htmlFor={metric.name}>{metric.label} (EUR)</Label>
            <Input
              id={metric.name}
              name={metric.name}
              type="number"
              step="any"
              defaultValue={year?.[metric.name] ?? ""}
            />
            <FieldError errors={state.fieldErrors?.[metric.name]} />
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Amounts in euros. At least one metric is required; three years of history
        give the most reliable valuation.
      </p>
      <Button
        type="submit"
        disabled={pending || duplicate}
        className="w-full uppercase tracking-[0.15em]"
      >
        {pending ? "Saving…" : "Save year"}
      </Button>
    </form>
  );
}

export function FinancialsManager({
  companyId,
  financials,
  canWrite,
}: {
  companyId: string;
  financials: FinancialYear[];
  canWrite: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialYear | null>(null);
  const [deleting, startDeleting] = useTransition();

  const onSaved = useCallback(() => {
    setOpen(false);
    toast.success("Financial year saved");
  }, []);

  function handleDelete(fiscalYear: number) {
    if (
      !window.confirm(
        `Delete fiscal year ${fiscalYear}? Its figures will be removed permanently.`,
      )
    ) {
      return;
    }
    startDeleting(async () => {
      const result = await deleteFinancialYearAction({ companyId, fiscalYear });
      if (!result.ok) toast.error(result.error ?? "Could not delete the year");
      else toast.success(`Fiscal year ${fiscalYear} removed`);
    });
  }

  return (
    <div className="space-y-4">
      {financials.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No financial history yet. Add the last three fiscal years to unlock the
          valuation.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4">Year</th>
                {METRICS.map((m) => (
                  <th key={m.name} className="py-2 pr-4 text-right">
                    {m.label}
                  </th>
                ))}
                {canWrite && <th className="py-2" />}
              </tr>
            </thead>
            <tbody>
              {financials.map((year) => (
                <tr key={year.fiscalYear} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-semibold text-primary">
                    {year.fiscalYear}
                  </td>
                  {METRICS.map((m) => (
                    <td key={m.name} className="py-2 pr-4 text-right tabular-nums">
                      {year[m.name] === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        formatEur(year[m.name]!)
                      )}
                    </td>
                  ))}
                  {canWrite && (
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Edit ${year.fiscalYear}`}
                          onClick={() => {
                            setEditing(year);
                            setOpen(true);
                          }}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${year.fiscalYear}`}
                          disabled={deleting}
                          onClick={() => handleDelete(year.fiscalYear)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canWrite && (
        <Dialog
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setEditing(null);
          }}
        >
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="uppercase tracking-[0.15em]"
              onClick={() => setEditing(null)}
            >
              <Plus data-slot="icon" /> Add fiscal year
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-primary">
                {editing ? `Edit fiscal year ${editing.fiscalYear}` : "Add a fiscal year"}
              </DialogTitle>
              <DialogDescription>
                Figures from the annual accounts. Net debt = financial debt minus
                cash.
              </DialogDescription>
            </DialogHeader>
            {/* Mounted per open cycle so the action state resets between uses. */}
            {open && (
              <YearForm
                companyId={companyId}
                year={editing}
                existingYears={financials.map((f) => f.fiscalYear)}
                onSaved={onSaved}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
