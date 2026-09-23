// src/components/mascots/FoxMascot.jsx
// 小狐狸吉祥物

export default function FoxMascot({ size = 80, mood = 'happy', className = '' }) {
  const moods = {
    happy:     { eyeY: 0, mouthD: 'M-6,4 Q0,10 6,4', blush: true },
    thinking:  { eyeY: -2, mouthD: 'M-4,6 Q0,6 4,6', blush: false },
    celebrate: { eyeY: -3, mouthD: 'M-8,2 Q0,12 8,2', blush: true },
    sad:       { eyeY: 2, mouthD: 'M-5,8 Q0,4 5,8', blush: false },
    wink:      { eyeY: 0, mouthD: 'M-6,4 Q0,10 6,4', blush: true },
  };
  const m = moods[mood] || moods.happy;

  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" className={className}>
      {/* 大尾巴 - 摇摆动画 */}
      <ellipse cx="26" cy="30" rx="22" ry="14" fill="#F97066"
        transform="rotate(-30, 26, 30)" opacity="0.8">
        <animateTransform attributeName="transform" type="rotate"
          values="-30,26,30; -20,26,30; -30,26,30" dur="2s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx="32" cy="28" rx="10" ry="7" fill="white"
        transform="rotate(-30, 32, 28)" />

      {/* 身体 */}
      <ellipse cx="0" cy="12" rx="28" ry="32" fill="#F97066" />
      <ellipse cx="0" cy="18" rx="20" ry="20" fill="#FFF5F5" />

      {/* 耳朵 */}
      <polygon points="-24,-26 -14,-48 -4,-24" fill="#F97066" />
      <polygon points="24,-26 14,-48 4,-24" fill="#F97066" />
      <polygon points="-20,-28 -14,-42 -8,-26" fill="#FFF5F5" />
      <polygon points="20,-28 14,-42 8,-26" fill="#FFF5F5" />

      {/* 眼睛 */}
      <ellipse cx="-11" cy={-4 + m.eyeY} rx="8" ry="9" fill="white" />
      <ellipse cx="11" cy={-4 + m.eyeY} rx="8" ry="9" fill="white" />
      <circle cx="-11" cy={-3 + m.eyeY} r="4.5" fill="#1F2937" />
      <circle cx="11" cy={-3 + m.eyeY} r="4.5" fill="#1F2937" />
      <circle cx="-9" cy={-5 + m.eyeY} r="1.8" fill="white" />
      <circle cx="13" cy={-5 + m.eyeY} r="1.8" fill="white" />

      {/* 鼻子 */}
      <ellipse cx="0" cy="6" rx="4" ry="3" fill="#1F2937" />

      {/* 嘴巴 */}
      <path d={m.mouthD} stroke="#991B1B" strokeWidth="1.5"
        fill="none" strokeLinecap="round" transform="translate(0,8)" />

      {/* 腮红 */}
      {m.blush && (
        <>
          <ellipse cx="-20" cy="4" rx="6" ry="3.5" fill="#FFB3B3" opacity="0.5" />
          <ellipse cx="20" cy="4" rx="6" ry="3.5" fill="#FFB3B3" opacity="0.5" />
        </>
      )}

      {/* 小爪子 - 挥动动画 */}
      <g>
        <animateTransform attributeName="transform" type="rotate"
          values="0,0,12; -10,0,12; 0,0,12" dur="1.5s" repeatCount="indefinite" />
        <ellipse cx="-24" cy="14" rx="8" ry="14" fill="#F97066" transform="rotate(12,-24,14)" />
      </g>
      <ellipse cx="24" cy="14" rx="8" ry="14" fill="#F97066" transform="rotate(-12,24,14)" />

      {/* 脚 */}
      <ellipse cx="-10" cy="43" rx="7" ry="3.5" fill="#F97066" />
      <ellipse cx="10" cy="43" rx="7" ry="3.5" fill="#F97066" />

      {/* 庆祝帽子 */}
      {mood === 'celebrate' && (
        <g transform="translate(0,-40)">
          <polygon points="-10,0 0,-18 10,0" fill="#F97066" />
          <circle cx="0" cy="-18" r="3" fill="#FBBF24" />
          <rect x="-12" y="-2" width="24" height="4" rx="2" fill="#991B1B" />
        </g>
      )}
    </svg>
  );
}
