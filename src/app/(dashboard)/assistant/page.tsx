import { TriangleAlert } from "lucide-react";
import { InstrumentPanel } from "@/components/layout/instrument-panel";
import { PageHeading } from "@/components/layout/page-heading";
import { getAiSetupMessage, isAiConfigured } from "@/lib/ai/config";
import { listCompanies } from "@/lib/data-access/companies";
import { requireOrgPageContext } from "@/lib/data-access/page-context";
import { AssistantChat } from "./assistant-chat";

export const metadata = { title: "AI Assistant" };

export default async function AssistantPage() {
  const ctx = await requireOrgPageContext();
  const companies = await listCompanies(ctx);

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-6">
      <PageHeading
        eyebrow="Guidance channel"
        title="IPO Assistant"
        description="Answers about the IPO process, tailored to your company’s readiness data."
      />

      {!isAiConfigured() ? (
        <InstrumentPanel
          eyebrow="Assistant status"
          title="Offline channel"
          className="border-dashed"
        >
          <div className="flex items-start gap-3 border-t border-border pt-5">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-accent" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-primary">AI is not configured yet</p>
              <p className="text-muted-foreground">
                {getAiSetupMessage()} Optionally add{" "}
                <code className="rounded bg-muted px-1">PAPPERS_API_KEY</code> for
                registry pre-fill, then restart the server.
              </p>
            </div>
          </div>
        </InstrumentPanel>
      ) : (
        <AssistantChat
          companies={companies.map((c) => ({ id: c.id, name: c.name }))}
        />
      )}
      <p className="font-sans text-xs text-muted-foreground">
        Educational guidance only — not investment advice.{" "}
        <span className="font-semibold text-primary">
          Deterministic scores and valuations remain unchanged.
        </span>
      </p>
    </div>
  );
}
