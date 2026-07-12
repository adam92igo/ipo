"use client";

import { RefreshCcw } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { RoadmapItem, RoadmapItemStatus } from "@/lib/data-access/roadmap";
import { generateRoadmapAction, updateRoadmapItemStatusAction } from "./actions";

const PRIORITY_STYLES: Record<string, string> = {
  critical: "border-destructive bg-destructive/5 text-primary",
  high: "border-accent bg-accent/10 text-primary",
  medium: "border-muted-foreground/50 text-muted-foreground",
  low: "border-muted-foreground/30 text-muted-foreground",
};

const STATUS_LABELS: Record<RoadmapItemStatus, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export function GenerateRoadmapButton({
  assessmentId,
  companyId,
  hasItems,
}: {
  assessmentId: string;
  companyId: string;
  hasItems: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const result = await generateRoadmapAction({ assessmentId, companyId });
      if (!result.ok) toast.error(result.error ?? "Could not generate the roadmap");
      else toast.success(hasItems ? "Roadmap refreshed" : "Roadmap generated");
    });
  }

  return (
    <Button
      onClick={handleGenerate}
      disabled={pending}
      variant={hasItems ? "outline" : "default"}
    >
      <RefreshCcw data-slot="icon" />
      {pending ? "Generating…" : hasItems ? "Refresh from assessment" : "Generate roadmap"}
    </Button>
  );
}

export function RoadmapItemCard({
  item,
  index,
  companyId,
}: {
  item: RoadmapItem;
  index: number;
  companyId: string;
}) {
  const [pending, startTransition] = useTransition();

  function handleStatus(status: string) {
    startTransition(async () => {
      const result = await updateRoadmapItemStatusAction({
        itemId: item.id,
        status: status as RoadmapItemStatus,
        companyId,
      });
      if (!result.ok) toast.error(result.error ?? "Could not update the step");
    });
  }

  return (
    <li className="list-none">
      <Card
        className={cn(
          "border-l-4",
          item.status === "done"
            ? "border-l-success"
            : item.status === "in_progress"
              ? "border-l-accent"
              : item.priority === "critical"
                ? "border-l-destructive"
                : "border-l-border",
        )}
      >
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-[2.5rem_1fr_auto] sm:items-start">
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center border font-utility text-[0.6875rem] font-semibold tabular-nums",
              item.status === "done"
                ? "border-success bg-success text-success-foreground"
                : item.status === "in_progress"
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-primary/30 bg-primary/5 text-primary",
            )}
          >
            {String(index + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0 space-y-2">
            <p
              className={cn(
                "font-heading text-lg font-bold uppercase leading-snug tracking-wide text-primary",
                item.status === "done" && "text-success line-through decoration-success/60",
              )}
            >
              {item.title}
            </p>
            <p className="text-sm text-muted-foreground">{item.description}</p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="outline" className={cn("uppercase", PRIORITY_STYLES[item.priority])}>
                {item.priority}
              </Badge>
              <Badge variant="outline" className="uppercase">
                {item.category}
              </Badge>
              {item.estimatedWeeks !== null && (
                <span className="font-utility text-[0.6875rem] text-muted-foreground">
                  ~{item.estimatedWeeks} weeks
                </span>
              )}
            </div>
          </div>
          <Select value={item.status} onValueChange={handleStatus} disabled={pending}>
            <SelectTrigger className="w-36" aria-label={`Status of: ${item.title}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    </li>
  );
}
