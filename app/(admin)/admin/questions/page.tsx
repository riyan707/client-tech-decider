export const dynamic = "force-dynamic";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { quiz_questions } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Category = "smartphones" | "tvs";

type QQ = {
  id: string;
  category: Category;
  question: string;
  order: number;
  is_active: boolean;
};

async function toggleQuestionAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const next = String(formData.get("next")) === "true";

  await db.update(quiz_questions).set({ is_active: next }).where(eq(quiz_questions.id, id));

  revalidatePath("/admin/questions");
}

async function moveQuestionAction(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  const direction = String(formData.get("direction")) as "up" | "down";

  // current
  const currentRows = await db
    .select({ id: quiz_questions.id, category: quiz_questions.category, order: quiz_questions.order })
    .from(quiz_questions)
    .where(eq(quiz_questions.id, id))
    .limit(1);

  const current = currentRows[0];
  if (!current) throw new Error("Question not found");

  const cat = current.category as Category;
  const curOrder = current.order as number;
  const neighborOrder = direction === "up" ? curOrder - 1 : curOrder + 1;

  const neighborRows = await db
    .select({ id: quiz_questions.id, order: quiz_questions.order })
    .from(quiz_questions)
    .where(and(eq(quiz_questions.category, cat), eq(quiz_questions.order, neighborOrder)))
    .limit(1);

  const neighbor = neighborRows[0];

  // no neighbor = nothing to do
  if (!neighbor) {
    revalidatePath("/admin/questions");
    return;
  }

  // swap orders
  await db.update(quiz_questions).set({ order: neighborOrder }).where(eq(quiz_questions.id, current.id));
  await db.update(quiz_questions).set({ order: curOrder }).where(eq(quiz_questions.id, neighbor.id));

  revalidatePath("/admin/questions");
}

async function getQuestionsByCategory(category: Category) {
  const rows = await db
    .select({
      id: quiz_questions.id,
      category: quiz_questions.category,
      question: quiz_questions.question,
      order: quiz_questions.order,
      is_active: quiz_questions.is_active,
    })
    .from(quiz_questions)
    .where(eq(quiz_questions.category, category))
    .orderBy(asc(quiz_questions.order));

  return rows as QQ[];
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge className="rounded-full">Active</Badge>
  ) : (
    <Badge variant="secondary" className="rounded-full">
      Inactive
    </Badge>
  );
}

function CategorySection({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle?: string;
  rows: QQ[];
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-end justify-between gap-4">
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>

          <div className="text-sm text-muted-foreground">{rows.length} questions</div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px]">Order</TableHead>
                <TableHead>Question</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[260px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rows.map((q) => (
                <TableRow key={q.id}>
                  <TableCell className="font-medium tabular-nums">{q.order}</TableCell>

                  <TableCell className="max-w-[700px]">
                    <div className="font-medium leading-snug">{q.question}</div>
                  </TableCell>

                  <TableCell>
                    <StatusBadge active={q.is_active} />
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild size="sm" variant="outline" className="rounded-xl">
                        <Link href={`/admin/questions/${q.id}`}>Edit</Link>
                      </Button>

                      <form action={moveQuestionAction}>
                        <input type="hidden" name="id" value={q.id} />
                        <input type="hidden" name="direction" value="up" />
                        <Button
                          type="submit"
                          size="sm"
                          variant="secondary"
                          className="rounded-xl px-3"
                          title="Move up"
                          aria-label="Move up"
                        >
                          ↑
                        </Button>
                      </form>

                      <form action={moveQuestionAction}>
                        <input type="hidden" name="id" value={q.id} />
                        <input type="hidden" name="direction" value="down" />
                        <Button
                          type="submit"
                          size="sm"
                          variant="secondary"
                          className="rounded-xl px-3"
                          title="Move down"
                          aria-label="Move down"
                        >
                          ↓
                        </Button>
                      </form>

                      <form action={toggleQuestionAction}>
                        <input type="hidden" name="id" value={q.id} />
                        <input type="hidden" name="next" value={(!q.is_active).toString()} />
                        <Button
                          type="submit"
                          size="sm"
                          variant={q.is_active ? "secondary" : "default"}
                          className="rounded-xl"
                        >
                          {q.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}

              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    No questions yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="mt-3 text-xs text-muted-foreground">
          Tip: Use ↑/↓ to reorder questions within this category.
        </div>
      </CardContent>
    </Card>
  );
}

export default async function AdminQuestionsPage() {
  const smartphones = await getQuestionsByCategory("smartphones");
  const tvs = await getQuestionsByCategory("tvs");

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Admin</div>
          <h1 className="text-3xl font-semibold tracking-tight">Questions</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            MVP editor: JSON-only options/weightings. Reorder questions per category.
          </p>
        </div>

        <div className="flex gap-2">
          <Button asChild variant="secondary" className="rounded-xl">
            <Link href="/admin/questions/new">New question</Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-6">
        <CategorySection
          title="Smartphones"
          subtitle="Questions shown in the smartphone quiz."
          rows={smartphones}
        />

        <CategorySection title="TVs" subtitle="Questions shown in the TV quiz." rows={tvs} />
      </div>
    </div>
  );
}
