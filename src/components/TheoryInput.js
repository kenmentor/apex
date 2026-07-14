'use client'

import { useState } from 'react'
import { Camera, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default function TheoryInput({ onSubmit, disabled }) {
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  async function handleConfirmSubmit() {
    if (submitting) return
    setSubmitting(true)
    setShowConfirm(false)
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

  function handleRequestSubmit() {
    if (text.trim().length < 10) return
    setShowConfirm(true)
  }

  const canSubmit = text.trim().length >= 10

  return (
    <div className="space-y-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write your answer here..."
        className="min-h-[200px] resize-none text-sm"
        autoFocus
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {text.trim().length} characters {text.trim().length < 10 && `(minimum 10)`}
        </span>
        <Button
          onClick={handleRequestSubmit}
          disabled={!canSubmit || submitting || disabled}
          size="sm"
          className="font-bold"
        >
          SUBMIT ANSWER
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 border-t pt-3">
        <Button variant="outline" size="sm" disabled className="opacity-50">
          <Camera className="mr-1 size-3" />
          Snap Answer
        </Button>
        <Badge variant="secondary" className="text-[10px]">Coming Soon</Badge>
      </div>

      {/* Submit Confirmation Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5 backdrop-blur-sm">
          <Card className="w-full max-w-sm space-y-4 py-8 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangle className="size-7 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold">Submit Answer?</h3>
            <p className="px-6 text-sm text-muted-foreground">
              Once submitted, you cannot go back to change your answer. Your response will be evaluated by the AI examiner.
            </p>
            <div className="space-y-2 px-6 pt-2">
              <Button
                onClick={handleConfirmSubmit}
                className="w-full py-5 text-sm font-bold"
              >
                YES, SUBMIT
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
