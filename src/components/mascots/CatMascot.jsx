// src/components/mascots/CatMascot.jsx
// 小猫咪吉祥物

export default function CatMascot({ size = 80, mood = 'happy', className = '' }) {
  const moods = {
    happy:     { eyeY: 0, mouthD: 'M-5,4 Q0,9 5,4', blush: true, eyeH: 9 },
    thinking:  { eyeY: -2, mouthD: 'M-3,6 Q0,5 3,6', blush: false, eyeH: 6 },
    celebrate: { eyeY: -3, mouthD: 'M-7,2 Q0,11 7,2', blush: true, eyeH: 7 },
    sad:       { eyeY: 2, mouthD: 'M-4,7 Q0,3 4,7', blush: false, eyeH: 6 },
    wink:      { eyeY: 0, mouthD: 'M-5,4 Q0,9 5,4', blush: true, eyeH: 1 },
  };
  const m = moods[mood] || moods.happy;

  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" className={className}>
      {/* 尖耳朵 */}
      <polygon points="-25,-22 -18,-42 -8,-22" fill="#60A5FA" />
      <polygon points="-22,-24 -17,-38 -11,-24" fill="#DBEAFE" />
      <polygon points="25,-22 18,-42 8,-22" fill="#60A5FA" />
      <polygon points="22,-24 17,-38 11,-24" fill="#DBEAFE" />

      {/* 身体 */}
      <ellipse cx="0" cy="10" rx="30" ry="32" fill="#60A5FA" />
      <ellipse cx="0" cy="16" rx="20" ry="20" fill="#EFF6FF" />

      {/* 卷尾巴 - 摆动 */}
      <path d="M 25,15 Q 38,5 35,-10" stroke="#60A5FA" strokeWidth="6" fill="none" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate"
          values="-5,30,15; 5,30,15; -5,30,15" dur="2s" repeatCount="indefinite" />
      </path>

      {/* 眼睛（眯眼/普通） */}
      {mood === 'happy' || mood === 'wink' ? (
        <>
          <path d={`M -16,${-4 + m.eyeY} q 6,${m.eyeH} 12,0`} stroke="#1F2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d={`M 4,${-4 + m.eyeY} q 6,${m.eyeH} 12,0`} stroke="#1F2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <ellipse cx="-10" cy={-4 + m.eyeY} rx="5" ry="7" fill="white" />
          <ellipse cx="10" cy={-4 + m.eyeY} rx="5" ry="7" fill="white" />
          <ellipse cx="-10" cy={-3 + m.eyeY} rx="2" ry="5" fill="#1F2937" />
          <ellipse cx="10" cy={-3 + m.eyeY} rx="2" ry="5" fill="#1F2937" />
        </>
      )}

      {/* 鼻子（粉色三角） */}
      <polygon points="-3,5 0,9 3,5" fill="#F472B6" />

      {/* 嘴巴 */}
      <path d={m.mouthD} stroke="#1E40AF" strokeWidth="1.5"
        fill="none" strokeLinecap="round" transform="translate(0,8)" />

      {/* 胡须 */}
      <line x1="-20" y1="6" x2="-30" y2="4" stroke="#1F2937" strokeWidth="0.8" />
      <line x1="-20" y1="10" x2="-30" y2="11" stroke="#1F2937" strokeWidth="0.8" />
      <line x1="20" y1="6" x2="30" y2="4" stroke="#1F2937" strokeWidth="0.8" />
      <line x1="20" y1="10" x2="30" y2="11" stroke="#1F2937" strokeWidth="0.8" />

      {/* 腮红 */}
      {m.blush && (
        <>
          <ellipse cx="-22" cy="6" rx="5" ry="3" fill="#FBA8D4" opacity="0.5" />
          <ellipse cx="22" cy="6" rx="5" ry="3" fill="#FBA8D4" opacity="0.5" />
        </>
      )}

      {/* 脚 */}
      <ellipse cx="-10" cy="43" rx="8" ry="4" fill="#60A5FA" />
      <ellipse cx="10" cy="43" rx="8" ry="4" fill="#60A5FA" />

      {/* 庆祝星星 */}
      {mood === 'celebrate' && (
        <g>
          <polygon points="-30,-25 -28,-20 -23,-20 -27,-17 -25,-12 -30,-15 -35,-12 -33,-17 -37,-20 -32,-20"
            fill="#FCD34D" />
          <polygon points="30,-25 32,-20 37,-20 33,-17 35,-12 30,-15 25,-12 27,-17 23,-20 28,-20"
            fill="#FCD34D" />
        </g>
      )}
    </svg>
  );
}
