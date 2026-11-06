'use client'

import { useEffect } from 'react'
import { startAnalytics } from '@/lib/firebase'

export default function FirebaseInit() {
  useEffect(() => { startAnalytics() }, [])
  return null
}
