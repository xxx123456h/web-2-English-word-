// src/lib/utils/themeApplier.js
// 将主题色注入 :root 的工具函数

export function applyThemeToDOM(theme) {
  const root = document.documentElement;

  // 注入所有颜色变量
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  // 注入背景图案（覆盖 .bg-pattern 的样式）
  const bgEls = document.querySelectorAll('.bg-pattern');
  bgEls.forEach((bgEl) => {
    bgEl.style.backgroundImage = theme.bgPattern;
    bgEl.style.backgroundSize = theme.bgPatternSize;
  });

  // 添加过渡动画（让主题切换有 0.4s 的渐变效果）
  if (!root.dataset.themeTransition) {
    root.dataset.themeTransition = 'true';
    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        transition: background-color 0.4s ease,
                    border-color 0.4s ease,
                    box-shadow 0.4s ease,
                    color 0.15s ease !important;
      }
    `;
    style.id = 'theme-transition-style';
    document.head.appendChild(style);

    // 过渡完成后移除，避免影响其他动画
    setTimeout(() => {
      style.remove();
      delete root.dataset.themeTransition;
    }, 500);
  }
}
