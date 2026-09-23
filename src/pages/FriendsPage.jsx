// src/pages/FriendsPage.jsx
// 好友 & 排行榜页
import { useState } from 'react';
import { useFriends } from '../hooks/useFriends';
import { useAuth } from '../hooks/useAuth';
import FriendCard from '../components/FriendCard';
import Leaderboard from '../components/Leaderboard';

const TABS = [
  { key: 'friends', label: '好友' },
  { key: 'leaderboard', label: '排行榜' },
];

const RANK_TYPES = [
  { key: 'accuracy', label: '正确率' },
  { key: 'words', label: '单词数' },
  { key: 'streak', label: '打卡天数' },
];

export default function FriendsPage({ setActivePage }) {
  const { user } = useAuth();
  const {
    friends, pendingRequests, sentRequests, loading,
    searchUser, sendRequest, respondRequest, removeFriend,
  } = useFriends();

  const [tab, setTab] = useState('friends');
  const [rankType, setRankType] = useState('accuracy');
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = async () => {
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }
    const results = await searchUser(keyword);
    setSearchResults(results);
  };

  const handleAdd = async (u) => {
    await sendRequest(u.id);
    setSearchResults((prev) => prev.filter(x => x.id !== u.id));
  };

  return (
    <div className="page-content" style={{ paddingTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => setActivePage && setActivePage('profile')}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--warm-600)', padding: 4 }}>
          ←
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--warm-700)', margin: 0 }}>好友 & 排行榜</h1>
      </div>

      {/* Tab 切换 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '10px 0', borderRadius: 20,
            border: tab === t.key ? '2px solid var(--warm-400)' : '2px solid var(--warm-200)',
            background: tab === t.key ? 'var(--warm-100)' : 'white',
            color: tab === t.key ? 'var(--warm-700)' : 'var(--text-secondary)',
            fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {t.label}
            {t.key === 'friends' && pendingRequests.length > 0 && (
              <span style={{
                marginLeft: 6, background: '#EF4444', color: 'white',
                borderRadius: 10, padding: '0 6px', fontSize: 11, fontWeight: 800,
              }}>{pendingRequests.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'friends' && (
        <>
          {/* 待处理请求 */}
          {pendingRequests.length > 0 && (
            <>
              <div className="section-title">🔔 待处理请求 ({pendingRequests.length})</div>
              {pendingRequests.map(req => (
                <FriendCard
                  key={req.id}
                  user={req.requester}
                  status="请求添加你为好友"
                  actionVariant="primary"
                  actionLabel="接受"
                  onAction={async () => { await respondRequest(req.id, true) }}
                />
              ))}
            </>
          )}

          {/* 已发送请求 */}
          {sentRequests.length > 0 && (
            <>
              <div className="section-title">⏳ 已发送请求 ({sentRequests.length})</div>
              {sentRequests.map(req => (
                <FriendCard
                  key={req.id}
                  user={req.addressee}
                  status="等待对方接受"
                  actionLabel="取消"
                  onAction={async () => { await removeFriend(req.id) }}
                />
              ))}
            </>
          )}

          {/* 搜索 */}
          <div className="section-title">🔍 添加好友</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="输入昵称搜索..."
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 20,
                border: '2px solid var(--warm-200)', fontSize: 14,
                fontFamily: 'inherit', outline: 'none',
              }}
            />
            <button onClick={handleSearch} className="btn-primary" style={{ width: 80, padding: '10px 0' }}>搜索</button>
          </div>

          {/* 搜索结果 */}
          {searchResults.length > 0 && (
            <div className="card" style={{ padding: 0 }}>
              {searchResults.map(u => (
                <FriendCard
                  key={u.id}
                  user={u}
                  actionLabel="添加"
                  actionVariant="primary"
                  onAction={() => handleAdd(u)}
                />
              ))}
            </div>
          )}

          {/* 好友列表 */}
          <div className="section-title">👥 我的好友 ({friends.length})</div>
          {loading ? (
            <div className="card" style={{ textAlign: 'center', padding: 30, color: 'var(--text-secondary)' }}>加载中...</div>
          ) : friends.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 30 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>👋</div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>还没有好友，快去添加吧~</div>
            </div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              {friends.map(f => (
                <FriendCard
                  key={f.id}
                  user={f}
                  actionLabel="删除"
                  actionVariant="danger"
                  onAction={() => {
                    if (confirm(`确定删除好友 ${f.nickname || '匿名'} 吗？`)) {
                      // 这里需要传 friendshipId，简化处理：通过 sender 查
                      removeFriend(f.id)
                    }
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'leaderboard' && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {RANK_TYPES.map(t => (
              <button key={t.key} onClick={() => setRankType(t.key)} style={{
                flex: 1, padding: '8px 0', borderRadius: 16,
                border: rankType === t.key ? '2px solid var(--warm-400)' : '2px solid var(--warm-200)',
                background: rankType === t.key ? 'var(--warm-100)' : 'white',
                color: rankType === t.key ? 'var(--warm-700)' : 'var(--text-secondary)',
                fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {t.label}
              </button>
            ))}
          </div>
          <Leaderboard friends={friends} currentUserId={user?.id} type={rankType} />
        </>
      )}
    </div>
  );
}
