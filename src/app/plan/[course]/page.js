'use client'

import { use } from 'react'
import CoursePlanView from '@/components/CoursePlanView'

export default function CoursePlanPage({ params }) {
  const { course: slug } = use(params)
  return <CoursePlanView slug={slug} backHref="/plan" />
}
