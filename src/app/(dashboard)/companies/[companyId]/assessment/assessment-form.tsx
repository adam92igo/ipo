"use client";

import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { SectionLabel } from "@/components/section-label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
        "rounded-sm border px-3 py-2 text-left text-sm transition-colors",
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <SectionLabel>Readiness assessment</SectionLabel>
        <h1 className="text-3xl font-bold text-primary">{companyName}</h1>
        <p className="text-muted-foreground">
          Answers are saved as you go — you can leave and resume at any time.
        </p>
      </div>

      {/* Global progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-semibold text-muted-foreground">
          <span>
            {answered} / {total} answered
          </span>
          <span>{Math.round((answered / total) * 100)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{ width: `${(answered / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Step tabs */}
      <div className="flex flex-wrap gap-2">
        {questionnaire.categories.map((c, i) => {
          const done = answeredByCategory.get(c.id) === c.questions.length;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setStep(i)}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                i === step
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input text-muted-foreground hover:border-primary/60",
              )}
            >
              {done && <CheckCircle2 className="size-3.5" />}
              {c.label}
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="space-y-8 pt-6">
          <div>
            <h2 className="text-xl font-bold text-primary">{category.label}</h2>
            <p className="text-sm text-muted-foreground">
              {answeredByCategory.get(category.id) ?? 0} / {category.questions.length}{" "}
              answered in this section
            </p>
          </div>
          {category.questions.map((question, index) => (
            <div key={question.id} className="space-y-3">
              <p className="font-medium leading-snug">
                <span className="mr-2 text-sm font-bold text-primary">
                  {index + 1}.
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
        </CardContent>
      </Card>

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
