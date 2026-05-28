import { useState, useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import { useWords } from "./hooks/useWords";
import { signIn, signUp, signOut } from "./lib/services/auth";
import { useRef } from "react"
import { toBase64, recognizeWords, batchLookup } from "./lib/services/camera"
import { batchAddWords } from "./lib/services/words"

// ============ CUTE MASCOT SVG COMPONENTS ============
const OwlMascot = ({ size = 80, mood = "happy", className = "" }) => {
  const moods = {
    happy: { eyeY: 0, mouthPath: "M-6,4 Q0,10 6,4", blush: true },
    thinking: { eyeY: -2, mouthPath: "M-4,6 Q0,6 4,6", blush: false },
    celebrate: { eyeY: -3, mouthPath: "M-8,2 Q0,12 8,2", blush: true },
    sad: { eyeY: 2, mouthPath: "M-5,8 Q0,4 5,8", blush: false },
    wink: { eyeY: 0, mouthPath: "M-6,4 Q0,10 6,4", blush: true },
  };
  const m = moods[mood] || moods.happy;
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" className={className}>
      {/* Body */}
      <ellipse cx="0" cy="10" rx="32" ry="35" fill="#FBBF24" />
      <ellipse cx="0" cy="14" rx="24" ry="22" fill="#FEF3C7" />
      {/* Ears/Tufts */}
      <polygon points="-28,-20 -18,-42 -8,-18" fill="#F59E0B" />
      <polygon points="28,-20 18,-42 8,-18" fill="#F59E0B" />
      {/* Eyes */}
      <circle cx="-12" cy={-4 + m.eyeY} r="10" fill="white" />
      <circle cx="12" cy={-4 + m.eyeY} r="10" fill="white" />
      {mood === "wink" ? (
        <>
          <circle cx="-12" cy={-4 + m.eyeY} r="5" fill="#1F2937" />
          <path d="M7,-4 Q12,-8 17,-4" stroke="#1F2937" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="-12" cy={-4 + m.eyeY} r="5" fill="#1F2937" />
          <circle cx="12" cy={-4 + m.eyeY} r="5" fill="#1F2937" />
          <circle cx="-10" cy={-6 + m.eyeY} r="2" fill="white" />
          <circle cx="14" cy={-6 + m.eyeY} r="2" fill="white" />
        </>
      )}
      {/* Beak */}
      <polygon points="-5,4 0,12 5,4" fill="#FB923C" />
      {/* Mouth */}
      <path d={m.mouthPath} stroke="#92400E" strokeWidth="1.5" fill="none" strokeLinecap="round" transform="translate(0,10)" />
      {/* Blush */}
      {m.blush && (
        <>
          <ellipse cx="-22" cy="4" rx="6" ry="4" fill="#FECACA" opacity="0.6" />
          <ellipse cx="22" cy="4" rx="6" ry="4" fill="#FECACA" opacity="0.6" />
        </>
      )}
      {/* Wings */}
      <ellipse cx="-30" cy="12" rx="10" ry="18" fill="#F59E0B" transform="rotate(15,-30,12)" />
      <ellipse cx="30" cy="12" rx="10" ry="18" fill="#F59E0B" transform="rotate(-15,30,12)" />
      {/* Feet */}
      <ellipse cx="-10" cy="44" rx="8" ry="4" fill="#FB923C" />
      <ellipse cx="10" cy="44" rx="8" ry="4" fill="#FB923C" />
      {/* Graduation cap for celebrate */}
      {mood === "celebrate" && (
        <g transform="translate(0,-38)">
          <rect x="-16" y="-4" width="32" height="4" rx="1" fill="#1F2937" />
          <rect x="-8" y="-12" width="16" height="10" rx="2" fill="#1F2937" />
          <circle cx="0" cy="-12" r="3" fill="#FBBF24" />
          <line x1="16" y1="-2" x2="22" y2="6" stroke="#FBBF24" strokeWidth="1.5" />
          <circle cx="22" cy="7" r="2" fill="#FBBF24" />
        </g>
      )}
    </svg>
  );
};

const StarIcon = ({ filled = true, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "#FBBF24" : "none"} stroke="#FBBF24" strokeWidth="2">
    <polygon points="12,2 15,9 22,9.5 17,14.5 18.5,22 12,18 5.5,22 7,14.5 2,9.5 9,9" />
  </svg>
);

const CameraIcon = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

const BookIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);

const FlashcardIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="3"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);

const QuizIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const HomeIcon = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

const SpeakerIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
  </svg>
);

const CheckCircle = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const XCircle = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);

const FireIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#EF4444" stroke="none">
    <path d="M12 23c-3.6 0-8-2.4-8-8.3C4 8.8 12 1 12 1s8 7.8 8 13.7c0 5.9-4.4 8.3-8 8.3zm0-4c1.5 0 3-.8 3-3.3 0-2.3-3-5.7-3-5.7s-3 3.4-3 5.7c0 2.5 1.5 3.3 3 3.3z"/>
  </svg>
);

const TrophyIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FBBF24" stroke="#F59E0B" strokeWidth="1">
    <path d="M6 9H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3M18 9h3a1 1 0 0 0 1-1V5a1 1 0 0 0-1-1h-3M6 4h12v7a6 6 0 0 1-12 0V4zM9 21h6M12 17v4"/>
  </svg>
);

