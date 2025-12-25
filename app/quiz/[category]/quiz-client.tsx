"use client";

import { useMemo, useState } from "react";
import type { QuizCategory, QuizQuestion } from "@/lib/types";
import { useRouter } from "next/navigation";

type Props = {
  category: QuizCategory;
  questions: QuizQuestion[];
};

export default function QuizClient({ category, questions }: Props) {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const total = questions.length;

  const current = questions[step];

  const progressPct = useMemo(() => {
    if (total === 0) return 0;
    return Math.round(((step + 1) / total) * 100);
  }, [step, total]);

  function selectOption(value: string) {
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  }

  function canGoNext() {
    return Boolean(current && answers[current.id]);
  }

  async function onSubmit() {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          answers, // keyed by questionId -> selected option
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Submit failed");
      }

      const json = await res.json();
      router.push(`/results/${json.submissionId}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      alert(message);
      setIsSubmitting(false);
    }
  }

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border p-4 text-sm text-neutral-600">
        No questions found for this category.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border p-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-600">
          Question {step + 1} of {total}
        </span>
        <span className="font-medium">{progressPct}%</span>
      </div>
      <div className="mt-3 h-2 w-full rounded-full bg-neutral-200">
        <div
          className="h-2 rounded-full bg-neutral-900 transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Question */}
      <h2 className="mt-6 text-lg font-semibold">{current.question}</h2>

      {/* Options */}
      <div className="mt-4 grid gap-2">
        {current.options.map((opt) => {
          const active = answers[current.id] === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => selectOption(opt)}
              className={[
                "w-full rounded-xl border px-4 py-3 text-left text-sm transition",
                active
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 hover:border-neutral-400",
              ].join(" ")}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0 || isSubmitting}
          className="rounded-xl border px-4 py-2 text-sm disabled:opacity-40"
        >
          Back
        </button>

        {step < total - 1 ? (
          <button
            type="button"
            onClick={() => setStep((s) => Math.min(total - 1, s + 1))}
            disabled={!canGoNext() || isSubmitting}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canGoNext() || isSubmitting}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-40"
          >
            {isSubmitting ? "Submitting..." : "Get results"}
          </button>
        )}
      </div>
    </div>
  );
}
