// src/components/mascots/PandaMascot.jsx
// 小熊猫吉祥物

export default function PandaMascot({ size = 80, mood = 'happy', className = '' }) {
  const moods = {
    happy:     { eyeY: 0, mouthD: 'M-5,4 Q0,8 5,4', blush: true },
    thinking:  { eyeY: -2, mouthD: 'M-3,6 Q0,5 3,6', blush: false },
    celebrate: { eyeY: -3, mouthD: 'M-7,2 Q0,10 7,2', blush: true },
    sad:       { eyeY: 2, mouthD: 'M-4,7 Q0,3 4,7', blush: false },
    wink:      { eyeY: 0, mouthD: 'M-5,4 Q0,8 5,4', blush: true },
  };
  const m = moods[mood] || moods.happy;

  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" className={className}>
      {/* 黑色耳朵 */}
      <ellipse cx="-22" cy="-25" rx="9" ry="10" fill="#1F2937" />
      <ellipse cx="22" cy="-25" rx="9" ry="10" fill="#1F2937" />

      {/* 身体 - 身体左右晃 */}
      <g>
        <animateTransform attributeName="transform" type="rotate"
          values="-2,0,8; 2,0,8; -2,0,8" dur="3s" repeatCount="indefinite" />
        {/* 头（白色） */}
        <ellipse cx="0" cy="6" rx="32" ry="30" fill="#FFFFFF" />
        {/* 身体（白色椭圆） */}
        <ellipse cx="0" cy="10" rx="26" ry="28" fill="#FFFFFF" />
      </g>

      {/* 黑色眼罩 */}
      <ellipse cx="-12" cy={-2 + m.eyeY} rx="9" ry="11" fill="#1F2937"
        transform="rotate(-15, -12, -2)" />
      <ellipse cx="12" cy={-2 + m.eyeY} rx="9" ry="11" fill="#1F2937"
        transform="rotate(15, 12, -2)" />

      {/* 眼睛高光 */}
      <circle cx="-12" cy={-2 + m.eyeY} r="4" fill="white" />
      <circle cx="12" cy={-2 + m.eyeY} r="4" fill="white" />
      <circle cx="-11" cy={-3 + m.eyeY} r="1.5" fill="white" />
        <circle cx="13" cy={-3 + m.eyeY} r="1.5" fill="white" />

      {/* 鼻子 */}
      <ellipse cx="0" cy="6" rx="4" ry="3" fill="#1F2937" />

      {/* 嘴巴 */}
      <path d={m.mouthD} stroke="#1F2937" strokeWidth="1.5"
        fill="none" strokeLinecap="round" transform="translate(0,8)" />

      {/* 腮红 */}
      {m.blush && (
        <>
          <ellipse cx="-22" cy="6" rx="5" ry="3" fill="#FBCFE8" opacity="0.6" />
          <ellipse cx="22" cy="6" rx="5" ry="3" fill="#FBCFE8" opacity="0.6" />
        </>
      )}

      {/* 黑色胳膊 */}
      <ellipse cx="-28" cy="14" rx="8" ry="14" fill="#1F2937" transform="rotate(10,-28,14)" />
      <ellipse cx="28" cy="14" rx="8" ry="14" fill="#1F2937" transform="rotate(-10,28,14)" />

      {/* 脚 */}
      <ellipse cx="-12" cy="42" rx="8" ry="4" fill="#1F2937" />
      <ellipse cx="12" cy="42" rx="8" ry="4" fill="#1F2937" />

      {/* 竹叶装饰 */}
      {mood === 'celebrate' && (
        <g>
          <ellipse cx="-30" cy="-10" rx="3" ry="10" fill="#34D399" transform="rotate(-20, -30, -10)" />
          <ellipse cx="30" cy="-10" rx="3" ry="10" fill="#34D399" transform="rotate(20, 30, -10)" />
        </g>
      )}
    </svg>
  );
}
