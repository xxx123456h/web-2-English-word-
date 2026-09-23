// src/pages/ProfilePage.jsx
// 个人资料页 - 含 5 选 1 动漫头像 / 上传自定义头像 / 资料编辑 / 主题切换
import { useState, useRef } from 'react';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../hooks/useAuth';
import { useCheckin } from '../hooks/useCheckin';
import { useWords } from '../hooks/useWords';
import { supabase } from '../lib/supabase';
import { AvatarAssets, AVATAR_OPTIONS, renderAvatar, AVATAR_THEME_MAP } from '../components/AvatarAssets';
import ThemeSwitcher from '../components/ThemeSwitcher';
import { useTheme } from '../context/ThemeContext';
import ThemeAvatar from '../components/mascots/ThemeAvatar';

const gradeOptions = [
  { value: 'junior', label: '初中' },
  { value: 'high_school', label: '高中' },
  { value: 'cet4', label: '四级' },
  { value: 'cet6', label: '六级' },
  { value: 'ielts', label: '雅思' },
  { value: 'other', label: '其他' },
];

const genderOptions = [
  { value: 'male', label: '男', icon: '👨' },
  { value: 'female', label: '女', icon: '👩' },
  { value: 'unknown', label: '保密', icon: '🧑' },
];

export default function ProfilePage({ setActivePage }) {
  const { profile, loading, updateProfile, refetch } = useProfile();
  const { user, signOut, refetchProfile } = useAuth();
  const { checkinMap, currentStreak, todayChecked } = useCheckin();
  const { words } = useWords();
  // ⚠️ Hooks 必须在任何早退 return 之前调用（React Hook 规则）
  const { switchTheme, themeId } = useTheme();

  const [editing, setEditing] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState('unknown');
  const [gradeLevel, setGradeLevel] = useState('high_school');
  const [bio, setBio] = useState('');
  const [selectedAvatarId, setSelectedAvatarId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const startEdit = () => {
    setNickname(profile?.nickname || '');
    setGender(profile?.gender || 'unknown');
    setGradeLevel(profile?.grade_level || 'high_school');
    setBio(profile?.bio || '');
    setSelectedAvatarId(profile?.avatar_id || null);
    setEditing(true);
  };

  const handleSelectPresetAvatar = async (id) => {
    setSelectedAvatarId(id)
    // 联动主题：选择 5 选 1 头像时自动切换主题（同时写 Supabase + localStorage）
    const themeId = ['', 'owl', 'fox', 'bunny', 'panda', 'cat'][id] || 'owl'
    if (['1', '2', '3', '4', '5'].includes(String(id))) {
      try { switchTheme(themeId) } catch {}
    }
    // 立即保存预设头像到 profile（同时持久化 theme_id 保证一致性）
    if (user) {
      const { error, fixInstruction } = await updateProfile({ avatar_id: id, avatar_url: '', theme_id: themeId })
      if (error) {
        const fixText = fixInstruction
          ? `\n\n${fixInstruction}`
          : '\n\n请检查 Supabase 数据库。'
        if (error.code === 'PGRST204' || /avatar_id/.test(error.message || '')) {
          alert('预设头像功能需要数据库字段 avatar_id。' + fixText)
        } else {
          alert('保存失败: ' + (error.message || JSON.stringify(error)) + fixText)
        }
        return
      }
      await refetchProfile()
    }
  };

  const handleUploadAvatar = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过 2MB')
      return
    }
    setUploading(true)
    try {
      // 压缩图片到 256x256
      const compressed = await compressImage(file, 256)
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${user.id}/avatar-${Date.now()}.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, compressed, { contentType: 'image/jpeg', upsert: true })
      if (uploadErr) throw uploadErr
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path)
      await updateProfile({ avatar_url: publicUrl, avatar_id: null })
      setSelectedAvatarId(null)
      refetch()
      await refetchProfile()
    } catch (err) {
      console.error('上传失败:', err)
      const msg = err?.message || ''
      if (/row-level security|RLS|policy/i.test(msg)) {
        alert('上传失败：缺少 Storage RLS 策略。\n\n请在 Supabase SQL Editor 中执行 supabase_init.sql 脚本第 7 节以创建 avatars 桶的 4 个 RLS 策略。')
      } else if (/Bucket not found|bucket_id/i.test(msg)) {
        alert('上传失败：未找到 avatars bucket。\n\n请在 Supabase Storage 中创建名为 avatars 的 public bucket。')
      } else {
        alert('上传失败: ' + msg + '\n\n请检查网络或 Supabase 配置。')
      }
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      await updateProfile({
        nickname, gender, grade_level: gradeLevel, bio,
        avatar_id: selectedAvatarId,
      })
      // 同步刷新 useAuth 的 profile，使 Header 头像实时更新
      await refetchProfile()
      setEditing(false)
    } catch (err) {
      alert('保存失败: ' + (err?.message || ''))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="page-content" style={{ paddingTop: 8, textAlign: 'center' }}>
        <div className="card" style={{ padding: 40 }}>加载中...</div>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ paddingTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button onClick={() => setActivePage && setActivePage('home')}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--warm-600)', padding: 4 }}>
          ←
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--warm-700)', margin: 0 }}>个人中心</h1>
      </div>

      {/* 头像 + 资料 */}
      <div className="card" style={{ textAlign: 'center', padding: 24 }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
          <ThemeAvatar profile={profile} size={80} layout="vertical" showName={true} nameSize={12} />
          {editing && (
            <button
              onClick={() => setShowAvatarPicker(true)}
              style={{
                position: 'absolute', bottom: 0, right: 0,
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--warm-500)', color: 'white',
                border: '2px solid white', fontSize: 14,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}
              title="更换头像">
              📷
            </button>
          )}
        </div>

        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 4 }}>昵称</div>
              <input
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="给自己起个名字"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 12,
                  border: '2px solid var(--warm-200)', fontSize: 15,
                  fontFamily: 'inherit', outline: 'none',
                }}
              />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 4 }}>性别</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {genderOptions.map(g => (
                  <button key={g.value} onClick={() => setGender(g.value)} style={{
                    flex: 1, padding: '8px 0', borderRadius: 12,
                    border: gender === g.value ? '2px solid var(--warm-400)' : '2px solid var(--warm-200)',
                    background: gender === g.value ? 'var(--warm-50)' : 'white',
                    fontSize: 13, fontWeight: 700, color: 'var(--warm-600)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>{g.icon} {g.label}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 4 }}>学段</div>
              <div style={{ position: 'relative' }}>
                <select
                  value={gradeLevel}
                  onChange={e => setGradeLevel(e.target.value)}
                  className="profile-select"
                  style={{
                    width: '100%',
                    padding: '12px 38px 12px 14px',
                    borderRadius: 12,
                    border: '2px solid var(--warm-300)',
                    fontSize: 15,
                    fontWeight: 700,
                    color: 'var(--warm-700)',
                    background: 'linear-gradient(135deg, var(--warm-50), white)',
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    outline: 'none',
                  }}
                >
                  {gradeOptions.map(g => (
                    <option key={g.value} value={g.value} style={{
                      color: '#1C1917', background: 'white', fontWeight: 600,
                    }}>{g.label}</option>
                  ))}
                </select>
                {/* 自定义下拉箭头 */}
                <span style={{
                  position: 'absolute', right: 14, top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none', color: 'var(--warm-600)',
                  fontSize: 14, fontWeight: 800,
                }}>▼</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700, marginBottom: 4 }}>个性签名</div>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={2}
                placeholder="写一句话介绍自己吧~"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 12,
                  border: '2px solid var(--warm-200)', fontSize: 14,
                  fontFamily: 'inherit', outline: 'none', resize: 'vertical',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setEditing(false)} className="btn-outline" style={{ flex: 1 }}>取消</button>
              <button onClick={saveEdit} className="btn-primary" style={{ flex: 1 }} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        ) : (
          <>
  
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, marginTop: 4 }}>
              {gradeOptions.find(g => g.value === profile?.grade_level)?.label || '高中'} ·
              {genderOptions.find(g => g.value === profile?.gender)?.icon || '🧑'} ·
              {currentStreak} 天连续打卡
            </div>
            {profile?.bio && (
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, marginTop: 8, fontStyle: 'italic' }}>
                "{profile.bio}"
              </div>
            )}
            <button onClick={startEdit} className="btn-outline" style={{ marginTop: 12 }}>
              ✏️ 编辑资料
            </button>
          </>
        )}
      </div>

      {/* 头像选择器 Modal */}
      {showAvatarPicker && (
        <AvatarPickerModal
          currentAvatarId={selectedAvatarId}
          currentAvatarUrl={profile?.avatar_url}
          uploading={uploading}
          onSelectPreset={handleSelectPresetAvatar}
          onUpload={() => fileInputRef.current?.click()}
          onClose={() => setShowAvatarPicker(false)}
        />
      )}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleUploadAvatar} />

      {/* 数据统计 */}
      <div className="section-title">📊 我的数据</div>
      <div className="card" style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, textAlign: 'center',
      }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--warm-700)' }}>{words.length}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>总词汇</div>
        </div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--green-500)' }}>
            {words.filter(w => w.ebbinghaus_stage >= 5).length}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>已掌握</div>
        </div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--orange-400)' }}>
            {Object.keys(checkinMap).length}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>打卡天数</div>
        </div>
      </div>

      {/* 主题风格选择 */}
      <ThemeSwitcher />

      {/* 入口 */}
      <div className="section-title">🚀 探索更多</div>
      <div className="card" style={{ padding: 0 }}>
        <MenuItem icon="👥" label="好友管理" onClick={() => setActivePage && setActivePage('friends')} />
        <MenuItem icon="📅" label="打卡日历" onClick={() => setActivePage && setActivePage('checkin')} />
        <MenuItem icon="🏆" label="好友排行榜" onClick={() => setActivePage && setActivePage('friends')} />
      </div>

      <button onClick={signOut} className="btn-outline" style={{
        marginTop: 16, color: '#EF4444', borderColor: '#FECACA',
      }}>
        🚪 退出登录
      </button>
    </div>
  );
}

