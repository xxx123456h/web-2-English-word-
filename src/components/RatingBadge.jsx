// src/components/RatingBadge.jsx
// 评级展示徽章 - 用于 HomePage Welcome Card
//
// 用法: <RatingBadge rating={rating} feedback={feedback} />

export default function RatingBadge({ rating, feedback, showFeedback = true }) {
  if (!rating) return null;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: '6px 14px', borderRadius: 20,
      background: rating.gradient, color: 'white',
      fontSize: 13, fontWeight: 800,
      boxShadow: `0 2px 8px ${rating.color}40`
    }}>
      <span>{rating.emoji}</span>
      <span>{rating.label}</span>
      {showFeedback && feedback && (
        <span style={{ fontSize: 11, opacity: 0.9, marginLeft: 4 }}>
          — {feedback}
        </span>
      )}
    </div>
  );
}
