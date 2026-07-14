'use client'

import { useState } from 'react'
import { Camera, Type, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'

export default function TheoryInput({ onSubmit, disabled }) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (submitting) return
    setSubmitting(true)
    try {
      await onSubmit({
        answerType: 'text',
        text: text.trim(),
        imageFile: null,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = text.trim().length >= 10

  return (
    <div className="space-y-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your theory answer here..."
        className="min-h-[200px] resize-none text-sm"
        autoFocus
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {text.trim().length} characters {text.trim().length < 10 && `(min 10)`}
        </span>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting || disabled}
          size="sm"
        >
          {submitting ? 'Grading...' : 'Submit Answer'}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 border-t pt-3">
        <Button variant="outline" size="sm" disabled className="opacity-50">
          <Camera className="mr-1 size-3" />
          Snap Answer
        </Button>
        <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
      </div>
    </div>
  )
}
