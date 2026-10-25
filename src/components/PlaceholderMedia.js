'use client';

import { Play, Image as ImageIcon, Mic, BookOpen } from 'lucide-react';

// Clearly-fake media stand-ins for UI review. Replace with real URLs later.
const STYLES = {
  video: 'from-slate-700 via-slate-900 to-black',
  image: 'from-indigo-500 via-purple-500 to-pink-500',
  audio: 'from-emerald-600 via-teal-700 to-slate-900',
  book: 'from-amber-500 via-orange-600 to-red-700',
};

const LABELS = { video: 'VIDEO', image: 'PICTURE', audio: 'AUDIO', book: 'BOOK' };

export default function PlaceholderMedia({ kind = 'image', label, duration }) {
  const Icon = kind === 'video' ? Play : kind === 'audio' ? Mic : kind === 'book' ? BookOpen : ImageIcon;
  return (
    <span className={`relative flex items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br ${STYLES[kind] || STYLES.image} ${kind === 'book' ? 'aspect-[3/2]' : 'aspect-video'} w-full`}>
      <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
        {label || LABELS[kind] || 'MEDIA'}
      </span>
      <Icon className="size-8 text-white/90" fill={kind === 'video' ? 'currentColor' : 'none'} />
      {kind === 'audio' && (
        <span className="absolute inset-x-8 bottom-3 flex h-6 items-end justify-center gap-0.5">
          {[10, 18, 8, 22, 14, 24, 11, 17, 9, 20, 13, 22, 10, 16, 12, 19, 8, 21, 14, 11].map((h, i) => (
            <span key={i} className="w-1 rounded-full bg-white/80" style={{ height: h }} />
          ))}
        </span>
      )}
      {duration && (
        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {duration}
        </span>
      )}
    </span>
  );
}