// ============ LOGIN PAGE ============
const LoginPage = ({ onLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await signUp(email, password);
        setError("注册成功！请查收验证邮件后登录 📧");
      } else {
        await signIn(email, password);
        onLogin();
      }
    } catch (err) {
      setError(err.message || "操作失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg-main)" }}>
      <OwlMascot size={100} mood="happy" className="float-anim" />
      <h1 style={{ fontSize: 28, fontWeight: 900, color: "var(--warm-700)", marginTop: 16 }}>WordWise 🦉</h1>
      <p style={{ color: "var(--text-secondary)", marginBottom: 32, fontWeight: 600 }}>智能单词学习助手</p>

      <div style={{ width: "100%", maxWidth: 360 }}>
        <input
          type="email"
          placeholder="邮箱地址"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width: "100%", padding: "14px 16px", borderRadius: 14, border: "2px solid var(--warm-200)", fontSize: 15, fontFamily: "inherit", marginBottom: 12, outline: "none" }}
        />
        <input
          type="password"
          placeholder="密码（至少6位）"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ width: "100%", padding: "14px 16px", borderRadius: 14, border: "2px solid var(--warm-200)", fontSize: 15, fontFamily: "inherit", marginBottom: 16, outline: "none" }}
        />
        {error && <p style={{ color: error.includes("成功") ? "var(--green-500)" : "var(--coral-500)", fontSize: 13, fontWeight: 600, marginBottom: 12, textAlign: "center" }}>{error}</p>}
        <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? "处理中..." : isRegister ? "注册账号 🎉" : "登录 →"}
        </button>
        <button className="btn-outline" style={{ marginTop: 10 }} onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? "已有账号？去登录" : "没有账号？免费注册"}
        </button>
      </div>
    </div>
  );
};

// ============ SAMPLE DATA ============
const sampleWords = [
  { id: 1, word: "accomplish", phonetic: "/əˈkɑːm.plɪʃ/", meaning: "完成，达到", stage: 5, nextReview: "今天", correct: 8, total: 10, date: "2026-04-25" },
  { id: 2, word: "brilliant", phonetic: "/ˈbrɪl.jənt/", meaning: "杰出的，明亮的", stage: 3, nextReview: "今天", correct: 5, total: 8, date: "2026-04-26" },
  { id: 3, word: "consequence", phonetic: "/ˈkɑːn.sə.kwens/", meaning: "结果，后果", stage: 2, nextReview: "今天", correct: 3, total: 6, date: "2026-04-27" },
  { id: 4, word: "determine", phonetic: "/dɪˈtɜːr.mɪn/", meaning: "决定，确定", stage: 4, nextReview: "明天", correct: 7, total: 9, date: "2026-04-27" },
  { id: 5, word: "enthusiasm", phonetic: "/ɪnˈθuː.zi.æz.əm/", meaning: "热情，热忱", stage: 1, nextReview: "今天", correct: 1, total: 3, date: "2026-04-28" },
  { id: 6, word: "magnificent", phonetic: "/mæɡˈnɪf.ɪ.sənt/", meaning: "壮丽的，极好的", stage: 6, nextReview: "04-30", correct: 12, total: 13, date: "2026-04-22" },
  { id: 7, word: "persuade", phonetic: "/pɚˈsweɪd/", meaning: "说服，劝服", stage: 2, nextReview: "今天", correct: 2, total: 5, date: "2026-04-29" },
  { id: 8, word: "reluctant", phonetic: "/rɪˈlʌk.tənt/", meaning: "不情愿的", stage: 3, nextReview: "明天", correct: 4, total: 6, date: "2026-04-29" },
];

const quizQuestions = [
  {
    word: "accomplish",
    correct: "完成，达到",
    options: ["完成，达到", "陪伴，伴随", "积累，累积", "承认，认可"],
    type: "meaning",
  },
  {
    word: "brilliant",
    correct: "杰出的，明亮的",
    options: ["短暂的，简短的", "杰出的，明亮的", "残忍的，野蛮的", "脆弱的，易碎的"],
    type: "similar",
  },
  {
    word: "consequence",
    correct: "结果，后果",
    options: ["意识，知觉", "保守的", "结果，后果", "连续的"],
    type: "similar",
  },
  {
    word: "enthusiasm",
    correct: "热情，热忱",
    options: ["环境", "热情，热忱", "入口", "同等的"],
    type: "meaning",
  },
];

const stageLabels = ["新词", "初识", "熟悉", "巩固", "掌握", "精通", "夯实"];
const stageColors = ["#EF4444", "#F97316", "#FBBF24", "#84CC16", "#22C55E", "#14B8A6", "#6366F1"];

