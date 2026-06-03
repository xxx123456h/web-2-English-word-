// src/components/PronounceButton.jsx
import { useState } from 'react';
import { speak } from '../lib/services/pronunciation';

const SpeakerIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
);

export const PronounceButton = ({ word, accent = 'us', size = 20 }) => {
  const [playing, setPlaying] = useState(false);

  const handlePlay = (e) => {
    e.stopPropagation();
    setPlaying(true);
    speak(word, accent);
    setTimeout(() => setPlaying(false), 1000);
  };

  return (
    <button onClick={handlePlay} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      color: playing ? 'var(--orange-500)' : 'var(--warm-500)',
      transform: playing ? 'scale(1.2)' : 'scale(1)',
      transition: 'all 0.2s',
      display: 'inline-flex', alignItems: 'center', padding: 4,
    }}>
      <SpeakerIcon size={size} />
    </button>
  );
};
