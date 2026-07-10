"use client";

import { Compass } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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
    <div className="flex min-h-svh items-center justify-center bg-muted p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary">
            <Compass className="size-5 text-white" />
          </div>
          <SectionLabel>One last step</SectionLabel>
          <CardTitle className="text-2xl font-bold text-primary">
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
