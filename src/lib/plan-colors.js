// Course block colors — shared by /plan and /plan/[course] so both stay in sync.
// Kept in its own module (not a component file) so Fast Refresh doesn't
// trigger full reloads when these are imported across routes.
export const BLOCK_COLORS = ['#2563EB', '#7C3AED', '#F59E0B', '#059669', '#E11D48', '#0284C7'];

export function colorFor(code) {
  let h = 0
  for (const c of String(code || '?')) h = (h * 31 + c.charCodeAt(0)) % BLOCK_COLORS.length
  return BLOCK_COLORS[h]
}