// ============ STYLES ============
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Noto+Sans+SC:wght@400;500;700&display=swap');
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  :root {
    --warm-50: #FFFBEB;
    --warm-100: #FEF3C7;
    --warm-200: #FDE68A;
    --warm-300: #FCD34D;
    --warm-400: #FBBF24;
    --warm-500: #F59E0B;
    --warm-600: #D97706;
    --warm-700: #B45309;
    --orange-50: #FFF7ED;
    --orange-100: #FFEDD5;
    --orange-200: #FED7AA;
    --orange-300: #FDBA74;
    --orange-400: #FB923C;
    --orange-500: #F97316;
    --coral-50: #FFF1F2;
    --coral-100: #FFE4E6;
    --coral-400: #FB7185;
    --coral-500: #F43F5E;
    --green-50: #F0FDF4;
    --green-400: #4ADE80;
    --green-500: #22C55E;
    --blue-50: #EFF6FF;
    --blue-400: #60A5FA;
    --text-primary: #1C1917;
    --text-secondary: #78716C;
    --text-light: #A8A29E;
    --bg-main: #FFF8F0;
    --bg-card: #FFFFFF;
    --shadow-soft: 0 2px 16px rgba(251,163,60,0.10);
    --shadow-md: 0 4px 24px rgba(251,163,60,0.14);
    --shadow-lg: 0 8px 32px rgba(251,163,60,0.18);
    --radius-sm: 12px;
    --radius-md: 18px;
    --radius-lg: 24px;
    --radius-xl: 32px;
  }

  .app-container {
    font-family: 'Nunito', 'Noto Sans SC', sans-serif;
    max-width: 420px;
    margin: 0 auto;
    background: var(--bg-main);
    min-height: 100vh;
    position: relative;
    overflow-x: hidden;
    color: var(--text-primary);
  }

  .page-content {
    padding: 0 20px 100px 20px;
    animation: fadeUp 0.35s ease-out;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes bounceIn {
    0% { transform: scale(0.3); opacity: 0; }
    50% { transform: scale(1.08); }
    70% { transform: scale(0.95); }
    100% { transform: scale(1); opacity: 1; }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-8px); }
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  @keyframes shimmer {
    0% { background-position: -200% center; }
    100% { background-position: 200% center; }
  }

  @keyframes flipIn {
    from { transform: rotateY(90deg); opacity: 0; }
    to { transform: rotateY(0deg); opacity: 1; }
  }

  @keyframes slideRight {
    from { transform: translateX(-20px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @keyframes popIn {
    0% { transform: scale(0); opacity: 0; }
    80% { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
  }

  .float-anim { animation: float 3s ease-in-out infinite; }
  .bounce-in { animation: bounceIn 0.5s ease-out; }
  .pulse-anim { animation: pulse 2s ease-in-out infinite; }

  /* ---- Header ---- */
  .header {
    padding: 16px 20px 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .header-title {
    font-size: 22px;
    font-weight: 800;
    color: var(--warm-700);
    letter-spacing: -0.5px;
  }
  .header-avatar {
    width: 40px; height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--warm-300), var(--orange-400));
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; font-weight: 700; color: white;
    box-shadow: 0 2px 8px rgba(251,163,60,0.3);
  }

  /* ---- Tab Bar ---- */
  .tab-bar {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 420px;
    background: rgba(255,255,255,0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    display: flex;
    justify-content: space-around;
    padding: 8px 4px 12px;
    border-top: 1px solid rgba(251,191,36,0.15);
    z-index: 100;
  }
  .tab-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 6px 12px;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all 0.25s;
    border: none;
    background: none;
    font-family: inherit;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-light);
    position: relative;
  }
  .tab-item.active {
    color: var(--warm-600);
    background: var(--warm-50);
  }
  .tab-item.camera-tab {
    margin-top: -22px;
    background: linear-gradient(135deg, var(--warm-400), var(--orange-400));
    color: white;
    border-radius: 50%;
    width: 58px; height: 58px;
    padding: 0;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 16px rgba(249,115,22,0.35);
    font-size: 0;
  }
  .tab-item.camera-tab:active { transform: scale(0.92); }

  /* ---- Cards ---- */
  .card {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    padding: 20px;
    box-shadow: var(--shadow-soft);
    margin-bottom: 16px;
  }
  .card-warm {
    background: linear-gradient(135deg, var(--warm-100), var(--orange-100));
  }

  /* ---- Buttons ---- */
  .btn-primary {
    background: linear-gradient(135deg, var(--warm-400), var(--orange-400));
    color: white;
    border: none;
    border-radius: var(--radius-md);
    padding: 14px 28px;
    font-family: inherit;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 14px rgba(249,115,22,0.3);
    display: flex; align-items: center; justify-content: center; gap: 8px;
    width: 100%;
  }
  .btn-primary:active { transform: scale(0.96); }
  .btn-primary:hover { box-shadow: 0 6px 20px rgba(249,115,22,0.4); }

  .btn-outline {
    background: transparent;
    color: var(--warm-600);
    border: 2px solid var(--warm-300);
    border-radius: var(--radius-md);
    padding: 12px 24px;
    font-family: inherit;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
  }
  .btn-outline:hover { background: var(--warm-50); }
  .btn-outline:active { transform: scale(0.97); }

  /* ---- Progress Bar ---- */
  .progress-track {
    width: 100%;
    height: 10px;
    background: var(--warm-100);
    border-radius: 10px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    border-radius: 10px;
    background: linear-gradient(90deg, var(--warm-400), var(--orange-400));
    transition: width 0.6s ease;
  }

  /* ---- Badges ---- */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 12px;
    font-weight: 700;
  }
  .badge-warm { background: var(--warm-100); color: var(--warm-700); }
  .badge-green { background: var(--green-50); color: #15803D; }
  .badge-coral { background: var(--coral-50); color: #E11D48; }
  .badge-blue { background: var(--blue-50); color: #2563EB; }

  /* ---- Word List Items ---- */
  .word-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 0;
    border-bottom: 1px solid rgba(251,191,36,0.1);
    cursor: pointer;
    transition: background 0.2s;
  }
  .word-item:last-child { border-bottom: none; }
  .word-item:hover { background: var(--warm-50); margin: 0 -20px; padding: 14px 20px; border-radius: var(--radius-md); }

  .word-stage-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  /* ---- Quiz Options ---- */
  .quiz-option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 18px;
    border: 2px solid var(--warm-200);
    border-radius: var(--radius-md);
    margin-bottom: 12px;
    cursor: pointer;
    transition: all 0.2s;
    background: white;
    font-family: inherit;
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
    width: 100%;
    text-align: left;
  }
  .quiz-option:hover { border-color: var(--warm-400); background: var(--warm-50); }
  .quiz-option.selected { border-color: var(--warm-500); background: var(--warm-100); }
  .quiz-option.correct { border-color: var(--green-500); background: var(--green-50); }
  .quiz-option.wrong { border-color: var(--coral-500); background: var(--coral-50); }
  .quiz-option-label {
    width: 28px; height: 28px;
    border-radius: 50%;
    background: var(--warm-100);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 800; color: var(--warm-600);
    flex-shrink: 0;
  }
  .quiz-option.correct .quiz-option-label { background: var(--green-400); color: white; }
  .quiz-option.wrong .quiz-option-label { background: var(--coral-400); color: white; }

  /* ---- Decorative Blobs ---- */
  .blob-1 {
    position: absolute;
    top: -60px; right: -40px;
    width: 200px; height: 200px;
    background: radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%);
    border-radius: 50%;
    pointer-events: none;
  }
  .blob-2 {
    position: absolute;
    bottom: 120px; left: -60px;
    width: 180px; height: 180px;
    background: radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%);
    border-radius: 50%;
    pointer-events: none;
  }

  /* ---- Flashcard ---- */
  .flashcard-container {
    perspective: 1000px;
    margin: 20px 0;
  }
  .flashcard {
    width: 100%;
    min-height: 280px;
    border-radius: var(--radius-xl);
    position: relative;
    transition: transform 0.6s cubic-bezier(0.4,0,0.2,1);
    transform-style: preserve-3d;
    cursor: pointer;
  }
  .flashcard.flipped { transform: rotateY(180deg); }
  .flashcard-face {
    position: absolute;
    inset: 0;
    border-radius: var(--radius-xl);
    backface-visibility: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    gap: 12px;
  }
  .flashcard-front {
    background: linear-gradient(145deg, #FFF7ED, #FFEDD5);
    box-shadow: var(--shadow-lg);
  }
  .flashcard-back {
    background: linear-gradient(145deg, #FEF3C7, #FDE68A);
    box-shadow: var(--shadow-lg);
    transform: rotateY(180deg);
  }
  .flashcard-word {
    font-size: 36px;
    font-weight: 900;
    color: var(--warm-700);
    letter-spacing: -1px;
  }
  .flashcard-phonetic {
    font-size: 16px;
    color: var(--text-secondary);
    font-weight: 600;
  }
  .flashcard-meaning {
    font-size: 26px;
    font-weight: 800;
    color: var(--warm-700);
    text-align: center;
  }
  .flashcard-hint {
    font-size: 13px;
    color: var(--text-light);
    font-weight: 600;
    margin-top: 8px;
  }

  /* ---- Camera Page ---- */
  .camera-viewfinder {
    width: 100%;
    aspect-ratio: 3/4;
    background: linear-gradient(145deg, #2D2117, #1C1410);
    border-radius: var(--radius-xl);
    position: relative;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 16px 0;
  }
  .camera-frame {
    width: 80%;
    height: 40%;
    border: 2.5px dashed rgba(251,191,36,0.5);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }
  .camera-frame-text {
    color: rgba(255,255,255,0.6);
    font-size: 14px;
    font-weight: 600;
    text-align: center;
  }
  .scan-line {
    position: absolute;
    left: 10%;
    width: 80%;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--warm-400), transparent);
    animation: scanMove 2.5s ease-in-out infinite;
  }
  @keyframes scanMove {
    0%, 100% { top: 25%; opacity: 0.3; }
    50% { top: 65%; opacity: 0.8; }
  }
  .shutter-btn {
    width: 72px; height: 72px;
    border-radius: 50%;
    border: 4px solid var(--warm-400);
    background: white;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    margin: 20px auto;
    transition: all 0.2s;
    box-shadow: 0 4px 20px rgba(249,115,22,0.25);
  }
  .shutter-btn:active { transform: scale(0.9); }
  .shutter-inner {
    width: 56px; height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--warm-400), var(--orange-400));
  }

  /* ---- Stats Ring ---- */
  .stats-ring { position: relative; display: inline-flex; }
  .stats-ring-text {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 22px;
    color: var(--warm-700);
    line-height: 1.1;
  }
  .stats-ring-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  /* Section titles */
  .section-title {
    font-size: 17px;
    font-weight: 800;
    color: var(--text-primary);
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Streak calendar */
  .streak-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }
  .streak-day {
    aspect-ratio: 1;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
  }
  .streak-day.done {
    background: linear-gradient(135deg, var(--warm-300), var(--orange-300));
    color: white;
  }
  .streak-day.today {
    border: 2px solid var(--warm-400);
    color: var(--warm-600);
  }
  .streak-day.future {
    background: var(--warm-50);
    color: var(--text-light);
  }

  /* OCR result chips */
  .word-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: 700;
    margin: 4px;
    cursor: pointer;
    transition: all 0.2s;
    border: 2px solid transparent;
  }
  .word-chip.unselected {
    background: var(--warm-50);
    color: var(--text-secondary);
    border-color: var(--warm-200);
  }
  .word-chip.selected {
    background: linear-gradient(135deg, var(--warm-300), var(--orange-300));
    color: white;
    border-color: var(--warm-400);
    box-shadow: 0 2px 8px rgba(249,115,22,0.25);
  }

  /* Background pattern */
  .bg-pattern {
    position: fixed;
    inset: 0;
    background-image: radial-gradient(circle at 25px 25px, rgba(251,191,36,0.04) 2px, transparent 0);
    background-size: 50px 50px;
    pointer-events: none;
    z-index: 0;
  }

  .page-label {
    display: inline-block;
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: var(--warm-500);
    margin-bottom: 4px;
  }

  .page-heading {
    font-size: 26px;
    font-weight: 900;
    color: var(--text-primary);
    line-height: 1.2;
    margin-bottom: 20px;
  }
