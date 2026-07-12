"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { BrandMark } from "@/components/brand/brand-mark";
import { SectionLabel } from "@/components/section-label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = (new FormData(event.currentTarget).get("name") as string).trim();
    const slug = slugify(name);
    if (!slug) {
      toast.error("Please enter a valid organization name");
      return;
    }
    setLoading(true);
    const { data, error } = await authClient.organization.create({
      name,
      slug: `${slug}-${Math.random().toString(36).slice(2, 6)}`,
    });
    if (error || !data) {
      setLoading(false);
      toast.error(error?.message ?? "Could not create the organization");
      return;
    }
    await authClient.organization.setActive({ organizationId: data.id });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="workspace-grid relative flex min-h-svh items-center justify-center overflow-hidden bg-muted p-6">
      <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-accent" />
      <Card className="instrument-panel w-full max-w-md p-0">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3 border-b border-border pb-5">
            <BrandMark priority className="w-12" />
            <div>
              <span className="block font-heading text-xl font-extrabold uppercase leading-none tracking-wide text-primary">
                IPO Compass
              </span>
              <span className="mt-1 block font-utility text-[0.5625rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                IPO readiness command
              </span>
            </div>
          </div>
          <SectionLabel>One last step</SectionLabel>
          <CardTitle className="font-heading text-3xl font-extrabold uppercase tracking-tight text-primary">
            Create your organization
          </CardTitle>
          <CardDescription>
            Your organization is your private workspace. You can add the company
            you manage and invite teammates later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Organization name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g. Northwind Manufacturing"
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating…" : "Create organization"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
