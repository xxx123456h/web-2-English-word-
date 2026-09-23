// src/components/CheckinCalendar.jsx
// 打卡日历组件 - 复用现有 streak-grid CSS 类

import { useState } from 'react';

const Stat = ({ icon, label, value }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 18 }}>{icon}</div>
    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--warm-600)' }}>{value}</div>
    <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</div>
  </div>
);

const navBtnStyle = {
  background: 'var(--warm-50)', border: '1.5px solid var(--warm-200)',
  borderRadius: 10, width: 32, height: 32, cursor: 'pointer',
  fontWeight: 700, fontSize: 14, color: 'var(--warm-600)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontFamily: 'inherit',
};

export default function CheckinCalendar({ checkinMap, currentStreak, todayChecked }) {
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const { year, month } = viewMonth;
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月',
                       '七月', '八月', '九月', '十月', '十一月', '十二月'];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const today = new Date().toISOString().split('T')[0];

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const getDateStr = (d) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const prevMonth = () => {
    setViewMonth(prev => prev.month === 0
      ? { year: prev.year - 1, month: 11 }
      : { ...prev, month: prev.month - 1 });
  };
  const nextMonth = () => {
    setViewMonth(prev => prev.month === 11
      ? { year: prev.year + 1, month: 0 }
      : { ...prev, month: prev.month + 1 });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={prevMonth} style={navBtnStyle}>←</button>
        <span style={{ fontWeight: 800, fontSize: 16 }}>{year}年 {monthNames[month]}</span>
        <button onClick={nextMonth} style={navBtnStyle}>→</button>
      </div>

      <div className="streak-grid" style={{ marginBottom: 4 }}>
        {['一', '二', '三', '四', '五', '六', '日'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-light)' }}>{d}</div>
        ))}
      </div>

      <div className="streak-grid">
        {cells.map((d, i) => {
          if (!d) return <div key={`empty-${i}`} />;
          const dateStr = getDateStr(d);
          const isToday = dateStr === today;
          const isDone = !!checkinMap[dateStr];
          const isFuture = dateStr > today;

          let className = 'streak-day';
          if (isDone) className += ' done';
          else if (isToday) className += ' today';
          else if (isFuture) className += ' future';

          return (
            <div key={d} className={className}>
              {isDone ? '✓' : d}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 14 }}>
        <Stat icon="🔥" label="连续打卡" value={`${currentStreak} 天`} />
        <Stat icon={todayChecked ? "✅" : "⬜"} label="今日" value={todayChecked ? "已打卡" : "未打卡"} />
      </div>
    </div>
  );
}
