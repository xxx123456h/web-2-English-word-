// src/components/mascots/MascotRenderer.jsx
// 根据 themeId 渲染对应吉祥物
// 若未在 ThemeProvider 内则降级为 OwlMascot（不影响功能）

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

export default function MascotRenderer({ size = 80, mood = 'happy', className = '' }) {
  const ctx = useContext(ThemeContext);
  const themeId = ctx?.themeId || 'owl';
  const MascotComponent = MASCOT_MAP[themeId] || OwlMascot;

  return (
    <div
      key={themeId}
      style={{ animation: 'bounceIn 0.5s ease-out' }}
    >
      <MascotComponent size={size} mood={mood} className={className} />
    </div>
  );
}