`;

// ============ PAGE COMPONENTS ============

// PAGE 1: HOME / DASHBOARD
const HomePage = () => {
  const todayWords = sampleWords.filter(w => w.nextReview === "今天");
  const streakDays = [21,22,23,24,25,26,27,28,29,30];
  const doneUntil = 29;
  
  return (
    <div className="page-content" style={{ paddingTop: 8 }}>
      <div className="blob-1" />
      
      {/* Welcome Card */}
      <div className="card card-warm" style={{ display: "flex", alignItems: "center", gap: 16, position: "relative", overflow: "hidden" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--warm-600)", marginBottom: 4 }}>Good morning ☀️</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: "var(--warm-700)", marginBottom: 8 }}>小明同学</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="badge badge-warm"><FireIcon size={14} /> 连续7天</span>
            <span className="badge badge-green"><StarIcon size={14} filled /> Lv.12</span>
          </div>
        </div>
        <div className="float-anim">
          <OwlMascot size={90} mood="happy" />
        </div>
      </div>

      {/* Today's Tasks */}
      <div className="section-title">📋 今日任务</div>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)" }}>待复习单词</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: "var(--warm-600)" }}>{todayWords.length}<span style={{ fontSize: 16, color: "var(--text-secondary)" }}> 个</span></div>
          </div>
          <div className="stats-ring">
            <svg width="72" height="72" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="30" fill="none" stroke="var(--warm-100)" strokeWidth="6" />
              <circle cx="36" cy="36" r="30" fill="none" stroke="url(#grad1)" strokeWidth="6" strokeDasharray={`${0.65 * 188} ${188}`} strokeLinecap="round" transform="rotate(-90 36 36)" />
              <defs>
                <linearGradient id="grad1" x1="0%" y1="0%" x2="100%">
                  <stop offset="0%" stopColor="var(--warm-400)" />
                  <stop offset="100%" stopColor="var(--orange-400)" />
                </linearGradient>
              </defs>
            </svg>
            <div className="stats-ring-text">
              <span>65%</span>
              <span className="stats-ring-label">完成</span>
            </div>
          </div>
        </div>
        <div className="progress-track" style={{ marginBottom: 12 }}>
          <div className="progress-fill" style={{ width: "65%" }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-primary" style={{ flex: 2 }}>开始复习</button>
          <button className="btn-outline" style={{ flex: 1, padding: "12px 8px" }}>测验</button>
        </div>
      </div>

      {/* Quick Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "总词汇", value: "128", icon: "📚" },
          { label: "已掌握", value: "43", icon: "✅" },
          { label: "正确率", value: "78%", icon: "🎯" },
        ].map((s, i) => (
          <div key={i} className="card" style={{ textAlign: "center", padding: 14, animationDelay: `${i * 0.1}s` }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "var(--warm-700)" }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Streak Calendar */}
      <div className="section-title">🔥 打卡日历 · 四月</div>
      <div className="card">
        <div className="streak-grid" style={{ marginBottom: 12 }}>
          {["一","二","三","四","五","六","日"].map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--text-light)", marginBottom: 2 }}>{d}</div>
          ))}
          {streakDays.map(d => (
            <div key={d} className={`streak-day ${d < doneUntil ? "done" : d === 30 ? "today" : "future"}`}>
              {d < doneUntil && "✓"}
              {d >= doneUntil && d}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
          <FireIcon />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--warm-600)" }}>已连续打卡 7 天，继续加油！</span>
        </div>
      </div>
    </div>
  );
};

// PAGE 2: CAMERA / OCR
const CameraPage = () => {
  const { user } = useAuth()
  const [preview, setPreview] = useState(null)
  const [words, setWords] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [status, setStatus] = useState("idle")
  const [error, setError] = useState("")
  const [savedCount, setSavedCount] = useState(0)
  const fileRef = useRef(null)

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPreview(URL.createObjectURL(file))
    setStatus("scanning")
    setError("")
    try {
      const base64 = await toBase64(file)
      const mediaType = file.type || "image/jpeg"
      const found = await recognizeWords(base64, mediaType)
      setWords(found)
      setSelected(new Set(found))
      setStatus("confirming")
    } catch (err) {
      setError("识别失败，请重试")
      setStatus("idle")
    }
  }

  const toggle = (w) => setSelected(prev => {
    const next = new Set(prev)
    next.has(w) ? next.delete(w) : next.add(w)
    return next
  })

const handleSave = async () => {
    if (!selected.size || !user) return
    setStatus("saving")
    setError("")
    try {
      const wordList = [...selected]
      let wordsToAdd
      try {
        const results = await batchLookup(wordList)
        wordsToAdd = results.map(item => ({
          word: item.word,
          meaning: item.definition || '',
          phonetic: item.phonetic || '',
        }))
      } catch {
        wordsToAdd = wordList.map(w => ({ word: w, meaning: '', phonetic: '' }))
      }
      const saved = await batchAddWords(wordsToAdd)
      setSavedCount(saved.length)
      setStatus("done")
      setTimeout(() => {
        setPreview(null); setWords([]); setSelected(new Set()); setStatus("idle")
      }, 2000)
    } catch (err) {
      setError("保存失败，请重试")
      setStatus("idle")
    }
  }

  return (
    <div className="page-content" style={{ paddingTop: 8 }}>
      <div className="page-label">拍照识别</div>
      <div className="page-heading">拍一拍，记单词 📸</div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment"
        onChange={handleFile} style={{ display: "none" }} />

      {status === "idle" && (
        <>
          <div className="camera-viewfinder" onClick={() => fileRef.current?.click()} style={{ cursor: "pointer" }}>
            <div className="camera-frame">
              <CameraIcon size={36} />
              <div className="camera-frame-text">点击拍照或选择图片</div>
            </div>
          </div>
          <button className="shutter-btn" onClick={() => fileRef.current?.click()}>
            <div className="shutter-inner" />
          </button>
          <div style={{ textAlign: "center", fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>
            支持拍照或从相册选取，圈划的单词将被自动识别
          </div>
          {error && <div style={{ textAlign: "center", color: "var(--coral-500)", marginTop: 12, fontWeight: 700 }}>{error}</div>}
        </>
      )}

      {status === "scanning" && (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          {preview && <img src={preview} alt="预览" style={{ width: "100%", borderRadius: 12, marginBottom: 16, maxHeight: 200, objectFit: "cover" }} />}
          <div className="scan-line" style={{ position: "relative", margin: "0 auto 16px", width: "80%", height: 2, background: "var(--warm-400)", animation: "shimmer 1.5s linear infinite" }} />
          <div style={{ fontWeight: 700, color: "var(--warm-600)" }}>AI 正在识别单词...</div>
        </div>
      )}

      {status === "confirming" && (
        <div style={{ animation: "fadeUp 0.4s ease-out" }}>
          {preview && <img src={preview} alt="预览" style={{ width: "100%", borderRadius: 16, marginBottom: 12, maxHeight: 180, objectFit: "cover" }} />}
          <div className="card" style={{ background: "linear-gradient(135deg, #FEF3C7, #FFEDD5)", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle size={22} />
              <span style={{ fontWeight: 800, fontSize: 16, color: "var(--warm-700)" }}>识别完成！</span>
              <span className="badge badge-warm" style={{ marginLeft: "auto" }}>发现 {words.length} 个单词</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600, marginTop: 8 }}>
              点击选择要收录的单词：
            </div>
          </div>
          <div className="card" style={{ padding: 16 }}>
            {words.length === 0
              ? <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 20 }}>未识别到单词，请重试</div>
              : <div style={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
                  {words.map(w => (
                    <div key={w} className={`word-chip ${selected.has(w) ? "selected" : "unselected"}`} onClick={() => toggle(w)}>
                      {selected.has(w) ? "✓" : "+"} {w}
                    </div>
                  ))}
                </div>
            }
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button className="btn-outline" style={{ flex: 1 }} onClick={() => { setStatus("idle"); setPreview(null) }}>重拍</button>
            <button className="btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={!selected.size}>
              收录 {selected.size} 个单词 →
            </button>
          </div>
        </div>
      )}

      {status === "saving" && (
        <div className="card" style={{ textAlign: "center", padding: 40 }}>
          <div style={{ fontWeight: 700, color: "var(--warm-600)" }}>正在查询释义并保存...</div>
        </div>
      )}

      {status === "done" && (
        <div className="card" style={{ textAlign: "center", padding: 40, animation: "bounceIn 0.5s ease-out" }}>
          <OwlMascot size={80} mood="celebrate" />
          <div style={{ fontWeight: 800, fontSize: 18, color: "var(--warm-700)", marginTop: 12 }}>
            成功收录 {savedCount} 个单词！🎉
          </div>
        </div>
      )}
    </div>
  )
}

// PAGE 3: WORD BOOK
const WordBookPage = ({ onSelectWord }) => {
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  const filteredWords = sampleWords.filter(w => {
    if (filter === "today") return w.nextReview === "今天";
    if (filter === "mastered") return w.stage >= 5;
    return true;
  });

  return (
    <div className="page-content" style={{ paddingTop: 8 }}>
      <div className="page-label">单词本</div>
      <div className="page-heading">我的词库 📖</div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
        {[
          { key: "all", label: "全部", count: sampleWords.length },
          { key: "today", label: "今日复习", count: sampleWords.filter(w => w.nextReview === "今天").length },
          { key: "mastered", label: "已掌握", count: sampleWords.filter(w => w.stage >= 5).length },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: "8px 16px",
              borderRadius: 20,
              border: "none",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap",
              background: filter === f.key ? "linear-gradient(135deg, var(--warm-400), var(--orange-400))" : "var(--warm-50)",
              color: filter === f.key ? "white" : "var(--text-secondary)",
              boxShadow: filter === f.key ? "0 2px 8px rgba(249,115,22,0.25)" : "none",
              transition: "all 0.2s",
            }}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Word List */}
      <div className="card" style={{ padding: "8px 20px" }}>
        {filteredWords.map((w, i) => (
          <div
            key={w.id}
            className="word-item"
            onClick={() => onSelectWord?.(w)}
            style={{ animationDelay: `${i * 0.05}s`, animation: "slideRight 0.3s ease-out backwards" }}
          >
            <div className="word-stage-dot" style={{ background: stageColors[w.stage] }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontSize: 17, fontWeight: 800 }}>{w.word}</span>
                <span style={{ fontSize: 12, color: "var(--text-light)", fontWeight: 600 }}>{w.phonetic}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600, marginTop: 2 }}>{w.meaning}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ 
                fontSize: 11, fontWeight: 800, 
                color: stageColors[w.stage],
                padding: "2px 8px",
                borderRadius: 10,
                background: `${stageColors[w.stage]}15`,
              }}>
                {stageLabels[w.stage]}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-light)", fontWeight: 600, marginTop: 4 }}>
                {w.nextReview === "今天" ? "⏰ 今天" : w.nextReview}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Ebbinghaus Legend */}
      <div className="card" style={{ marginTop: 8, padding: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "var(--text-secondary)" }}>📈 艾宾浩斯记忆阶段</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {stageLabels.map((l, i) => (
            <span key={i} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              fontSize: 11, fontWeight: 700, padding: "3px 8px",
              borderRadius: 10, background: `${stageColors[i]}15`, color: stageColors[i],
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: stageColors[i] }} />
              {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// PAGE 4: FLASHCARD LEARNING
const FlashcardPage = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const todayWords = sampleWords.filter(w => w.nextReview === "今天");
  const word = todayWords[currentIndex] || todayWords[0];

  const handleNext = (known) => {
    setFlipped(false);
    setTimeout(() => {
      setCurrentIndex((currentIndex + 1) % todayWords.length);
    }, 300);
  };

  return (
    <div className="page-content" style={{ paddingTop: 8 }}>
      <div className="page-label">学习模式</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div className="page-heading" style={{ marginBottom: 0 }}>翻转卡片 🃏</div>
        <span className="badge badge-warm">{currentIndex + 1} / {todayWords.length}</span>
      </div>

      {/* Progress */}
      <div className="progress-track" style={{ marginBottom: 12, height: 6 }}>
        <div className="progress-fill" style={{ width: `${((currentIndex + 1) / todayWords.length) * 100}%` }} />
      </div>

      {/* Flashcard */}
      <div className="flashcard-container">
        <div className={`flashcard ${flipped ? "flipped" : ""}`} onClick={() => setFlipped(!flipped)}>
          <div className="flashcard-face flashcard-front">
            <div style={{ position: "absolute", top: 16, right: 20 }}>
              <span style={{
                fontSize: 11, fontWeight: 800, padding: "3px 10px",
                borderRadius: 10, background: `${stageColors[word.stage]}15`, color: stageColors[word.stage],
              }}>
                {stageLabels[word.stage]}
              </span>
            </div>
            <div className="flashcard-word">{word.word}</div>
            <div className="flashcard-phonetic">{word.phonetic}</div>
            <button style={{
              background: "none", border: "2px solid var(--warm-300)", borderRadius: "50%",
              width: 44, height: 44, cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center", marginTop: 8,
              color: "var(--warm-500)", transition: "all 0.2s",
            }} onClick={(e) => { e.stopPropagation(); }}>
              <SpeakerIcon size={22} />
            </button>
            <div className="flashcard-hint">👆 点击卡片翻转查看释义</div>
          </div>
          <div className="flashcard-face flashcard-back">
            <div style={{ fontSize: 18, marginBottom: 8 }}>🎯</div>
            <div className="flashcard-meaning">{word.meaning}</div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", fontWeight: 600, marginTop: 8, textAlign: "center", fontStyle: "italic" }}>
              "Hard work can accomplish great things."
            </div>
            <div className="flashcard-hint">👆 再次点击翻转回正面</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <button
          className="btn-outline"
          style={{ flex: 1, borderColor: "#FECACA", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
          onClick={() => handleNext(false)}
        >
          <XCircle size={18} /> 不认识
        </button>
        <button
          className="btn-primary"
          style={{ flex: 1, background: "linear-gradient(135deg, #4ADE80, #22C55E)", boxShadow: "0 4px 14px rgba(34,197,94,0.3)" }}
          onClick={() => handleNext(true)}
        >
          <CheckCircle size={18} /> 认识
        </button>
      </div>

      {/* Mini mascot encouragement */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 20, justifyContent: "center" }}>
        <OwlMascot size={46} mood="wink" />
        <div style={{
          background: "var(--warm-100)", padding: "8px 14px",
          borderRadius: "14px 14px 14px 4px", fontSize: 13, fontWeight: 600, color: "var(--warm-700)",
        }}>
          加油！你已经复习了 {currentIndex + 1} 个单词啦~
        </div>
      </div>
    </div>
  );
};

// PAGE 5: QUIZ
const QuizPage = () => {
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [showResult, setShowResult] = useState(false);

  const q = quizQuestions[currentQ];

  const handleSelect = (opt) => {
    if (answered) return;
    setSelected(opt);
    setAnswered(true);
    if (opt === q.correct) {
      setScore(prev => ({ correct: prev.correct + 1, total: prev.total + 1 }));
    } else {
      setScore(prev => ({ ...prev, total: prev.total + 1 }));
    }
  };

  const handleNext = () => {
    if (currentQ < quizQuestions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setShowResult(true);
    }
  };

  const getGrade = (rate) => {
    if (rate >= 0.95) return { label: "夯 🏆", color: "#6366F1", desc: "无敌了！单词已刻入DNA" };
    if (rate >= 0.8) return { label: "稳 💪", color: "#22C55E", desc: "非常棒，继续保持！" };
    if (rate >= 0.6) return { label: "行 👍", color: "#FBBF24", desc: "还不错，再练练更好" };
    if (rate >= 0.4) return { label: "飘 😅", color: "#F97316", desc: "有点悬，需要多复习" };
    return { label: "拉 😵", color: "#EF4444", desc: "别灰心，重新来过！" };
  };

  if (showResult) {
    const rate = score.correct / score.total;
    const grade = getGrade(rate);
    return (
      <div className="page-content" style={{ paddingTop: 8, textAlign: "center" }}>
        <div className="bounce-in">
          <OwlMascot size={110} mood={rate >= 0.6 ? "celebrate" : "sad"} />
        </div>
        <div className="card" style={{ marginTop: 16, padding: 28 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>测验结果</div>
          <div style={{ fontSize: 52, fontWeight: 900, color: grade.color, marginBottom: 4 }}>
            {grade.label}
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 20 }}>
            {grade.desc}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "var(--green-500)" }}>{score.correct}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>正确</div>
            </div>
            <div style={{ width: 1, background: "var(--warm-200)" }} />
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "var(--coral-500)" }}>{score.total - score.correct}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>错误</div>
            </div>
            <div style={{ width: 1, background: "var(--warm-200)" }} />
            <div>
              <div style={{ fontSize: 28, fontWeight: 900, color: "var(--warm-600)" }}>{Math.round(rate * 100)}%</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>正确率</div>
            </div>
          </div>

          {/* Mini Leaderboard */}
          <div style={{ borderTop: "1px solid var(--warm-100)", paddingTop: 16, marginTop: 4 }}>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 12, display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
              <TrophyIcon /> 好友排行榜
            </div>
            {[
              { name: "学霸小王", rate: "96%", grade: "夯", avatar: "👑" },
              { name: "小明同学", rate: `${Math.round(rate * 100)}%`, grade: grade.label.split(" ")[0], avatar: "🧑", isMe: true },
              { name: "英语达人", rate: "72%", grade: "行", avatar: "🌟" },
            ].sort((a,b) => parseInt(b.rate) - parseInt(a.rate)).map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
                borderRadius: 14, marginBottom: 6,
                background: f.isMe ? "var(--warm-50)" : "transparent",
                border: f.isMe ? "2px solid var(--warm-300)" : "2px solid transparent",
              }}>
                <span style={{ fontSize: 16, fontWeight: 900, color: i === 0 ? "#FBBF24" : "var(--text-light)", width: 20 }}>{i + 1}</span>
                <span style={{ fontSize: 20 }}>{f.avatar}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: f.isMe ? "var(--warm-700)" : "var(--text-primary)" }}>
                  {f.name} {f.isMe && <span style={{ fontSize: 11, color: "var(--warm-500)" }}>（我）</span>}
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "var(--warm-600)" }}>{f.rate}</span>
              </div>
            ))}
          </div>
        </div>
        <button className="btn-primary" style={{ marginTop: 12 }} onClick={() => { setShowResult(false); setCurrentQ(0); setScore({correct:0,total:0}); setSelected(null); setAnswered(false); }}>
          再来一轮 🔄
        </button>
      </div>
    );
  }

  return (
    <div className="page-content" style={{ paddingTop: 8 }}>
      <div className="page-label">单词测验</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div className="page-heading" style={{ marginBottom: 0 }}>选择正确释义 🧠</div>
        <span className="badge badge-warm">{currentQ + 1} / {quizQuestions.length}</span>
      </div>

      <div className="progress-track" style={{ marginBottom: 20, height: 6 }}>
        <div className="progress-fill" style={{ width: `${((currentQ + 1) / quizQuestions.length) * 100}%` }} />
      </div>

      {/* Question Card */}
      <div className="card" style={{
        textAlign: "center", padding: 28,
        background: "linear-gradient(145deg, #FFF7ED, #FFEDD5)",
        marginBottom: 20,
      }}>
        <span className="badge badge-blue" style={{ marginBottom: 12 }}>
          {q.type === "similar" ? "🔀 近义辨析" : "📝 词义选择"}
        </span>
        <div style={{ fontSize: 34, fontWeight: 900, color: "var(--warm-700)", marginTop: 8 }}>{q.word}</div>
        <button style={{
          background: "none", border: "none", cursor: "pointer",
          color: "var(--warm-500)", marginTop: 8, display: "inline-flex",
          alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, fontFamily: "inherit",
        }}>
          <SpeakerIcon size={16} /> 播放发音
        </button>
      </div>

      {/* Options */}
      {q.options.map((opt, i) => {
        let optClass = "quiz-option";
        if (answered) {
          if (opt === q.correct) optClass += " correct";
          else if (opt === selected && opt !== q.correct) optClass += " wrong";
        } else if (opt === selected) {
          optClass += " selected";
        }
        return (
          <button
            key={i}
            className={optClass}
            onClick={() => handleSelect(opt)}
            style={{ animation: `slideRight 0.3s ease-out ${i * 0.08}s backwards` }}
          >
            <div className="quiz-option-label">
              {answered && opt === q.correct ? "✓" : answered && opt === selected && opt !== q.correct ? "✗" : String.fromCharCode(65 + i)}
            </div>
            <span>{opt}</span>
          </button>
        );
      })}

      {answered && (
        <div style={{ animation: "fadeUp 0.3s ease-out", marginTop: 8 }}>
          <div className="card" style={{
            display: "flex", alignItems: "center", gap: 10, padding: 14,
            background: selected === q.correct ? "var(--green-50)" : "var(--coral-50)",
            border: `2px solid ${selected === q.correct ? "var(--green-400)" : "var(--coral-400)"}`,
          }}>
            {selected === q.correct ? <CheckCircle /> : <XCircle />}
            <span style={{ fontSize: 14, fontWeight: 700, color: selected === q.correct ? "#15803D" : "#E11D48" }}>
              {selected === q.correct ? "回答正确！太棒了~" : `正确答案是：${q.correct}`}
            </span>
          </div>
          <button className="btn-primary" style={{ marginTop: 12 }} onClick={handleNext}>
            {currentQ < quizQuestions.length - 1 ? "下一题 →" : "查看结果 🎉"}
          </button>
        </div>
      )}

      {/* Score indicator */}
      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 20 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--green-500)" }}>✓ {score.correct}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--coral-500)" }}>✗ {score.total - score.correct}</span>
      </div>
    </div>
  );
};

// ============ MAIN APP ============
export default function WordWiseApp() {
  const [activePage, setActivePage] = useState("home");
  const { user, loading } = useAuth();
  const { words, addWords, deleteWord } = useWords();

  // 加载中
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-main)" }}>
        <OwlMascot size={80} mood="thinking" className="float-anim" />
      </div>
    );
  }

  // 未登录，显示登录页
  if (!user) {
    return (
      <>
        <style>{styles}</style>
        <LoginPage onLogin={() => {}} />
      </>
    );
  }

  const pages = {
    home: <HomePage words={words} />,
    camera: <CameraPage />,
    wordbook: <WordBookPage words={words} onDeleteWord={deleteWord} />,
    flashcard: <FlashcardPage words={words} />,
    quiz: <QuizPage />,
  };

  return (
    <>
      <style>{styles}</style>
      <div className="app-container">
        <div className="bg-pattern" />
        
        {/* Header */}
        <div className="header" style={{ position: "relative", zIndex: 10 }}>
          <div className="header-title">WordWise 🦉</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => signOut()} style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer" }}>
              退出
            </button>
            <div className="header-avatar">{user.email?.[0].toUpperCase()}</div>
          </div>
        </div>

        {/* Page Content */}
        <div key={activePage} style={{ position: "relative", zIndex: 1 }}>
          {pages[activePage]}
        </div>

        {/* Tab Bar */}
        <div className="tab-bar">
          <button className={`tab-item ${activePage === "home" ? "active" : ""}`} onClick={() => setActivePage("home")}>
            <HomeIcon size={22} /><span>首页</span>
          </button>
          <button className={`tab-item ${activePage === "wordbook" ? "active" : ""}`} onClick={() => setActivePage("wordbook")}>
            <BookIcon size={22} /><span>词库</span>
          </button>
          <button className="tab-item camera-tab" onClick={() => setActivePage("camera")}>
            <CameraIcon size={26} />
          </button>
          <button className={`tab-item ${activePage === "flashcard" ? "active" : ""}`} onClick={() => setActivePage("flashcard")}>
            <FlashcardIcon size={22} /><span>学习</span>
          </button>
          <button className={`tab-item ${activePage === "quiz" ? "active" : ""}`} onClick={() => setActivePage("quiz")}>
            <QuizIcon size={22} /><span>测验</span>
          </button>
        </div>
      </div>
    </>
  );
}
