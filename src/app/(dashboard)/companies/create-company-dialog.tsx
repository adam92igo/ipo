"use client";

import { Plus, Sparkles } from "lucide-react";
import { useActionState, useCallback, useEffect, useState } from "react";
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
import { createCompanyAction, type CreateCompanyState } from "./actions";
import { fillCompanyProfileAction } from "./ai-actions";

const initialState: CreateCompanyState = { ok: false };

interface FormValues {
  name: string;
  sector: string;
  country: string;
  siren: string;
  headcount: string;
  website: string;
}

const emptyValues: FormValues = {
  name: "",
  sector: "",
  country: "FR",
  siren: "",
  headcount: "",
  website: "",
};

export function CreateCompanyDialog({ aiEnabled = false }: { aiEnabled?: boolean }) {
  const [open, setOpen] = useState(false);

  const onSuccess = useCallback(() => {
    setOpen(false);
    toast.success("Company added");
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="uppercase tracking-[0.15em]">
          <Plus data-slot="icon" /> Add company
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-primary">Add a company</DialogTitle>
          <DialogDescription>
            The company you want to prepare for an IPO. Financial history comes later,
            with the valuation module.
          </DialogDescription>
        </DialogHeader>
        {/* Mounted per open cycle so the action state resets between uses. */}
        {open && <CompanyForm aiEnabled={aiEnabled} onSuccess={onSuccess} />}
      </DialogContent>
    </Dialog>
  );
}

function CompanyForm({
  aiEnabled,
  onSuccess,
}: {
  aiEnabled: boolean;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(createCompanyAction, initialState);
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [filling, setFilling] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok) onSuccess();
    else if (state.error) toast.error(state.error);
  }, [state, onSuccess]);

  const set = (field: keyof FormValues) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues((prev) => ({ ...prev, [field]: event.target.value }));

  async function handleFillWithAi() {
    setFilling(true);
    setAiSummary(null);
    try {
      const response = await fillCompanyProfileAction({
        name: values.name,
        website: values.website || undefined,
      });
      if (!response.ok || !response.result) {
        toast.error(response.error ?? "Could not pre-fill the profile");
        return;
      }
      const { suggestion, usedRegistry, usedWebsite } = response.result;
      // Suggestions only — every field stays editable before saving.
      setValues((prev) => ({
        ...prev,
        sector: suggestion.sector || prev.sector,
        siren: suggestion.siren ?? prev.siren,
        headcount:
          suggestion.headcount !== null ? String(suggestion.headcount) : prev.headcount,
        website: suggestion.website ?? prev.website,
      }));
      const sources = [
        usedRegistry && "Pappers registry",
        usedWebsite && "official website",
      ]
        .filter(Boolean)
        .join(" + ");
      setAiSummary(`${suggestion.summary}${sources ? ` (sources: ${sources})` : ""}`);
      toast.success("Profile pre-filled — review before saving");
    } finally {
      setFilling(false);
    }
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Company name *</Label>
        <Input
          id="name"
          name="name"
          placeholder="Acme SAS"
          value={values.name}
          onChange={set("name")}
          required
        />
        <FieldError errors={state.fieldErrors?.name} />
      </div>

      {aiEnabled && (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            disabled={filling || values.name.trim().length < 2}
            onClick={handleFillWithAi}
            className="w-full uppercase tracking-[0.15em]"
          >
            <Sparkles data-slot="icon" />
            {filling ? "Searching registry & website…" : "Fill with AI"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Uses the official website and the Pappers registry only. Suggestions —
            review every field before saving.
          </p>
          {aiSummary && (
            <p className="rounded-sm bg-muted px-3 py-2 text-xs leading-relaxed">
              {aiSummary}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sector">Sector *</Label>
          <Input
            id="sector"
            name="sector"
            placeholder="Software"
            value={values.sector}
            onChange={set("sector")}
            required
          />
          <FieldError errors={state.fieldErrors?.sector} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Country (ISO code)</Label>
          <Input
            id="country"
            name="country"
            maxLength={2}
            value={values.country}
            onChange={set("country")}
          />
          <FieldError errors={state.fieldErrors?.country} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="siren">SIREN</Label>
          <Input
            id="siren"
            name="siren"
            placeholder="123456789"
            value={values.siren}
            onChange={set("siren")}
          />
          <FieldError errors={state.fieldErrors?.siren} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="headcount">Headcount</Label>
          <Input
            id="headcount"
            name="headcount"
            type="number"
            min={1}
            value={values.headcount}
            onChange={set("headcount")}
          />
          <FieldError errors={state.fieldErrors?.headcount} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          name="website"
          placeholder="https://acme.fr"
          value={values.website}
          onChange={set("website")}
        />
        <FieldError errors={state.fieldErrors?.website} />
      </div>
      <Button
        type="submit"
        disabled={pending}
        className="w-full uppercase tracking-[0.15em]"
      >
        {pending ? "Adding…" : "Add company"}
      </Button>
    </form>
  );
}
