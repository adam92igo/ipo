"use client";

import { Send, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "What is the difference between Euronext Growth and Euronext Access?",
  "Which documents are mandatory for an IPO in France?",
  "How can I improve my readiness score?",
  "What are the main risks of an IPO?",
];

export function AssistantChat({
  companies,
}: {
  companies: Array<{ id: string; name: string }>;
}) {
  const [companyId, setCompanyId] = useState<string>("none");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const history = [...messages, { role: "user" as const, content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);

    try {
      // Keep the request bounded: last 12 turns are plenty of context — and
      // the API requires the first message to be a user turn.
      const recent = history.slice(-12);
      while (recent[0]?.role === "assistant") recent.shift();

      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companyId: companyId === "none" ? undefined : companyId,
          messages: recent,
        }),
      });
      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? `Assistant error (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        const snapshot = assistantText;
        setMessages([...history, { role: "assistant", content: snapshot }]);
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      }
    } catch (error) {
      setMessages([
        ...history,
        {
          role: "assistant",
          content: `⚠️ ${error instanceof Error ? error.message : "Something went wrong."}`,
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Context:</span>
        <Select value={companyId} onValueChange={setCompanyId}>
          <SelectTrigger className="w-64" aria-label="Company context">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">General IPO questions</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="flex-1 overflow-hidden">
        <CardContent className="h-full p-0">
          <div ref={scrollRef} className="h-[26rem] space-y-4 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                  <Sparkles className="size-5 text-primary" />
                </div>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Ask anything about the IPO process. Pick a company above and I can
                  read its readiness score, weaknesses and roadmap.
                </p>
                <div className="flex max-w-lg flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => send(suggestion)}
                      className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-lg px-4 py-2.5 text-sm leading-relaxed",
                    message.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  {message.content || (busy ? "…" : "")}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
        className="flex items-end gap-2"
      >
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send(input);
            }
          }}
          placeholder="Ask about prospectus requirements, markets, governance…"
          rows={2}
          maxLength={4000}
          className="resize-none"
        />
        <Button
          type="submit"
          disabled={busy || !input.trim()}
          className="uppercase tracking-[0.15em]"
        >
          <Send data-slot="icon" /> Send
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        Educational guidance only — not investment advice. Scores and valuations
        always come from the deterministic engines.
      </p>
    </div>
  );
}
