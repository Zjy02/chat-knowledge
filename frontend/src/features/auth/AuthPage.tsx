import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';
import { Logo } from '../../components/Logo';
import { useAuthStore } from '../../stores/authStore';

interface AuthPageProps {
  mode: 'login' | 'register';
}

export function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const clearError = useAuthStore((state) => state.clearError);
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const error = useAuthStore((state) => state.error);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  if (user && status === 'authenticated') {
    return <Navigate to="/chat" replace />;
  }

  const isLogin = mode === 'login';
  const loading = status === 'loading';

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    setLocalError('');
    clearError();
    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setLocalError('请输入有效的邮箱地址');
      return;
    }
    if (password.length < 8) {
      setLocalError('密码至少 8 位');
      return;
    }
    if (!isLogin && name.trim().length === 0) {
      setLocalError('请填写你的昵称');
      return;
    }
    try {
      if (isLogin) {
        await login(normalizedEmail, password);
      } else {
        await register(normalizedEmail, password, name.trim());
      }
      navigate('/chat', { replace: true });
    } catch {
      // The store exposes a friendly error message; keep the form mounted.
    }
  };

  const demoLogin = async () => {
    setLocalError('');
    clearError();
    setEmail('demo@zhiwen.app');
    setPassword('Demo1234');
    try {
      await login('demo@zhiwen.app', 'Demo1234');
      navigate('/chat', { replace: true });
    } catch {
      // Error is shown from the store.
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-story">
        <div className="auth-story-grid" aria-hidden="true" />
        <div className="auth-story-top">
          <Logo />
          <span className="auth-badge">
            <Sparkles size={11} /> KNOWLEDGE AI
          </span>
        </div>
        <div className="auth-story-main">
          <div className="story-eyebrow">PERSONAL KNOWLEDGE WORKSPACE</div>
          <h1>
            把资料，
            <br />
            变成<em>可追问</em>的答案。
          </h1>
          <p>上传笔记、手册与论文，知问会检索你的资料，逐字给出回答，并把每一句结论标回原文。</p>
          <div className="story-features">
            <div>
              <BookOpen size={16} />
              <span>
                <b>个人知识库</b>
                资料仅你可见
              </span>
            </div>
            <div>
              <MessageSquare size={16} />
              <span>
                <b>流式回答</b>
                SSE 逐字呈现
              </span>
            </div>
            <div>
              <ShieldCheck size={16} />
              <span>
                <b>可溯源引用</b>
                点开即看原文
              </span>
            </div>
          </div>
        </div>
        <div className="auth-story-foot">
          <div className="story-quote">“ 不确定时承认不确定，比编造一个答案更重要。 ”</div>
          <div className="story-meta">
            <span>知问 · 产品原则 01</span>
            <span>CHAT-KNOWLEDGE / 2026</span>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-mobile-brand">
          <Logo />
        </div>
        <div className="auth-card">
          <div className="auth-card-head">
            <span className="auth-kicker">{isLogin ? 'WELCOME BACK' : 'CREATE ACCOUNT'}</span>
            <h2>{isLogin ? '继续你的知识对话' : '创建你的知识工作台'}</h2>
            <p>
              {isLogin
                ? '登录后继续之前的会话，或从知识库开始新的提问。'
                : '注册后即可上传资料、开始带引用的流式问答。'}
            </p>
          </div>

          <form onSubmit={submit} noValidate>
            {!isLogin && (
              <label className="auth-field">
                <span>昵称</span>
                <div className="auth-input">
                  <User size={15} />
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="怎么称呼你？"
                    autoComplete="name"
                    maxLength={50}
                  />
                </div>
              </label>
            )}
            <label className="auth-field">
              <span>邮箱</span>
              <div className="auth-input">
                <Mail size={15} />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </label>
            <label className="auth-field">
              <span>密码</span>
              <div className="auth-input">
                <Lock size={15} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={isLogin ? '输入密码' : '至少 8 位，包含字母和数字'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  maxLength={72}
                />
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>

            {(localError || error) && <div className="auth-error">{localError || error}</div>}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? '请稍候…' : isLogin ? '登录' : '创建账号'}
              {!loading && <ArrowRight size={15} />}
            </button>
          </form>

          {isLogin && (
            <button type="button" className="demo-login" onClick={demoLogin} disabled={loading}>
              <Sparkles size={13} />
              体验演示账号
              <span>demo@zhiwen.app · Demo1234</span>
            </button>
          )}

          <div className="auth-switch">
            {isLogin ? (
              <>
                还没有账号？<Link to="/register">立即注册</Link>
              </>
            ) : (
              <>
                已有账号？<Link to="/login">返回登录</Link>
              </>
            )}
          </div>
          <div className="auth-legal">
            继续即表示你同意本地演示环境的使用约定。资料不会离开你的服务器。
          </div>
        </div>
      </section>
    </div>
  );
}
