export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { quiz_questions } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import QuizClient from "./quiz-client";
import type { QuizCategory, QuizQuestion } from "@/lib/types";
import { notFound } from "next/navigation";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category: rawCategory } = await params;
  const category = rawCategory as QuizCategory;

  if (category !== "smartphones" && category !== "tvs") return notFound();

  const rows = await db
    .select({
      id: quiz_questions.id,
      category: quiz_questions.category,
      question: quiz_questions.question,
      type: quiz_questions.type,
      options: quiz_questions.options,
      weightings: quiz_questions.weightings,
      order: quiz_questions.order,
    })
    .from(quiz_questions)
    .where(and(eq(quiz_questions.category, category), eq(quiz_questions.is_active, true)))
    .orderBy(asc(quiz_questions.order));

  const questions = rows as unknown as QuizQuestion[];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold capitalize">{category} Quiz</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Answer a few questions and we&apos;ll recommend the best options for you.
      </p>

      <div className="mt-8">
        <QuizClient category={category} questions={questions} />
      </div>
    </div>
  );
}
