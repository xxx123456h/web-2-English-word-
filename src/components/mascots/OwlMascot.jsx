// src/components/mascots/OwlMascot.jsx
// 猫头鹰吉祥物（与原 App.jsx 内嵌版本保持一致）

export default function OwlMascot({ size = 80, mood = 'happy', className = '' }) {
  const moods = {
    happy: { eyeY: 0, mouthPath: 'M-6,4 Q0,10 6,4', blush: true },
    thinking: { eyeY: -2, mouthPath: 'M-4,6 Q0,6 4,6', blush: false },
    celebrate: { eyeY: -3, mouthPath: 'M-8,2 Q0,12 8,2', blush: true },
    sad: { eyeY: 2, mouthPath: 'M-5,8 Q0,4 5,8', blush: false },
    wink: { eyeY: 0, mouthPath: 'M-6,4 Q0,10 6,4', blush: true },
  };
  const m = moods[mood] || moods.happy;
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" className={className}>
      <ellipse cx="0" cy="10" rx="32" ry="35" fill="#FBBF24" />
      <ellipse cx="0" cy="14" rx="24" ry="22" fill="#FEF3C7" />
      <polygon points="-28,-20 -18,-42 -8,-18" fill="#F59E0B" />
      <polygon points="28,-20 18,-42 8,-18" fill="#F59E0B" />
      <circle cx="-12" cy={-4 + m.eyeY} r="10" fill="white" />
      <circle cx="12" cy={-4 + m.eyeY} r="10" fill="white" />
      {mood === 'wink' ? (
        <>
          <circle cx="-12" cy={-4 + m.eyeY} r="5" fill="#1F2937" />
          <path d="M7,-4 Q12,-8 17,-4" stroke="#1F2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="-12" cy={-4 + m.eyeY} r="5" fill="#1F2937" />
          <circle cx="12" cy={-4 + m.eyeY} r="5" fill="#1F2937" />
          <circle cx="-10" cy={-6 + m.eyeY} r="2" fill="white" />
          <circle cx="14" cy={-6 + m.eyeY} r="2" fill="white" />
        </>
      )}
      <polygon points="-5,4 0,12 5,4" fill="#FB923C" />
      <path d={m.mouthPath} stroke="#92400E" strokeWidth="1.5" fill="none" strokeLinecap="round" transform="translate(0,10)" />
      {m.blush && (
        <>
          <ellipse cx="-22" cy="4" rx="6" ry="4" fill="#FECACA" opacity="0.6" />
          <ellipse cx="22" cy="4" rx="6" ry="4" fill="#FECACA" opacity="0.6" />
        </>
      )}
      <ellipse cx="-30" cy="12" rx="10" ry="18" fill="#F59E0B" transform="rotate(15,-30,12)" />
      <ellipse cx="30" cy="12" rx="10" ry="18" fill="#F59E0B" transform="rotate(-15,30,12)" />
      <ellipse cx="-10" cy="44" rx="8" ry="4" fill="#FB923C" />
      <ellipse cx="10" cy="44" rx="8" ry="4" fill="#FB923C" />
      {mood === 'celebrate' && (
        <g transform="translate(0,-38)">
          <rect x="-16" y="-4" width="32" height="4" rx="1" fill="#1F2937" />
          <rect x="-8" y="-12" width="16" height="10" rx="2" fill="#1F2937" />
          <circle cx="0" cy="-12" r="3" fill="#FBBF24" />
          <line x1="16" y1="-2" x2="22" y2="6" stroke="#FBBF24" strokeWidth="1.5" />
          <circle cx="22" cy="7" r="2" fill="#FBBF24" />
        </g>
      )}
    </svg>
  );
}
