// components/FloatingQuizCTA.tsx
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function FloatingQuizCTA() {
  return (
    <div className="fixed bottom-5 right-5 z-50">
      <Button asChild className="rounded-full px-5 py-6 shadow-lg">
        <Link href="/quiz">Take the quiz</Link>
      </Button>
    </div>
  )
}
