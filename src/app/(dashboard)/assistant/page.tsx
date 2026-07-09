import { TriangleAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { isAiConfigured } from "@/lib/ai/config";
import { listCompanies } from "@/lib/data-access/companies";
import { requireOrgPageContext } from "@/lib/data-access/page-context";
import { AssistantChat } from "./assistant-chat";

export const metadata = { title: "AI Assistant" };

export default async function AssistantPage() {
  const ctx = await requireOrgPageContext();
  const companies = await listCompanies(ctx);

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-6">
      <div className="space-y-1">
        <p className="text-sm uppercase italic tracking-wider text-secondary">
          /AI assistant/
        </p>
        <h1 className="text-3xl font-extrabold text-primary">IPO Assistant</h1>
        <p className="text-muted-foreground">
          Answers about the IPO process, tailored to your companies&apos; readiness
          data.
        </p>
      </div>

      {!isAiConfigured() ? (
        <Card className="border-dashed">
          <CardContent className="flex items-start gap-3 pt-6">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-primary">AI is not configured yet</p>
              <p className="text-muted-foreground">
                Add <code className="rounded bg-muted px-1">ANTHROPIC_API_KEY</code>{" "}
                (and optionally{" "}
                <code className="rounded bg-muted px-1">PAPPERS_API_KEY</code> for
                registry pre-fill) to <code className="rounded bg-muted px-1">.env</code>,
                then restart the server.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <AssistantChat
          companies={companies.map((c) => ({ id: c.id, name: c.name }))}
        />
      )}
    </div>
  );
}
