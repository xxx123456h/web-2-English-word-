// src/context/ThemeContext.jsx
// 全局主题 Context + Provider
//
// 设计原则（重要）：
// - 主题持久化以 localStorage 为唯一真理源（避免 Supabase 默认值 'owl' 覆盖用户选择）
// - 切换主题时仅写入 localStorage（不联网 Supabase，避免不必要的失败重置）
// - 从 Supabase 读 theme_id 仅作为"首次创建 profile 的初始值"使用

import { createContext, useState, useEffect, useContext } from 'react';
import { THEMES, DEFAULT_THEME } from '../config/themes';
import { applyThemeToDOM } from '../lib/utils/themeApplier';
import { supabase } from '../lib/supabase';

const ThemeContext = createContext(null);

export function ThemeProvider({ children, userId }) {
  // ✅ 关键：useState 用 lazy init，**只在首次挂载时**读取 localStorage
  // 之后任何 userId 变化都不会触发主题重置，localStorage 永远是真理源
  const [themeId, setThemeId] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('wordwise_theme') || DEFAULT_THEME;
    }
    return DEFAULT_THEME;
  });

  const theme = THEMES[themeId] || THEMES[DEFAULT_THEME];

  // 1. 主题变化时 → 立即注入 CSS 变量到 :root + 写入 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      applyThemeToDOM(theme);
      localStorage.setItem('wordwise_theme', themeId);
    }
  }, [themeId, theme]);

  // 2. 切换主题 → 仅设置本地 state（localStorage 在 useEffect #1 中自动同步）
  //    之前是写入 Supabase，但 Supabase 默认值 'owl' 会污染用户选择，故改为不写库
  const switchTheme = async (newThemeId) => {
    if (!THEMES[newThemeId]) return;
    setThemeId(newThemeId);
  };

  return (
    <ThemeContext.Provider value={{ themeId, theme, switchTheme, allThemes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

export { ThemeContext };
