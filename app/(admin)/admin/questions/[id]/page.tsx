export const dynamic = "force-dynamic";
import { db } from "@/lib/db";
import { quiz_questions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

async function updateQuestionAction(formData: FormData) {
  'use server'

  const id = String(formData.get('id'))
  const question = String(formData.get('question')).trim()
  const order = Number(formData.get('order'))
  const is_active = String(formData.get('is_active')) === 'on'

  const optionsRaw = String(formData.get('options') || '[]')
  const weightingsRaw = String(formData.get('weightings') || '{}')

  let options: any
  let weightings: any

  try {
    options = JSON.parse(optionsRaw)
    if (!Array.isArray(options)) throw new Error('options must be a JSON array')
  } catch (e: any) {
    throw new Error(`Invalid options JSON: ${e.message}`)
  }

  try {
    weightings = JSON.parse(weightingsRaw)
    if (typeof weightings !== 'object' || weightings === null || Array.isArray(weightings))
      throw new Error('weightings must be a JSON object')
  } catch (e: any) {
    throw new Error(`Invalid weightings JSON: ${e.message}`)
  }

  if (!question) throw new Error('question is required')
  if (!Number.isFinite(order) || order < 1) throw new Error('order must be a number >= 1')

  await db
    .update(quiz_questions)
    .set({ question, options, weightings, order, is_active })
    .where(eq(quiz_questions.id, id))

  redirect('/admin/questions')
}

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params;

  const rows = await db
    .select()
    .from(quiz_questions)
    .where(eq(quiz_questions.id, id))
    .limit(1);

  const q = rows[0];

  if (!q) throw new Error('Question not found')

  return (
    <div style={{ padding: 24, maxWidth: 820 }}>
      <h1>Edit question</h1>

      <form action={updateQuestionAction} style={{ display: 'grid', gap: 12, marginTop: 16 }}>
        <input type="hidden" name="id" value={q.id} />

        <label>
          Question *
          <textarea
            name="question"
            required
            rows={3}
            defaultValue={q.question}
            style={{ display: 'block', width: '100%', padding: 10 }}
          />
        </label>

        <label>
          Order *
          <input
            type="number"
            name="order"
            min={1}
            required
            defaultValue={q.order}
            style={{ display: 'block', width: 160, padding: 10 }}
          />
        </label>

        <label>
          Options (JSON array)
          <textarea
            name="options"
            rows={7}
            defaultValue={JSON.stringify(q.options ?? [], null, 2)}
            style={{ display: 'block', width: '100%', padding: 10, fontFamily: 'monospace' }}
          />
        </label>

        <label>
          Weightings (JSON object)
          <textarea
            name="weightings"
            rows={10}
            defaultValue={JSON.stringify(q.weightings ?? {}, null, 2)}
            style={{ display: 'block', width: '100%', padding: 10, fontFamily: 'monospace' }}
          />
        </label>

        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" name="is_active" defaultChecked={q.is_active} />
          Active
        </label>

        <button type="submit" style={{ padding: 10 }}>
          Save
        </button>
      </form>
    </div>
  )
}
