// src/components/ThemeSwitcher.jsx
// 主题选择面板 — 嵌入 ProfilePage

import { useTheme } from '../context/ThemeContext';
import MascotRenderer from './mascots/MascotRenderer';
import OwlMascot from './mascots/OwlMascot';
import FoxMascot from './mascots/FoxMascot';
import BunnyMascot from './mascots/BunnyMascot';
import PandaMascot from './mascots/PandaMascot';
import CatMascot from './mascots/CatMascot';

const MASCOT_PREVIEW = {
  owl: OwlMascot, fox: FoxMascot, bunny: BunnyMascot, panda: PandaMascot, cat: CatMascot,
};

export default function ThemeSwitcher() {
  const { themeId, switchTheme, allThemes } = useTheme();

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{
        fontSize: 17, fontWeight: 800, color: 'var(--text-primary)',
        marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
      }}>
        🎨 主题风格
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10,
      }}>
        {Object.values(allThemes).map((t) => {
          const Preview = MASCOT_PREVIEW[t.id];
          const isActive = t.id === themeId;
          return (
            <div
              key={t.id}
              onClick={() => switchTheme(t.id)}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 6,
                padding: 10, borderRadius: 16, cursor: 'pointer',
                border: isActive ? `3px solid ${t.colors['--warm-400']}` : '3px solid transparent',
                background: isActive ? t.colors['--warm-50'] : 'var(--bg-card)',
                boxShadow: isActive ? (t.colors['--shadow-soft'] || 'none') : 'none',
                transition: 'all 0.3s ease',
                transform: isActive ? 'scale(1.05)' : 'scale(1)',
              }}
            >
              <Preview size={40} mood="happy" />
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: isActive ? t.colors['--warm-600'] : 'var(--text-secondary)',
              }}>
                {t.name.split('·')[1]}
              </span>
            </div>
          );
        })}
      </div>

      {/* 当前主题预览 */}
      <div style={{
        marginTop: 16, padding: 20, borderRadius: 20,
        background: allThemes[themeId].welcomeGradient,
        display: 'flex', alignItems: 'center', gap: 16,
        transition: 'background 0.4s ease',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--warm-600)' }}>
            当前主题
          </div>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--warm-700)' }}>
            {allThemes[themeId].name}
          </div>
        </div>
        <MascotRenderer size={70} mood="happy" className="float-anim" />
      </div>
    </div>
  );
}
