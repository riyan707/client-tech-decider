import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type QQ = {
  id: string
  category: 'smartphones' | 'tvs'
  question: string
  order: number
  is_active: boolean
}

async function toggleQuestionAction(formData: FormData) {
  'use server'
  const id = String(formData.get('id'))
  const next = String(formData.get('next')) === 'true'

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase
    .from('quiz_questions')
    .update({ is_active: next })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/questions')
}

async function moveQuestionAction(formData: FormData) {
  'use server'
  const id = String(formData.get('id'))
  const direction = String(formData.get('direction')) as 'up' | 'down'

  const supabase = await createSupabaseServerClient()

  // Get the current question
  const { data: current, error: e1 } = await supabase
    .from('quiz_questions')
    .select('id, category, "order"')
    .eq('id', id)
    .single()

  if (e1) throw new Error(e1.message)
  if (!current) throw new Error('Question not found')

  const cat = current.category
  const curOrder = current.order as number

  // Find neighbor
  const neighborOrder = direction === 'up' ? curOrder - 1 : curOrder + 1

  const { data: neighbor, error: e2 } = await supabase
    .from('quiz_questions')
    .select('id, "order"')
    .eq('category', cat)
    .eq('order', neighborOrder)
    .single()

  // If no neighbor exists, do nothing
  if (e2 || !neighbor) {
    revalidatePath('/admin/questions')
    return
  }

  // Swap orders
  const { error: e3 } = await supabase
    .from('quiz_questions')
    .update({ order: neighborOrder })
    .eq('id', current.id)

  if (e3) throw new Error(e3.message)

  const { error: e4 } = await supabase
    .from('quiz_questions')
    .update({ order: curOrder })
    .eq('id', neighbor.id)

  if (e4) throw new Error(e4.message)

  revalidatePath('/admin/questions')
}

async function getQuestionsByCategory(category: 'smartphones' | 'tvs') {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase
    .from('quiz_questions')
    .select('id, category, question, "order", is_active')
    .eq('category', category)
    .order('order', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as QQ[]
}

function Section({ title, rows }: { title: string; rows: QQ[] }) {
  return (
    <div style={{ marginTop: 20 }}>
      <h2>{title}</h2>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '80px 1fr 120px 220px',
            padding: 12,
            fontWeight: 600,
            background: '#f9fafb',
          }}
        >
          <div>Order</div>
          <div>Question</div>
          <div>Status</div>
          <div>Actions</div>
        </div>

        {rows.map((q) => (
          <div
            key={q.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '80px 1fr 120px 220px',
              padding: 12,
              borderTop: '1px solid #e5e7eb',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div>{q.order}</div>
            <div>{q.question}</div>
            <div>{q.is_active ? 'Active' : 'Inactive'}</div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href={`/admin/questions/${q.id}`}>Edit</Link>

              <form action={moveQuestionAction}>
                <input type="hidden" name="id" value={q.id} />
                <input type="hidden" name="direction" value="up" />
                <button type="submit">↑</button>
              </form>

              <form action={moveQuestionAction}>
                <input type="hidden" name="id" value={q.id} />
                <input type="hidden" name="direction" value="down" />
                <button type="submit">↓</button>
              </form>

              <form action={toggleQuestionAction}>
                <input type="hidden" name="id" value={q.id} />
                <input type="hidden" name="next" value={(!q.is_active).toString()} />
                <button type="submit">{q.is_active ? 'Deactivate' : 'Activate'}</button>
              </form>
            </div>
          </div>
        ))}

        {rows.length === 0 && <div style={{ padding: 16 }}>No questions.</div>}
      </div>
    </div>
  )
}

export default async function AdminQuestionsPage() {
  const smartphones = await getQuestionsByCategory('smartphones')
  const tvs = await getQuestionsByCategory('tvs')

  return (
    <div style={{ padding: 24 }}>
      <h1>Questions</h1>
      <p style={{ color: '#6b7280' }}>
        MVP editor: JSON-only options/weightings. Use ↑/↓ to reorder.
      </p>

      <Section title="Smartphones" rows={smartphones} />
      <Section title="TVs" rows={tvs} />
    </div>
  )
}
