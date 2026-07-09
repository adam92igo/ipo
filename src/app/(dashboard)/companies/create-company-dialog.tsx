"use client";

import { Plus } from "lucide-react";
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

const initialState: CreateCompanyState = { ok: false };

export function CreateCompanyDialog() {
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
        {open && <CompanyForm onSuccess={onSuccess} />}
      </DialogContent>
    </Dialog>
  );
}

function CompanyForm({ onSuccess }: { onSuccess: () => void }) {
  const [state, formAction, pending] = useActionState(
    createCompanyAction,
    initialState,
  );

  useEffect(() => {
    if (state.ok) onSuccess();
    else if (state.error) toast.error(state.error);
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Company name *</Label>
        <Input id="name" name="name" placeholder="Acme SAS" required />
        <FieldError errors={state.fieldErrors?.name} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="sector">Sector *</Label>
          <Input id="sector" name="sector" placeholder="Software" required />
          <FieldError errors={state.fieldErrors?.sector} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Country (ISO code)</Label>
          <Input id="country" name="country" defaultValue="FR" maxLength={2} />
          <FieldError errors={state.fieldErrors?.country} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="siren">SIREN</Label>
          <Input id="siren" name="siren" placeholder="123456789" />
          <FieldError errors={state.fieldErrors?.siren} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="headcount">Headcount</Label>
          <Input id="headcount" name="headcount" type="number" min={1} />
          <FieldError errors={state.fieldErrors?.headcount} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <Input id="website" name="website" placeholder="https://acme.fr" />
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
