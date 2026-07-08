"use client";

import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  AnswerValue,
  Answers,
  Question,
  Questionnaire,
} from "@/engines/scoring/types";
import { completeAssessmentAction, saveAnswerAction } from "./actions";

const SCALE_LABELS = ["Not started", "Early stage", "Partial", "Advanced", "Fully in place"];

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
  value,
  onChange,
}: {
  question: Question;
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
        {SCALE_LABELS.map((label, i) => (
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
  assessmentId: string;
  companyId: string;
  companyName: string;
  questionnaire: Questionnaire;
  initialAnswers: Answers;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [step, setStep] = useState(0);
  const [completing, startCompleting] = useTransition();

  const category = questionnaire.categories[step];
  const isLastStep = step === questionnaire.categories.length - 1;
  const total = useMemo(
    () => questionnaire.categories.reduce((s, c) => s + c.questions.length, 0),
    [questionnaire],
  );
  const answered = questionnaire.categories
    .flatMap((c) => c.questions)
    .filter((q) => q.id in answers).length;

  function handleAnswer(questionId: string, value: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    void saveAnswerAction({ assessmentId, questionId, value }).then((result) => {
      if (!result.ok) toast.error(result.error ?? "Could not save the answer");
    });
  }

  function handleComplete() {
    startCompleting(async () => {
      const result = await completeAssessmentAction({ assessmentId, companyId });
      if (!result.ok) {
        toast.error(result.error ?? "Could not complete the assessment");
        return;
      }
      router.push(`/companies/${companyId}/results`);
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <p className="text-sm uppercase italic tracking-wider text-secondary">
          /Readiness assessment/
        </p>
        <h1 className="text-3xl font-extrabold text-primary">{companyName}</h1>
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
          const done = c.questions.every((q) => q.id in answers);
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
              {category.questions.filter((q) => q.id in answers).length} /{" "}
              {category.questions.length} answered in this section
            </p>
          </div>
          {category.questions.map((question, index) => (
            <div key={question.id} className="space-y-3">
              <p className="font-medium leading-snug">
                <span className="mr-2 text-sm font-bold text-secondary">
                  {index + 1}.
                </span>
                {question.text}
              </p>
              <QuestionControl
                question={question}
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
          className="uppercase tracking-[0.15em]"
        >
          <ArrowLeft data-slot="icon" /> Previous
        </Button>
        {isLastStep ? (
          <Button
            onClick={handleComplete}
            disabled={completing || answered < total}
            className="uppercase tracking-[0.15em]"
          >
            {completing
              ? "Computing score…"
              : answered < total
                ? `${total - answered} answers remaining`
                : "Complete & view results"}
          </Button>
        ) : (
          <Button
            onClick={() => setStep((s) => s + 1)}
            className="uppercase tracking-[0.15em]"
          >
            Next <ArrowRight data-slot="icon" />
          </Button>
        )}
      </div>
    </div>
  );
}
