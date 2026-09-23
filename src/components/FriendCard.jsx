// src/components/FriendCard.jsx
// 好友/搜索结果 卡片

const gradeLabels = {
  junior: '初中', high_school: '高中', cet4: '四级',
  cet6: '六级', ielts: '雅思', other: '其他',
};

export default function FriendCard({ user, status, onAction, actionLabel, actionVariant = 'primary' }) {
  const avatar = user.avatar_url ? (
    <img src={user.avatar_url} alt={user.nickname}
      style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
  ) : (
    <div style={{
      width: 44, height: 44, borderRadius: '50%',
      background: 'linear-gradient(135deg, var(--warm-300), var(--orange-400))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontSize: 18, fontWeight: 800,
    }}>
      {(user.nickname || '?')[0].toUpperCase()}
    </div>
  );

  const btnBg = actionVariant === 'danger' ? 'var(--coral-50)' : 'var(--warm-50)';
  const btnColor = actionVariant === 'danger' ? '#EF4444' : 'var(--warm-600)';
  const btnBorder = actionVariant === 'danger' ? '#FECACA' : 'var(--warm-200)';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', borderRadius: 14, background: 'white',
      border: '1px solid var(--warm-100)', marginBottom: 8,
    }}>
      {avatar}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
          {user.nickname || '匿名用户'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
          {status || (user.grade_level ? gradeLabels[user.grade_level] : 'WordWise 用户')}
        </div>
      </div>
      {onAction && (
        <button onClick={() => onAction(user)} style={{
          background: btnBg, color: btnColor,
          border: `1.5px solid ${btnBorder}`, borderRadius: 20,
          padding: '6px 14px', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
