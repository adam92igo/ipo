"use client";

import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { InstrumentPanel } from "@/components/layout/instrument-panel";
import { PageHeading } from "@/components/layout/page-heading";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getProgress } from "@/engines/scoring";
import type {
  AnswerValue,
  Answers,
  Question,
  Questionnaire,
} from "@/engines/scoring/types";
import {
  completeAssessmentAction,
  saveAnswerAction,
  startAssessmentAction,
} from "./actions";

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "border px-3 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-background hover:border-primary/60 hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function QuestionControl({
  question,
  scaleLabels,
  value,
  onChange,
}: {
  question: Question;
  scaleLabels: string[];
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
}) {
  if (question.type === "yes_no") {
    return (
      <div className="flex gap-2">
        <OptionButton selected={value === true} onClick={() => onChange(true)}>
          Yes
        </OptionButton>
        <OptionButton selected={value === false} onClick={() => onChange(false)}>
          No
        </OptionButton>
      </div>
    );
  }
  if (question.type === "scale_0_4") {
    return (
      <div className="flex flex-wrap gap-2">
        {scaleLabels.map((label, i) => (
          <OptionButton key={i} selected={value === i} onClick={() => onChange(i)}>
            <span className="font-semibold">{i}</span>
            <span className="ml-1.5 text-xs opacity-80">{label}</span>
          </OptionButton>
        ))}
      </div>
    );
  }
  return (
    <div className="grid gap-2">
      {question.choices!.map((choice) => (
        <OptionButton
          key={choice.id}
          selected={value === choice.id}
          onClick={() => onChange(choice.id)}
        >
          {choice.label}
        </OptionButton>
      ))}
    </div>
  );
}

export function AssessmentForm({
  assessmentId,
  companyId,
  companyName,
  questionnaire,
  initialAnswers,
}: {
  /** null until the first answer creates the row via startAssessmentAction. */
  assessmentId: string | null;
  companyId: string;
  companyName: string;
  questionnaire: Questionnaire;
  initialAnswers: Answers;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [step, setStep] = useState(0);
  const [completing, startCompleting] = useTransition();
  // Memoized so N racing answers trigger exactly one create.
  const assessmentIdPromise = useRef<Promise<string> | null>(
    assessmentId ? Promise.resolve(assessmentId) : null,
  );

  const category = questionnaire.categories[step];
  const isLastStep = step === questionnaire.categories.length - 1;
  // Same counting rule as the server-side completion gate (engine).
  const { answered, total, byCategory } = getProgress(questionnaire, answers);
  const answeredByCategory = new Map(byCategory.map((c) => [c.id, c.answered]));

  function ensureAssessmentId(): Promise<string> {
    if (!assessmentIdPromise.current) {
      assessmentIdPromise.current = startAssessmentAction({ companyId }).then(
        (result) => {
          if (!result.ok || !result.assessmentId) {
            assessmentIdPromise.current = null; // allow retry
            throw new Error(result.error ?? "Could not start the assessment");
          }
          return result.assessmentId;
        },
      );
    }
    return assessmentIdPromise.current;
  }

  function handleAnswer(questionId: string, value: AnswerValue) {
    const previous = answers[questionId];
    const hadPrevious = questionId in answers;
    setAnswers((prev) => ({ ...prev, [questionId]: value }));

    ensureAssessmentId()
      .then((id) => saveAnswerAction({ assessmentId: id, questionId, value }))
      .then((result) => {
        if (!result.ok) throw new Error(result.error ?? "Could not save the answer");
      })
      .catch((error: unknown) => {
        // Roll back the optimistic state so progress never overcounts.
        setAnswers((prev) => {
          const next = { ...prev };
          if (hadPrevious) next[questionId] = previous;
          else delete next[questionId];
          return next;
        });
        toast.error(
          error instanceof Error ? error.message : "Could not save the answer",
        );
      });
  }

  function handleComplete() {
    startCompleting(async () => {
      try {
        const id = await ensureAssessmentId();
        const result = await completeAssessmentAction({ assessmentId: id });
        if (!result.ok) {
          toast.error(result.error ?? "Could not complete the assessment");
          return;
        }
        router.push(`/companies/${companyId}/results`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not complete the assessment",
        );
      }
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeading
        eyebrow="Readiness assessment"
        title={companyName}
        description="Answers are saved as you go — you can leave and resume at any time."
      />

      {/* Global progress */}
      <div
        className="space-y-2 border-y border-border py-3"
        role="progressbar"
        aria-label="Assessment completion"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={answered}
      >
        <div className="flex justify-between font-utility text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>
            {answered} / {total} answered
          </span>
          <span>{Math.round((answered / total) * 100)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden bg-muted">
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${(answered / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Step tabs */}
      <nav
        aria-label="Assessment sections"
        className="flex flex-wrap border-b border-border"
      >
        {questionnaire.categories.map((c, i) => {
          const done = answeredByCategory.get(c.id) === c.questions.length;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setStep(i)}
              aria-label={`${c.label} section`}
              aria-describedby={done ? `${c.id}-section-status` : undefined}
              aria-current={i === step ? "step" : undefined}
              className={cn(
                "relative flex min-w-28 items-center justify-center gap-1.5 border-b-2 px-4 py-3 font-heading text-sm font-bold uppercase tracking-[0.12em] transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                i === step
                  ? "border-accent text-primary"
                  : "border-transparent text-muted-foreground hover:border-primary/30 hover:text-primary",
              )}
            >
              {done && <CheckCircle2 className="size-3.5" />}
              <span>{String(i + 1).padStart(2, "0")}</span>
              {c.label}
              {done && (
                <span
                  id={`${c.id}-section-status`}
                  className="font-utility text-[0.5rem] tracking-wider"
                >
                  Complete
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <InstrumentPanel
        eyebrow={`Section ${String(step + 1).padStart(2, "0")} / ${String(questionnaire.categories.length).padStart(2, "0")}`}
        title={category.label}
        action={
          <p className="font-utility text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
            {answeredByCategory.get(category.id) ?? 0} / {category.questions.length}{" "}
            answered in this section
          </p>
        }
      >
        <div className="divide-y divide-border border-y border-border">
          {category.questions.map((question, index) => (
            <div key={question.id} className="grid gap-3 py-5 md:grid-cols-[minmax(0,1fr)_minmax(16rem,0.85fr)] md:items-start md:gap-8">
              <p className="font-medium leading-snug">
                <span className="mr-3 font-utility text-[0.6875rem] font-semibold text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {question.text}
              </p>
              <QuestionControl
                question={question}
                scaleLabels={questionnaire.scaleLabels}
                value={answers[question.id]}
                onChange={(value) => handleAnswer(question.id, value)}
              />
            </div>
          ))}
        </div>
      </InstrumentPanel>

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={step === 0}
          onClick={() => setStep((s) => s - 1)}
        >
          <ArrowLeft data-slot="icon" /> Previous
        </Button>
        {isLastStep ? (
          <Button onClick={handleComplete} disabled={completing || answered < total}>
            {completing
              ? "Computing score…"
              : answered < total
                ? `${total - answered} answers remaining`
                : "Complete & view results"}
          </Button>
        ) : (
          <Button onClick={() => setStep((s) => s + 1)}>
            Next <ArrowRight data-slot="icon" />
          </Button>
        )}
      </div>
    </div>
  );
}
