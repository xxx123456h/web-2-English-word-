// src/components/mascots/ThemeAvatar.jsx
// 与当前主题同步的吉祥物头像 + 昵称
// 设计原则：完全按主题(themeId)渲染吉祥物，**与首页 MascotRenderer 100% 一致**
//
// 重要：选中 5 选 1 头像 = 切换主题（联动已实现），吉祥物始终由主题决定。
// 这样保证 Header、首页、个人中心三处吉祥物绝对一致。

import { useContext } from 'react';
import { ThemeContext } from '../../context/ThemeContext';
import OwlMascot from './OwlMascot';
import FoxMascot from './FoxMascot';
import BunnyMascot from './BunnyMascot';
import PandaMascot from './PandaMascot';
import CatMascot from './CatMascot';

const MASCOT_MAP = {
  owl:   OwlMascot,
  fox:   FoxMascot,
  bunny: BunnyMascot,
  panda: PandaMascot,
  cat:   CatMascot,
};

// 主题色：渐变背景 + 主色调标签
const THEME_COLORS = {
  owl:   { bg1: '#FEF3C7', bg2: '#FBBF24', label: '#B45309' },
  fox:   { bg1: '#FFE0E0', bg2: '#F97066', label: '#991B1B' },
  bunny: { bg1: '#F3E8FF', bg2: '#A78BFA', label: '#5B21B6' },
  panda: { bg1: '#D1FAE5', bg2: '#34D399', label: '#065F46' },
  cat:   { bg1: '#DBEAFE', bg2: '#60A5FA', label: '#1E40AF' },
};

/**
 * 主题同步的吉祥物头像 + 昵称
 * - profile: { nickname, avatar_url, email }
 * - layout: 'vertical' (上下) | 'horizontal' (左右) | 'plain' (仅头像)
 * - showName: 是否在头像下方/旁边显示昵称首字
 */
export default function ThemeAvatar({
  profile,
  size = 40,
  mood = 'happy',
  className = '',
  layout = 'plain',
  showName = false,
  nameSize = null,
}) {
  const ctx = useContext(ThemeContext);
  // ✅ 关键：吉祥物完全由主题决定（而非 avatar_id 字段）
  // 切换主题/选头像都会更新 themeId → 吉祥物自动跟随
  const themeId = ctx?.themeId || 'owl';
  const colors = THEME_COLORS[themeId] || THEME_COLORS.owl;
  const Mascot = MASCOT_MAP[themeId] || OwlMascot;

  // 昵称首字（取昵称第一个字符；优先中文姓或英文首字母）
  const nickname = (profile?.nickname || profile?.email?.split('@')[0] || '?').trim();
  const initial = nickname[0]?.toUpperCase() || '?';
  // 完整昵称（用于标签显示）
  const displayName = nickname.length > 6 ? nickname.slice(0, 6) + '…' : nickname;

  // 1. 用户上传了自定义头像
  if (profile?.avatar_url) {
    return (
      <AvatarWrapper
        layout={layout}
        nameSize={nameSize}
        showName={showName}
        displayName={displayName}
        colors={colors}
        initial={initial}
        avatarNode={
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <img src={profile.avatar_url} alt={nickname}
              style={{
                width: size, height: size, borderRadius: '50%',
                objectFit: 'cover',
                boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                border: `2px solid ${colors.bg2}`,
              }} />
            {/* 昵称首字小徽章 */}
            {initial && initial !== '?' && (
              <span style={{
                position: 'absolute',
                right: -2, bottom: -2,
                minWidth: 18, height: 18,
                padding: '0 4px',
                borderRadius: 9,
                background: 'white',
                color: colors.label,
                fontSize: 10, fontWeight: 900,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `1.5px solid ${colors.bg2}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                lineHeight: 1,
              }}>{initial}</span>
            )}
          </div>
        }
      />
    );
  }

  // 2. 按当前主题渲染吉祥物（保证与首页 MascotRenderer 100% 一致）
  //    使用 key={themeId} 强制 React 卸载旧吉祥物、挂载新吉祥物
  //    避免 React 在组件引用变化时复用旧 DOM 节点
  return (
    <AvatarWrapper
      key={themeId}
      layout={layout}
      nameSize={nameSize}
      showName={showName}
      displayName={displayName}
      colors={colors}
      initial={initial}
      avatarNode={
        <div
          key={themeId}
          style={{
            width: size, height: size, borderRadius: '50%',
            background: `linear-gradient(135deg, ${colors.bg1}, ${colors.bg2})`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 2px 8px ${colors.bg2}55`,
            border: `2px solid ${colors.bg2}`,
            position: 'relative',
          }}>
          {/* 吉祥物：放大显示，覆盖整个圆形（不带 overflow:hidden，避免裁掉耳朵/尾巴） */}
          <div style={{
            width: size - 4, height: size - 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: 'scale(1.05)',
          }}>
            <Mascot size={size - 4} mood={mood} className={className} />
          </div>
          {/* 昵称首字小徽章 - 浮在右下角，让头像与主题+身份同时可识别 */}
          {initial && initial !== '?' && (
            <span style={{
              position: 'absolute',
              right: -2, bottom: -2,
              minWidth: 18, height: 18,
              padding: '0 4px',
              borderRadius: 9,
              background: 'white',
              color: colors.label,
              fontSize: 10, fontWeight: 900,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1.5px solid ${colors.bg2}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
              lineHeight: 1,
            }}>{initial}</span>
          )}
        </div>
      }
    />
  );
}

function AvatarWrapper({ layout, nameSize, showName, displayName, colors, initial: _initial, avatarNode }) {
  if (!showName) return avatarNode;

  const fontSize = nameSize || (layout === 'vertical' ? 11 : 10);
  const tag = (
    <div style={{
      fontSize,
      fontWeight: 800,
      color: colors.label,
      background: 'rgba(255,255,255,0.92)',
      padding: '2px 8px',
      borderRadius: 10,
      whiteSpace: 'nowrap',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      maxWidth: 100,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}>{displayName}</div>
  );

  if (layout === 'vertical') {
    return (
      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        {avatarNode}
        {tag}
      </div>
    );
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      {avatarNode}
      {tag}
    </div>
  );
}
