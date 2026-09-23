// src/components/AvatarAssets.jsx
// 5 个主题一致的动漫头像预设（与 mascots/ 目录复用，保持视觉一致）

import OwlMascot from './mascots/OwlMascot';
import FoxMascot from './mascots/FoxMascot';
import BunnyMascot from './mascots/BunnyMascot';
import PandaMascot from './mascots/PandaMascot';
import CatMascot from './mascots/CatMascot';

// 头像 ID 与主题 ID 的映射：1=owl 2=fox 3=bunny 4=panda 5=cat
export const AVATAR_THEME_MAP = {
  1: 'owl', 2: 'fox', 3: 'bunny', 4: 'panda', 5: 'cat',
};

export const AvatarAssets = {
  1: OwlMascot,
  2: FoxMascot,
  3: BunnyMascot,
  4: PandaMascot,
  5: CatMascot,
};

export const AVATAR_OPTIONS = [1, 2, 3, 4, 5];

export const BG_GRADIENT_DEFAULT = ['#FEF3C7', '#F59E0B'];

// 主题色映射（用于首字母兜底）
const THEME_GRADIENTS = {
  owl:   ['#FEF3C7', '#F59E0B'],
  fox:   ['#FFE0E0', '#F97066'],
  bunny: ['#F3E8FF', '#A78BFA'],
  panda: ['#D1FAE5', '#34D399'],
  cat:   ['#DBEAFE', '#60A5FA'],
};

/**
 * 渲染用户头像：优先 URL → 否则 5 选 1 预设（主题色吉祥物）→ 否则首字母（主题色背景）
 * 这是无 Context 降级版本，外部组件可独立使用。
 */
export function renderAvatar(profile, size = 80) {
  // 1. 用户上传了自定义头像
  if (profile?.avatar_url) {
    return (
      <img src={profile.avatar_url} alt={profile?.nickname || 'avatar'}
        style={{
          width: size, height: size, borderRadius: '50%', objectFit: 'cover',
          boxShadow: '0 2px 6px rgba(0,0,0,0.10)',
        }} />
    )
  }

  // 2. 用户选了 5 选 1 头像 → 渲染对应主题的吉祥物
  const id = profile?.avatar_id
  if (id >= 1 && id <= 5 && AvatarAssets[id]) {
    const Comp = AvatarAssets[id]
    const theme = AVATAR_THEME_MAP[id] || 'owl'
    const [bg1, bg2] = THEME_GRADIENTS[theme] || BG_GRADIENT_DEFAULT
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${bg1}, ${bg2})`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 6px rgba(0,0,0,0.10)',
      }}>
        <Comp size={size} />
      </div>
    )
  }

  // 3. 兜底：首字母（主题色背景）
  const nickname = (profile?.nickname || profile?.email || '?').trim()
  const initial = nickname[0]?.toUpperCase() || '?'

  // 尝试从 profile 推断主题色：avatar_id → 主题
  let gradient = BG_GRADIENT_DEFAULT
  if (id >= 1 && id <= 5) {
    const theme = AVATAR_THEME_MAP[id]
    if (theme) gradient = THEME_GRADIENTS[theme] || gradient
  }

  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontSize: size * 0.4, fontWeight: 800,
      boxShadow: '0 2px 6px rgba(0,0,0,0.10)',
    }}>{initial}</div>
  )
}

