"use client";

import { useMemo, useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { QuizCategory, QuizQuestion } from "@/lib/types";
import { useRouter } from "next/navigation";

type UtmPayload = { source?: string; campaign?: string; adset?: string; content?: string };
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
  try { return JSON.parse(localStorage.getItem(UTM_STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function storeUtm(newUtm: UtmPayload) {
  const merged = { ...getStoredUtm(), ...newUtm };
  localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(merged));
  return merged;
}

type Props = { category: QuizCategory; questions: QuizQuestion[] };

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
};

export default function QuizClient({ category, questions }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");

  const total = questions.length;
  const current = questions[step];

  useEffect(() => { storeUtm(captureUtmsFromUrl()); }, []);

  // Use total+1 so the bar never reaches 100% while still on a question.
  // It fills to ~83% on the last question and completes when the page navigates away.
  const progressPct = useMemo(() => {
    if (total === 0) return 0;
    return Math.round(((step + 1) / (total + 1)) * 100);
  }, [step, total]);

  function selectOption(value: string) {
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  }

  function canGoNext() { return Boolean(current && answers[current.id]); }

  function goNext() { setDir(1); setStep((s) => Math.min(total - 1, s + 1)); }
  function goBack() { setDir(-1); setStep((s) => Math.max(0, s - 1)); }

  async function onSubmit() {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          answers,
          email: email.trim() || "anonymous@techdecider.com",
          first_name: firstName.trim() || "Friend",
          utm: getStoredUtm(),
        }),
      });

      if (!res.ok) throw new Error(await res.text() || "Submit failed");
      const json = await res.json();
      router.push(`/results/${json.submissionId}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  if (questions.length === 0) {
    return (
      <div className="rounded-xl border p-6 text-sm text-muted-foreground">
        No questions found for this category.
      </div>
    );
  }

  const isLastStep = step === total - 1;

  return (
    <div className="rounded-2xl border bg-background shadow-sm overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 w-full bg-muted">
        <motion.div
          className="h-full bg-foreground"
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      <div className="p-6">
        {/* Step counter */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Question {step + 1} of {total}</span>
          <span className="font-medium text-foreground">{progressPct}%</span>
        </div>

        {/* Question + options (animated) */}
        <div className="mt-5 min-h-70">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: "easeInOut" }}
            >
              <h2 className="text-lg font-semibold leading-snug">{current.question}</h2>

              <div className="mt-4 grid gap-2">
                {(current.options as string[]).map((opt, i) => {
                  const active = answers[current.id] === opt;
                  return (
                    <motion.button
                      key={opt}
                      type="button"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => selectOption(opt)}
                      className={[
                        "w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border hover:border-foreground/40 hover:bg-muted/40",
                      ].join(" ")}
                    >
                      {opt}
                    </motion.button>
                  );
                })}
              </div>

              {/* Optional email on last step */}
              {isLastStep && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="mt-5 space-y-3 rounded-xl border border-dashed p-4"
                >
                  <p className="text-sm font-medium">
                    💾 Get your results by email — we&apos;ll also save your preferences for next time.{" "}
                    <span className="font-normal text-muted-foreground">(Optional)</span>
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      className="rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                    <input
                      className="rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                      placeholder="your@email.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">No spam. Unsubscribe anytime.</p>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Nav */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0 || isSubmitting}
            className="rounded-xl border px-4 py-2.5 text-sm font-medium transition hover:bg-muted disabled:opacity-40"
          >
            Back
          </button>

          {!isLastStep ? (
            <motion.button
              type="button"
              onClick={goNext}
              disabled={!canGoNext()}
              whileTap={{ scale: 0.97 }}
              className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-80 disabled:opacity-40"
            >
              Next →
            </motion.button>
          ) : (
            <motion.button
              type="button"
              onClick={onSubmit}
              disabled={!canGoNext() || isSubmitting}
              whileTap={{ scale: 0.97 }}
              className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-medium text-background transition hover:opacity-80 disabled:opacity-40"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    className="inline-block h-3.5 w-3.5 rounded-full border-2 border-background/30 border-t-background"
                  />
                  Finding matches…
                </span>
              ) : (
                "See my results →"
              )}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
