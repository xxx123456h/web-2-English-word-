// src/pages/CheckinPage.jsx
// 打卡日历页
import { useState } from 'react';
import { useCheckin } from '../hooks/useCheckin';
import CheckinCalendar from '../components/CheckinCalendar';
import { useDailyRating } from '../hooks/useDailyRating';
import RatingBadge from '../components/RatingBadge';

export default function CheckinPage({ setActivePage }) {
  const { checkinMap, currentStreak, todayChecked, totalDays, doCheckin, loading } = useCheckin();
  const { rating, feedback, recordLearn, refetch: refetchRating } = useDailyRating();
  const [learnCount, setLearnCount] = useState(0);
  const [checking, setChecking] = useState(false);

  const handleCheckin = async () => {
    if (todayChecked || checking) return;
    setChecking(true);
    await recordLearn(learnCount, false);
    const { error } = await doCheckin(learnCount);
    setChecking(false);
    if (error) {
      alert('打卡失败：' + (error.message || '请稍后重试'));
    } else {
      refetchRating();
    }
  };

  return (
    <div className="page-content" style={{ paddingTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => setActivePage && setActivePage('profile')}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--warm-600)', padding: 4 }}>
          ←
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--warm-700)', margin: 0 }}>打卡日历</h1>
      </div>

      {/* 评级徽章 */}
      {rating && (
        <div className="card" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <RatingBadge rating={rating} feedback={feedback} />
        </div>
      )}

      {/* 打卡按钮区 */}
      <div className="card" style={{ marginBottom: 12 }}>
        {todayChecked ? (
          <div style={{ textAlign: 'center', padding: 12 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green-500)', marginBottom: 4 }}>今日已打卡</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>继续保持！明天再来~</div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10 }}>
              今日学了 <input
                type="number"
                value={learnCount}
                onChange={e => setLearnCount(Math.max(0, parseInt(e.target.value) || 0))}
                style={{
                  width: 60, padding: '4px 8px', borderRadius: 8,
                  border: '1.5px solid var(--warm-200)', textAlign: 'center',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                  color: 'var(--warm-700)',
                }}
              /> 个新词
            </div>
            <button onClick={handleCheckin} className="btn-primary" disabled={checking}>
              {checking ? '打卡中...' : '✅ 今日打卡'}
            </button>
          </div>
        )}
      </div>

      {/* 日历 */}
      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)' }}>加载中...</div>
      ) : (
        <div className="card">
          <CheckinCalendar
            checkinMap={checkinMap}
            currentStreak={currentStreak}
            todayChecked={todayChecked}
          />
        </div>
      )}

      {/* 统计 */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 14 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--orange-400)' }}>🔥 {currentStreak}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>连续天数</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--warm-700)' }}>📅 {totalDays}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>累计天数</div>
        </div>
      </div>
    </div>
  );
}
