'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import { FileText, PlayCircle, Star, Film, ClipboardList, MessageSquare, X } from 'lucide-react';

const SEGMENTS = [
  { key: 'quizzes', label: 'Quizzes', icon: <Star size={16} /> },
  { key: 'notes', label: 'Notes', icon: <FileText size={16} /> },
  { key: 'videos', label: 'Videos', icon: <PlayCircle size={16} /> },
];

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const paramCode = (params.code || '').toUpperCase().replace(/-/g, '');
  const formattedCode = paramCode.replace(/^([A-Z]+)(\d+)$/, '$1 $2');

  const [course, setCourse] = useState(null);
  const [questionCount, setQuestionCount] = useState(0);
  const [videos, setVideos] = useState([]);
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('quizzes');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackHover, setFeedbackHover] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const code = course?.code || formattedCode;
  const codeForUrl = code.toLowerCase().replace(/\s+/g, '');

  useEffect(() => {
    fetch(`/api/courses?limit=20`)
      .then((r) => r.json())
      .then((data) => {
        const docs = data.docs || [];
        const found = docs.find((c) => c.code.replace(/\s+/g, '').toUpperCase() === paramCode);
        if (found) {
          setCourse(found);
          setQuestionCount(found.questionCount || 0);
        }
        fetch(`/api/videos?course=${encodeURIComponent(formattedCode)}`)
          .then((r) => r.json())
          .then(setVideos)
          .catch(() => {});
        fetch(`/api/readings?course=${encodeURIComponent(formattedCode)}`)
          .then((r) => r.json())
          .then(setReadings)
          .catch(() => {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [paramCode, formattedCode]);

  function getYouTubeId(url) {
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
    return m ? m[1] : null;
  }

  if (loading) {
    return (
      <div className="app-wrapper">
        <div className="quiz-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 16 }}>Loading...</div>
        </div>
      </div>
    );
  }

  const renderFeed = () => {
    switch (activeTab) {
      case 'notes':
        return readings.length === 0 ? (
          <div className="feed-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            <FileText size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
            No notes yet for {code}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            {readings.map((r) => (
              <div key={r._id} className="feed-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: 'var(--text-dark)' }}>{r.title}</h2>
                <div className="reading-content" dangerouslySetInnerHTML={{ __html: r.content }} />
              </div>
            ))}
          </div>
        );

      case 'videos':
        return videos.length === 0 ? (
          <div className="feed-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
            <Film size={48} style={{ marginBottom: 16, opacity: 0.4 }} />
            No videos yet for {code}.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            {videos.map((v) => {
              const vid = getYouTubeId(v.url);
              return (
                <a key={v._id} href={v.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                  <div className="feed-card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {vid && (
                      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#000' }}>
                        <img src={`https://img.youtube.com/vi/${vid}/hqdefault.jpg`} alt={v.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="8,5 19,12 8,19"/></svg>
                          </div>
                        </div>
                      </div>
                    )}
                    <div style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-dark)', marginBottom: 2 }}>{v.title}</div>
                      {v.description && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.description}</div>}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        );

      case 'quizzes':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 8 }}>
            <div style={{
              background: `linear-gradient(135deg, ${course?.color || '#130f40'}, #2c2c54)`,
              borderRadius: 20, padding: 24, color: 'white', textAlign: 'center',
            }}>
              <ClipboardList size={36} style={{ marginBottom: 8 }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{code} Full Quiz</h3>
              <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 16 }}>{questionCount || 0} questions</p>
              {questionCount > 0 ? (
                <button
                  onClick={() => router.push(`/courses/${codeForUrl}/quiz`)}
                  className="btn-next"
                  style={{ width: 'auto', padding: '14px 32px', display: 'inline-block', fontSize: 15 }}
                >
                  Start Quiz
                </button>
              ) : (
                <div style={{ fontSize: 13, opacity: 0.6 }}>No questions available yet.</div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="app-wrapper">
      <div className="quiz-container">
        <div className="top-bar" style={{ marginBottom: 16 }}>
          <Link href="/courses" className="back-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-dark)' }}>{code}</div>
            {course?.title && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{course.title}</div>}
          </div>
          <div className="back-btn" style={{ background: 'none' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
        </div>

        <div className="segment-control-wrapper">
          {SEGMENTS.map((seg) => (
            <button
              key={seg.key}
              className={`segment-btn ${activeTab === seg.key ? 'active' : ''}`}
              onClick={() => setActiveTab(seg.key)}
            >
              <span>{seg.icon}</span> {seg.label}
            </button>
          ))}
        </div>

        <div className="resource-feed">
          {renderFeed()}
        </div>

        <NavBar active="/courses" />
      </div>
    </div>
  );
}
