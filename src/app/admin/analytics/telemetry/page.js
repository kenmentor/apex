'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { isAdmin } from '@/lib/auth'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function TelemetryPage() {
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isAdmin()) { router.push('/auth'); return }
    fetch('/api/analytics/telemetry')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (!data && loading) return <div className="loading">Loading...</div>

  if (!data || (!data.friction?.length && !data.exhaustion?.length && !data.distractors?.length && !data.engagement?.length)) {
    return (
      <div className="page">
        <div className="page-inner">
          <div className="page-header">
            <div className="page-header-block">
              <Link href="/admin/analytics" className="page-back">← Analytics</Link>
              <h1 className="page-title">Telemetry</h1>
            </div>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
            No telemetry data yet. Take a quiz to generate metrics.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="page-inner">
        <div className="page-header">
          <div className="page-header-block">
            <Link href="/admin/analytics" className="page-back">← Analytics</Link>
            <h1 className="page-title">Telemetry</h1>
          </div>
        </div>

        {/* ── 1. Question Friction Index ── */}
        {data.friction?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Question Friction Index (Fq)</div>
            </div>
            <div style={{ width: '100%', height: Math.min(data.friction.length * 36, 300) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.friction} layout="vertical" margin={{ left: 100 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="question_id" tick={{ fontSize: 9 }} width={90} />
                  <Tooltip formatter={(val, name) => [val, name === 'frictionIndex' ? 'Friction' : name === 'correctRate' ? 'Correct Rate' : 'Avg Time (s)']} />
                  <Bar dataKey="frictionIndex" fill="var(--orange)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="list" style={{ marginTop: 12 }}>
              {data.friction.slice(0, 10).map((q) => (
                <div key={q.question_id} className="list-item">
                  <span className="list-name" style={{ fontFamily: 'monospace', fontSize: 11 }}>{q.question_id}</span>
                  <span className="list-stat" style={{ color: 'var(--orange)' }}>Fq: {q.frictionIndex}</span>
                  <span className="list-sub">Acc: {Math.round(q.correctRate * 100)}%</span>
                  <span className="list-sub">Avg: {q.avgTimeSec}s</span>
                  <span className="list-sub">{q.totalAttempts} attempts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 2. Quiz Exhaustion Point ── */}
        {data.exhaustion?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Quiz Exhaustion Point</div>
            </div>
            <div style={{ width: '100%', height: Math.min(data.exhaustion.length * 40, 300) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.exhaustion} layout="vertical" margin={{ left: 100 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} domain={[0, 1]} />
                  <YAxis type="category" dataKey="quiz_id" tick={{ fontSize: 9 }} width={90} />
                  <Tooltip formatter={(val) => `${Math.round(val * 100)}%`} />
                  <Bar dataKey="dropoutRate" fill="var(--red)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="list" style={{ marginTop: 12 }}>
              {data.exhaustion.slice(0, 10).map((q) => (
                <div key={q.quiz_id} className="list-item">
                  <span className="list-name" style={{ fontFamily: 'monospace', fontSize: 11 }}>{q.quiz_id}</span>
                  <span className="list-stat" style={{ color: 'var(--red)' }}>Drop: {Math.round(q.dropoutRate * 100)}%</span>
                  <span className="list-sub">Avg step: {q.avgLastStep}/{q.totalSteps}</span>
                  <span className="list-sub">{q.sessions} sessions</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 3. Option Distractor Efficiency ── */}
        {data.distractors?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Option Distractor Efficiency</div>
            </div>
            <div className="list">
              {data.distractors.slice(0, 20).map((d) => {
                const total = d.options.reduce((s, o) => s + o.count, 0)
                return (
                  <div key={d.question_id} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4, padding: '12px' }}>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-secondary)', marginBottom: 4 }}>{d.question_id}</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {d.options.map((o) => {
                        const pct = Math.round((o.count / total) * 100)
                        const isTop = o.index === d.options[0].index
                        return (
                          <div key={o.index} style={{
                            flex: 1, padding: '6px 8px', borderRadius: 6,
                            background: isTop ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 59, 48, 0.08)',
                            textAlign: 'center', fontSize: 12,
                          }}>
                            <div style={{ fontWeight: 700, color: isTop ? 'var(--green)' : 'var(--text)' }}>{String.fromCharCode(65 + o.index)}</div>
                            <div style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{pct}% ({o.count})</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 4. Explanation Engagement ── */}
        {data.engagement?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Explanation Engagement</div>
            </div>
            <div style={{ width: '100%', height: Math.min(data.engagement.length * 36, 300) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.engagement} layout="vertical" margin={{ left: 100 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} unit="s" />
                  <YAxis type="category" dataKey="question_id" tick={{ fontSize: 9 }} width={90} />
                  <Tooltip formatter={(val) => `${val}s`} />
                  <Bar dataKey="avgDurationSec" fill="var(--blue)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="list" style={{ marginTop: 12 }}>
              {data.engagement.slice(0, 10).map((q) => (
                <div key={q.question_id} className="list-item">
                  <span className="list-name" style={{ fontFamily: 'monospace', fontSize: 11 }}>{q.question_id}</span>
                  <span className="list-stat" style={{ color: 'var(--blue)' }}>{q.avgDurationSec}s avg</span>
                  <span className="list-sub">{q.views} views</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 5. Zero-Result Queries ── */}
        {data.zeroResultQueries?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Zero-Result Queries</div>
            </div>
            <div className="list">
              {data.zeroResultQueries.map((q, i) => (
                <div key={i} className="list-item">
                  <span className="list-name" style={{ fontFamily: 'monospace', fontSize: 12, maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis' }}>"{q._id}"</span>
                  <span className="list-stat" style={{ color: 'var(--red)' }}>{q.count}×</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 6. Space Conversion Velocity ── */}
        {data.spaceConversion?.length > 0 && data.spaceConversion.some(s => s.impressions > 0 || s.joins > 0) && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Space Conversion Velocity</div>
            </div>
            <div style={{ width: '100%', height: Math.min(data.spaceConversion.filter(s => s.impressions > 0).length * 40, 300) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.spaceConversion.filter(s => s.impressions > 0)} layout="vertical" margin={{ left: 80 }}>
                  <XAxis type="number" tick={{ fontSize: 10 }} unit="%" />
                  <YAxis type="category" dataKey="space_id" tick={{ fontSize: 11 }} width={70} />
                  <Tooltip formatter={(val) => `${val}%`} />
                  <Bar dataKey="conversionRate" fill="var(--green)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="list" style={{ marginTop: 12 }}>
              {data.spaceConversion.filter(s => s.impressions > 0 || s.joins > 0).slice(0, 10).map((s) => (
                <div key={s.space_id} className="list-item">
                  <span className="list-name" style={{ fontSize: 12 }}>{s.space_id}</span>
                  <span className="list-stat" style={{ color: 'var(--green)' }}>{s.conversionRate}% conv</span>
                  <span className="list-sub">{s.joins} joins / {s.impressions} imps</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 7. Syllabus Deep-Dive Ratio ── */}
        {data.syllabusDeepDive?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Syllabus Deep-Dive Ratio</div>
            </div>
            <div className="list">
              {data.syllabusDeepDive.map((s) => (
                <div key={s.course_code} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4, padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span className="list-name" style={{ fontSize: 13 }}>{s.course_code}</span>
                    <span className="list-stat" style={{ color: 'var(--orange)' }}>{s.totalExpands} expands</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    {s.nodes.map((n) => (
                      <span key={n.topic_id} style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 10,
                        background: n.topic_id === 'notes' ? 'rgba(90, 200, 250, 0.15)' : n.topic_id === 'videos' ? 'rgba(255, 159, 67, 0.15)' : 'rgba(52, 199, 89, 0.15)',
                        color: n.topic_id === 'notes' ? 'var(--blue)' : n.topic_id === 'videos' ? 'var(--orange)' : 'var(--green)',
                      }}>
                        {n.topic_id}: {n.count}×
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 8. Rage Clicks ── */}
        {data.rageClicks?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Rage Clicks & Rapid Taps</div>
            </div>
            <div className="list">
              {data.rageClicks.map((r, i) => (
                <div key={i} className="list-item">
                  <span className="list-name" style={{ fontSize: 11, fontFamily: 'monospace', maxWidth: '50%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r._id}</span>
                  <span className="list-stat" style={{ color: 'var(--red)' }}>{r.count}×</span>
                  <span className="list-sub" style={{ fontSize: 9 }}>at {r.coords}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 9. API Roundtrip Latency ── */}
        {data.networkLatency?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">API Roundtrip Latency (≥1500ms)</div>
            </div>
            <div className="list">
              {data.networkLatency.map((n, i) => (
                <div key={i} className="list-item">
                  <span className="list-name" style={{ fontSize: 11, fontFamily: 'monospace', maxWidth: '40%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.endpoint_url}</span>
                  <span className="list-stat" style={{ color: n.avgDurationMs > 3000 ? 'var(--red)' : 'var(--orange)' }}>{n.avgDurationMs}ms avg</span>
                  <span className="list-sub">{n.maxDurationMs}ms peak</span>
                  <span className="list-sub">{n.count} reqs</span>
                  <span className="list-sub" style={{ fontSize: 9 }}>codes: {n.statuses.join(',')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 10. Validation Rejection Rate ── */}
        {data.validationFailures?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Validation Rejection Rate</div>
            </div>
            <div className="list">
              {data.validationFailures.map((v, i) => (
                <div key={i} className="list-item">
                  <span className="list-name" style={{ fontSize: 12 }}>{v._id.field}</span>
                  <span className="list-sub" style={{ textTransform: 'capitalize' }}>{v._id.rule}</span>
                  <span className="list-stat" style={{ color: 'var(--orange)' }}>{v.count}×</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 11. Context Extraction (Copying) ── */}
        {data.textCopying?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Context Extraction (Copying)</div>
            </div>
            <div className="list">
              {data.textCopying.map((t, i) => (
                <div key={i} className="list-item">
                  <span className="list-name" style={{ fontSize: 12, textTransform: 'capitalize' }}>{t.view_context.replace(/_/g, ' ')}</span>
                  <span className="list-stat" style={{ color: 'var(--blue)' }}>{t.count} copies</span>
                  <span className="list-sub">{t.avgLength} avg chars</span>
                  <span className="list-sub">{t.maxLength} max chars</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 12. Unhandled Runtime Crashes ── */}
        {data.runtimeCrashes?.length > 0 && (
          <div className="card">
            <div className="card-header">
              <div className="card-title">Unhandled Runtime Crashes</div>
            </div>
            <div className="list">
              {data.runtimeCrashes.map((c, i) => (
                <div key={i} className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4, padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span className="list-name" style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--red)', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c._id}</span>
                    <span className="list-stat" style={{ color: 'var(--red)' }}>{c.count}×</span>
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-secondary)', maxHeight: 40, overflow: 'hidden' }}>{c.stack || 'No stack'}</div>
                  <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>View: {c.activeView}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
