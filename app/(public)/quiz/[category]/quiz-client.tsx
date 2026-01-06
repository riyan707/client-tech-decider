"use client";

import { useMemo, useState, useEffect } from "react";
import type { QuizCategory, QuizQuestion } from "@/lib/types";
import { useRouter } from "next/navigation";

type UtmPayload = {
  source?: string;
  campaign?: string;
  adset?: string;
  content?: string;
};

const UTM_STORAGE_KEY = "dsgnr_utms_v1";

function captureUtmsFromUrl(): UtmPayload {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  return {
    source: params.get("utm_source") ?? undefined,
    campaign: params.get("utm_campaign") ?? undefined,
    adset: params.get("utm_adset") ?? undefined,
    content: params.get("utm_content") ?? undefined,
  };
}

function getStoredUtm(): UtmPayload {
  try {
    return JSON.parse(localStorage.getItem(UTM_STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function storeUtm(newUtm: UtmPayload) {
  const current = getStoredUtm();
  const merged = { ...current, ...newUtm };
  localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

type Props = {
  category: QuizCategory;
  questions: QuizQuestion[];
};

export default function QuizClient({ category, questions }: Props) {
  const router = useRouter();

  // Step 0 (lead capture)
  const [hasStarted, setHasStarted] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [leadError, setLeadError] = useState<string | null>(null);

  // quiz state
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = questions.length;
  const current = questions[step];

  useEffect(() => {
    // Capture UTMs once
    storeUtm(captureUtmsFromUrl());
  }, []);

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

  function validateLead() {
    if (!firstName.trim() || !email.trim()) return false;
    // basic email check (enough for MVP)
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  function handleStart() {
    setLeadError(null);
    if (!validateLead()) {
      setLeadError("Please enter a valid name and email.");
      return;
    }
    setHasStarted(true);
  }

  async function onSubmit() {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          answers,                 // questionId -> selected option
          email: email.trim(),     // ✅ add
          first_name: firstName.trim(), // ✅ add
          utm: getStoredUtm(),     // ✅ add
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

  // ✅ Step 0 UI
  if (!hasStarted) {
    return (
      <div className="rounded-2xl border p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Step 1 of 2
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Get your personalised results</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Enter your name and email first — then take the quiz.
        </p>

        <div className="mt-5 grid gap-3">
          <input
            className="w-full rounded-xl border px-4 py-3 text-sm"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            disabled={isSubmitting}
          />
          <input
            className="w-full rounded-xl border px-4 py-3 text-sm"
            placeholder="you@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
          />

          <button
            type="button"
            onClick={handleStart}
            className="rounded-xl bg-neutral-900 px-4 py-3 text-sm text-white disabled:opacity-40"
            disabled={!firstName.trim() || !email.trim()}
          >
            Start the quiz
          </button>

          {leadError ? <p className="text-sm text-red-600">{leadError}</p> : null}
          <p className="text-xs text-neutral-500">
            By continuing, you agree to receive your results + relevant tips. Unsubscribe anytime.
          </p>
        </div>
      </div>
    );
  }

  // Quiz UI (your existing UI)
  return (
    <div className="rounded-2xl border p-6">
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

      <h2 className="mt-6 text-lg font-semibold">{current.question}</h2>

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
