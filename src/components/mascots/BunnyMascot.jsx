// src/components/mascots/BunnyMascot.jsx
// 小兔子吉祥物

export default function BunnyMascot({ size = 80, mood = 'happy', className = '' }) {
  const moods = {
    happy:     { eyeY: 0, mouthD: 'M-5,4 Q0,9 5,4', blush: true },
    thinking:  { eyeY: -2, mouthD: 'M-4,6 Q0,6 4,6', blush: false },
    celebrate: { eyeY: -3, mouthD: 'M-7,2 Q0,11 7,2', blush: true },
    sad:       { eyeY: 2, mouthD: 'M-4,7 Q0,3 4,7', blush: false },
    wink:      { eyeY: 0, mouthD: 'M-5,4 Q0,9 5,4', blush: true },
  };
  const m = moods[mood] || moods.happy;

  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" className={className}>
      {/* 长耳朵 - 抖动动画 */}
      <g>
        <animateTransform attributeName="transform" type="rotate"
          values="-5,0,-30; 5,0,-30; -5,0,-30" dur="2.5s" repeatCount="indefinite" />
        <ellipse cx="-10" cy="-32" rx="6" ry="22" fill="#E9D5FF" />
        <ellipse cx="-10" cy="-30" rx="3" ry="18" fill="#F3E8FF" />
      </g>
      <g>
        <animateTransform attributeName="transform" type="rotate"
          values="5,0,-30; -5,0,-30; 5,0,-30" dur="2.5s" repeatCount="indefinite" />
        <ellipse cx="10" cy="-32" rx="6" ry="22" fill="#E9D5FF" />
        <ellipse cx="10" cy="-30" rx="3" ry="18" fill="#F3E8FF" />
      </g>

      {/* 身体 */}
      <ellipse cx="0" cy="8" rx="30" ry="32" fill="#FAF5FF" />
      <ellipse cx="0" cy="14" rx="20" ry="20" fill="#FFFFFF" />

      {/* 眼睛 */}
      <ellipse cx="-10" cy={-2 + m.eyeY} rx="7" ry="8" fill="white" />
      <ellipse cx="10" cy={-2 + m.eyeY} rx="7" ry="8" fill="white" />
      <circle cx="-10" cy={-1 + m.eyeY} r="4.5" fill="#1F2937" />
      <circle cx="10" cy={-1 + m.eyeY} r="4.5" fill="#1F2937" />
      <circle cx="-8" cy={-3 + m.eyeY} r="1.8" fill="white" />
      <circle cx="12" cy={-3 + m.eyeY} r="1.8" fill="white" />

      {/* 鼻子（小红三角） */}
      <ellipse cx="0" cy="6" rx="3" ry="2.5" fill="#EC4899" />

      {/* 嘴巴 */}
      <path d={m.mouthD} stroke="#5B21B6" strokeWidth="1.5"
        fill="none" strokeLinecap="round" transform="translate(0,8)" />

      {/* 腮红 */}
      {m.blush && (
        <>
          <ellipse cx="-20" cy="6" rx="6" ry="3.5" fill="#F9A8D4" opacity="0.5" />
          <ellipse cx="20" cy="6" rx="6" ry="3.5" fill="#F9A8D4" opacity="0.5" />
        </>
      )}

      {/* 小爪子 */}
      <ellipse cx="-22" cy="20" rx="7" ry="12" fill="#FAF5FF" transform="rotate(15,-22,20)" />
      <ellipse cx="22" cy="20" rx="7" ry="12" fill="#FAF5FF" transform="rotate(-15,22,20)" />

      {/* 脚 */}
      <ellipse cx="-10" cy="43" rx="9" ry="4" fill="#E9D5FF" />
      <ellipse cx="10" cy="43" rx="9" ry="4" fill="#E9D5FF" />
      <ellipse cx="-10" cy="43" rx="5" ry="2" fill="#C084FC" />
      <ellipse cx="10" cy="43" rx="5" ry="2" fill="#C084FC" />

      {/* 庆祝帽 */}
      {mood === 'celebrate' && (
        <g transform="translate(0,-40)">
          <polygon points="-10,0 0,-18 10,0" fill="#A78BFA" />
          <circle cx="0" cy="-18" r="3" fill="#FBCFE8" />
          <rect x="-12" y="-2" width="24" height="4" rx="2" fill="#7C3AED" />
        </g>
      )}
    </svg>
  );
}
