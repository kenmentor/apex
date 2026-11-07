'use client'

import { Loader2 } from 'lucide-react'

// One consistent loading spinner for buttons. Keeps button size stable
// (fixed-size icon slot) so the layout doesn't jump when busy flips on.
export default function BtnSpinner({ className = 'size-4' }) {
  return <Loader2 className={`${className} shrink-0 animate-spin`} aria-hidden />;
}