function MenuItem({ icon, label, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 20px', cursor: 'pointer',
      borderBottom: '1px solid var(--warm-100)',
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{label}</span>
      <span style={{ color: 'var(--text-light)', fontSize: 18 }}>›</span>
    </div>
  );
}

function AvatarPickerModal({ currentAvatarId, currentAvatarUrl, uploading, onSelectPreset, onUpload, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="card" style={{ maxWidth: 380, margin: '0 auto', padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--warm-700)', margin: 0 }}>选择头像</h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: 'var(--text-light)', padding: 4,
          }}>✕</button>
        </div>

        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 10 }}>
          🎨 预设动漫头像（点击立即应用）
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16,
        }}>
          {AVATAR_OPTIONS.map(id => {
            const Comp = AvatarAssets[id]
            const isActive = currentAvatarId === id
            return (
              <div key={id} onClick={() => onSelectPreset(id)} style={{
                cursor: 'pointer', padding: 4, borderRadius: 12,
                border: isActive ? '2.5px solid var(--warm-500)' : '2px solid transparent',
                background: isActive ? 'var(--warm-50)' : 'transparent',
                transition: 'all 0.2s',
              }}>
                <Comp size={56} />
              </div>
            )
          })}
        </div>

        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-secondary)', marginBottom: 10 }}>
          📷 自定义上传（推荐 ≤ 2MB）
        </div>
        <button onClick={onUpload} disabled={uploading} className="btn-primary" style={{ width: '100%' }}>
          {uploading ? '上传中...' : (currentAvatarUrl ? '更换图片' : '选择本地图片')}
        </button>
      </div>
    </div>
  );
}

function compressImage(file, maxSize = 256) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('压缩失败'))
      }, 'image/jpeg', 0.85)
    }
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = URL.createObjectURL(file)
  })
}
