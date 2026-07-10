'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function ReviewPage() {
  const params = useParams();
  const code = params.code?.toUpperCase() || '';
  const [data, setData] = useState(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('apex_review');
      if (raw) setData(JSON.parse(raw));
    } catch {}
  }, []);

  if (!data) {
    return (
      <div className="app-wrapper">
        <div className="quiz-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 16, marginBottom: 20 }}>No review data found</div>
            <Link href={`/courses/${code.toLowerCase()}`} className="btn-restart" style={{ textDecoration: 'none', padding: '12px 32px' }}>
              Back to Course
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { answers, questions } = data;
  const correctCount = answers.filter(a => a.isCorrect).length;
  const total = answers.length;
  const pct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  return (
    <div className="app-wrapper">
      <div className="quiz-container" style={{ minHeight: '100vh', paddingBottom: 40 }}>
        <div className="top-bar">
          <Link href={`/courses/${code.toLowerCase()}/quiz`} className="back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div className="screen-title-center">Answer Review</div>
          <div className="back-btn" style={{ background: 'none' }}></div>
        </div>

        <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
          <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            {code} · {correctCount}/{total} ({pct}%)
          </div>
        </div>

        <div style={{ padding: '0 4px' }}>
          {answers.map((a, i) => {
            const q = questions[i];
            if (!q) return null;
            const optKeys = Object.keys(q.options);
            return (
              <div key={i} style={{
                background: i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
                borderRadius: 14, padding: '16px 14px', marginBottom: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{
                    minWidth: 28, height: 28, borderRadius: '50%',
                    background: a.isCorrect ? 'rgba(52,199,89,0.15)' : 'rgba(255,59,48,0.15)',
                    color: a.isCorrect ? 'var(--success-green)' : 'var(--error-red)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700,
                  }}>
                    {a.isCorrect ? '✓' : '✗'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, lineHeight: 1.5, color: 'var(--text-dark)' }}>
                      Q{i + 1}. {q.question}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {optKeys.map((k) => {
                        let bg = 'transparent';
                        let border = '1px solid rgba(255,255,255,0.08)';
                        if (k === a.correctKey) {
                          bg = 'rgba(52,199,89,0.12)';
                          border = '1px solid rgba(52,199,89,0.3)';
                        } else if (k === a.selected && !a.isCorrect) {
                          bg = 'rgba(255,59,48,0.12)';
                          border = '1px solid rgba(255,59,48,0.3)';
                        }
                        return (
                          <div key={k} style={{
                            background: bg, border, borderRadius: 10,
                            padding: '8px 12px', fontSize: 13, lineHeight: 1.5, color: 'var(--text-dark)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          }}>
                            <span>
                              <strong>{k.toUpperCase()}.</strong> {q.options[k]}
                            </span>
                            <span style={{ fontSize: 14 }}>
                              {k === a.correctKey ? '✓' : k === a.selected && !a.isCorrect ? '✗' : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && (
                      <div style={{
                        marginTop: 10, fontSize: 13, color: 'var(--text-muted)',
                        background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px',
                        borderLeft: '3px solid var(--primary-orange)',
                      }}>
                        <strong>Explanation: </strong>{q.explanation}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link href={`/courses/${code.toLowerCase()}/quiz`} className="btn-next" style={{ textDecoration: 'none', display: 'inline-block', padding: '12px 36px' }}>
            Back to Results
          </Link>
        </div>
      </div>
    </div>
  );
}
