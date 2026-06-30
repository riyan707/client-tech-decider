"use client";

import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { TV_QUIZ_TREE, getTVQuizFlow, getMaxTVQuestions, TVTreeNode } from "@/lib/tv-quiz-tree";
import Link from "next/link";

const UTM_STORAGE_KEY = "dsgnr_utms_v1";
function getStoredUtm() {
  try { return JSON.parse(localStorage.getItem(UTM_STORAGE_KEY) || "{}"); }
  catch { return {}; }
}
function storeUtm(u: Record<string, string | undefined>) {
  const merged = { ...getStoredUtm(), ...u };
  localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(merged));
}

const slideVariants = {
  enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0 },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -40 : 40 }),
};

export default function TVQuizPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailStep, setShowEmailStep] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    storeUtm({
      source: params.get("utm_source") ?? undefined,
      campaign: params.get("utm_campaign") ?? undefined,
      adset: params.get("utm_adset") ?? undefined,
      content: params.get("utm_content") ?? undefined,
    });
  }, []);

  const flow = useMemo(() => getTVQuizFlow(answers), [answers]);
  const currentId = flow[stepIndex];
  const currentNode: TVTreeNode | undefined = TV_QUIZ_TREE.find((n) => n.id === currentId);

  // Fixed denominator = longest possible path + 1 (email step).
  // Using flow.length would shrink/grow the denominator as branches resolve, making the bar jump.
  const MAX_STEPS = getMaxTVQuestions() + 1;
  const progressPct = showEmailStep
    ? 100
    : Math.round(((stepIndex + 1) / MAX_STEPS) * 100);

  function selectOption(value: string) {
    setAnswers((prev) => ({ ...prev, [currentId]: value }));
  }

  function goNext() {
    const newAnswers = { ...answers };
    const newFlow = getTVQuizFlow(newAnswers);
    if (stepIndex < newFlow.length - 1) {
      setDir(1);
      setStepIndex((s) => s + 1);
    } else {
      setDir(1);
      setShowEmailStep(true);
    }
  }

  function goBack() {
    if (showEmailStep) {
      setDir(-1);
      setShowEmailStep(false);
      return;
    }
    if (stepIndex > 0) {
      setDir(-1);
      setStepIndex((s) => s - 1);
    }
  }

  async function onSubmit() {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "tvs",
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

  const canGoNext = currentNode && Boolean(answers[currentId]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="mb-2 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">TV Quiz</h1>
        <span className="text-xs text-neutral-500">
          {showEmailStep ? "Almost done" : `Question ${stepIndex + 1} of ${MAX_STEPS - 1}`}
        </span>
      </div>

      {/* Guide link */}
      <p className="mb-6 text-sm text-neutral-500">
        Not sure which display tech suits you?{" "}
        <Link href="/blog/oled-vs-qled-vs-miniled-explained" className="underline hover:text-neutral-800">
          Read our guide →
        </Link>
      </p>

      {/* Progress bar */}
      <div className="mb-8 h-1.5 w-full rounded-full bg-neutral-200">
        <div
          className="h-1.5 rounded-full bg-neutral-900 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <AnimatePresence mode="wait" custom={dir}>
        {!showEmailStep && currentNode ? (
          <motion.div
            key={currentId}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            <p className="mb-1 text-lg font-medium">{currentNode.question}</p>
            {currentNode.hint && (
              <p className="mb-5 text-sm text-neutral-500">{currentNode.hint}</p>
            )}
            <div className="mt-5 flex flex-col gap-3">
              {currentNode.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => selectOption(opt.value)}
                  className={`rounded-xl border px-5 py-4 text-left text-sm transition-all ${
                    answers[currentId] === opt.value
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </motion.div>
        ) : showEmailStep ? (
          <motion.div
            key="email"
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            <p className="mb-1 text-lg font-medium">Almost there!</p>
            <p className="mb-6 text-sm text-neutral-500">
              💾 Get your results by email — we&apos;ll also save your preferences for next time.{" "}
              <span className="font-medium">(Optional)</span>
            </p>
            <div className="flex flex-col gap-4">
              <input
                type="text"
                placeholder="First name (optional)"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-900"
              />
              <input
                type="email"
                placeholder="Email address (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-900"
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Nav buttons */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={goBack}
          disabled={stepIndex === 0 && !showEmailStep}
          className="text-sm text-neutral-500 hover:text-neutral-800 disabled:opacity-30"
        >
          ← Back
        </button>

        {showEmailStep ? (
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="rounded-xl bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-60"
          >
            {isSubmitting ? "Finding your TV…" : "See my recommendations →"}
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={!canGoNext}
            className="rounded-xl bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-40"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
