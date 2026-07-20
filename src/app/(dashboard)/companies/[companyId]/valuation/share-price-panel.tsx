"use client";

import { Pencil } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
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
import type { SharePriceResult } from "@/engines/share-price";
import {
  saveShareStructureAction,
  type FinancialsActionState,
} from "./actions";

const initialState: FinancialsActionState = { ok: false };

const eur4 = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const price = (v: number) => eur4.format(v);
const int = (v: number) => v.toLocaleString("fr-FR");
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function EditForm({
  companyId,
  existingShares,
  newShares,
  onSaved,
}: {
  companyId: string;
  existingShares: number | null;
  newShares: number | null;
  onSaved: () => void;
}) {
  const action = saveShareStructureAction.bind(null, companyId);
  const [state, formAction, pending] = useActionState(action, initialState);

  useEffect(() => {
    if (state.ok) onSaved();
    else if (state.error) toast.error(state.error);
  }, [state, onSaved]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="existingShares">Actions existantes (avant IPO)</Label>
        <Input
          id="existingShares"
          name="existingShares"
          type="number"
          min={1}
          step={1}
          defaultValue={existingShares ?? ""}
          placeholder="1 000 000"
          required
        />
        <FieldError errors={state.fieldErrors?.existingShares} />
      </div>
      <div>
        <Label htmlFor="newShares">Nouvelles actions émises à l&apos;IPO</Label>
        <Input
          id="newShares"
          name="newShares"
          type="number"
          min={0}
          step={1}
          defaultValue={newShares ?? 0}
          placeholder="250 000"
        />
        <FieldError errors={state.fieldErrors?.newShares} />
        <p className="mt-1.5 text-xs text-muted-foreground">
          Laisser à 0 s&apos;il n&apos;y a pas d&apos;augmentation de capital.
        </p>
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Enregistrement…" : "Enregistrer"}
      </Button>
    </form>
  );
}

function PriceBlock({
  label,
  sub,
  low,
  mid,
  high,
}: {
  label: string;
  sub: string;
  low: number;
  mid: number;
  high: number;
}) {
  return (
    <div>
      <p className="instrument-label">{label}</p>
      <p className="mt-2 font-heading text-3xl font-extrabold leading-none text-primary">
        <span className="font-utility tabular-nums">{price(mid)}</span>
      </p>
      <p className="mt-2 font-utility text-sm tabular-nums text-muted-foreground">
        {price(low)} – {price(high)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

export function SharePricePanel({
  companyId,
  canWrite,
  result,
  structure,
}: {
  companyId: string;
  canWrite: boolean;
  result: SharePriceResult | null;
  structure: { existingShares: number; newShares: number } | null;
}) {
  const [open, setOpen] = useState(false);

  const editButton = canWrite && (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil data-slot="icon" />
          {structure ? "Modifier" : "Saisir les actions"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Structure du capital</DialogTitle>
          <DialogDescription>
            Le prix par action = valeur des capitaux propres ÷ nombre
            d&apos;actions.
          </DialogDescription>
        </DialogHeader>
        <EditForm
          companyId={companyId}
          existingShares={structure?.existingShares ?? null}
          newShares={structure?.newShares ?? null}
          onSaved={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );

  if (!result || !structure) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">
          Saisissez le nombre d&apos;actions pour obtenir un prix indicatif par
          action, avant et après dilution.
        </p>
        {canWrite ? (
          editButton
        ) : (
          <p className="text-xs text-muted-foreground">
            Un administrateur doit saisir la structure du capital.
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="grid flex-1 gap-6 sm:grid-cols-2">
          <PriceBlock
            label="Prix pré-money"
            sub={`${int(result.preMoney.shareCount)} actions existantes`}
            low={result.preMoney.low}
            mid={result.preMoney.mid}
            high={result.preMoney.high}
          />
          <PriceBlock
            label="Prix post-money (dilué)"
            sub={
              structure.newShares > 0
                ? `${int(result.postMoney.shareCount)} actions · dilution ${pct(result.dilution)}`
                : "Aucune dilution"
            }
            low={result.postMoney.low}
            mid={result.postMoney.mid}
            high={result.postMoney.high}
          />
        </div>
        {editButton}
      </div>

      {structure.newShares > 0 && (
        <div className="mt-6 border-t border-border pt-4">
          <p className="instrument-label">Produit brut indicatif (mid)</p>
          <p className="mt-1 font-utility text-lg font-semibold tabular-nums text-primary">
            {int(result.grossProceedsMid)} €
          </p>
        </div>
      )}

      <ul className="mt-5 space-y-1.5 border-t border-border pt-4 text-xs text-muted-foreground">
        {result.assumptions.map((a) => (
          <li key={a} className="flex gap-1.5">
            <span aria-hidden>·</span>
            {a}
          </li>
        ))}
      </ul>
    </div>
  );
}
