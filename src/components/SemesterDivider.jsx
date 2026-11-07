'use client'

// ────────── Second Semester ────────── style divider for course lists.
export default function SemesterDivider({ label }) {
  return (
    <div className="flex items-center gap-3 px-1 pt-2" aria-hidden={false}>
      <span className="h-px flex-1 bg-border" />
      <span className="text-[11px] font-extrabold uppercase tracking-widest text-muted-foreground">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
