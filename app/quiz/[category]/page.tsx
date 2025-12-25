import { supabaseServer } from "@/app/utils/supabase/server";
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

  const { data, error } = await supabaseServer
    .from("quiz_questions")
    .select("id, category, question, type, options, weightings, order")
    .eq("category", category)
    .eq("is_active", true)
    .order("order", { ascending: true });

  if (error) {
    throw new Error(`Failed to load quiz questions: ${error.message}`);
  }

  const questions = (data ?? []) as unknown as QuizQuestion[];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold capitalize">{category} Quiz</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Answer a few questions and we’ll recommend the best options for you.
      </p>

      <div className="mt-8">
        <QuizClient category={category} questions={questions} />
      </div>
    </div>
  );
}
