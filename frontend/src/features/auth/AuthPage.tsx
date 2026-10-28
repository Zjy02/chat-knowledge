import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Alert, Button, Form, Input } from 'antd';
import {
  ArrowRightOutlined,
  BookOutlined,
  ExperimentOutlined,
  LockOutlined,
  MailOutlined,
  MessageOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Logo } from '../../components/Logo';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearError, login, register } from '../../store/slices/authSlice';

interface AuthPageProps {
  mode: 'login' | 'register';
}

interface AuthFormValues {
  name?: string;
  email: string;
  password: string;
}

export function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [form] = Form.useForm<AuthFormValues>();
  const status = useAppSelector((state) => state.auth.status);
  const user = useAppSelector((state) => state.auth.user);
  const error = useAppSelector((state) => state.auth.error);
  const isLogin = mode === 'login';
  const loading = status === 'loading';

  if (user && status === 'authenticated') {
    return <Navigate to="/chat" replace />;
  }

  const submit = async (values: AuthFormValues) => {
    dispatch(clearError());
    try {
      if (isLogin) {
        await dispatch(
          login({ email: values.email.trim().toLowerCase(), password: values.password }),
        ).unwrap();
      } else {
        await dispatch(
          register({
            email: values.email.trim().toLowerCase(),
            password: values.password,
            name: values.name?.trim() || '',
          }),
        ).unwrap();
      }
      navigate('/chat', { replace: true });
    } catch {
      // The slice already exposes a user-facing error message.
    }
  };

  const demoLogin = async () => {
    dispatch(clearError());
    form.setFieldsValue({ email: 'demo@zhiwen.app', password: 'Demo1234' });
    try {
      await dispatch(login({ email: 'demo@zhiwen.app', password: 'Demo1234' })).unwrap();
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
          <span className="auth-badge">KNOWLEDGE AI</span>
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
              <BookOutlined />
              <span>
                <b>个人知识库</b>
                资料仅你可见
              </span>
            </div>
            <div>
              <MessageOutlined />
              <span>
                <b>流式回答</b>
                SSE 逐字呈现
              </span>
            </div>
            <div>
              <SafetyCertificateOutlined />
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

          <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            onFinish={submit}
            autoComplete="off"
            className="auth-form"
          >
            {!isLogin && (
              <Form.Item
                label="昵称"
                name="name"
                rules={[{ required: true, message: '请填写你的昵称' }]}
              >
                <Input
                  size="large"
                  prefix={<UserOutlined />}
                  placeholder="怎么称呼你？"
                  maxLength={50}
                />
              </Form.Item>
            )}
            <Form.Item
              label="邮箱"
              name="email"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效的邮箱地址' },
              ]}
            >
              <Input
                size="large"
                prefix={<MailOutlined />}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Form.Item>
            <Form.Item
              label="密码"
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 8, message: '密码至少 8 位' },
                ...(isLogin
                  ? []
                  : [
                      {
                        pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
                        message: '密码需同时包含字母和数字',
                      },
                    ]),
              ]}
            >
              <Input.Password
                size="large"
                prefix={<LockOutlined />}
                placeholder={isLogin ? '输入密码' : '至少 8 位，包含字母和数字'}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                maxLength={72}
              />
            </Form.Item>

            {error && <Alert className="auth-alert" type="error" showIcon message={error} />}

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              className="auth-submit"
            >
              {isLogin ? '登录' : '创建账号'}
              {!loading && <ArrowRightOutlined />}
            </Button>
          </Form>

          {isLogin && (
            <Button
              type="dashed"
              block
              className="demo-login"
              icon={<ExperimentOutlined />}
              onClick={demoLogin}
              disabled={loading}
            >
              体验演示账号
              <span className="demo-account">demo@zhiwen.app · Demo1234</span>
            </Button>
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
