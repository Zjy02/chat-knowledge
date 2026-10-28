import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { App as AntdApp, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AntdMessageBridge } from './components/AntdMessageBridge';
import { store } from './store';
import { antdTheme } from './theme';
import 'antd/dist/reset.css';
import './styles/tokens.css';
import './styles/app.css';
import './styles/chat.css';
import './styles/knowledge.css';
import './styles/auth.css';
import './styles/antd.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <ConfigProvider locale={zhCN} theme={antdTheme} button={{ autoInsertSpace: false }}>
        <AntdApp>
          <BrowserRouter>
            <AntdMessageBridge />
            <App />
          </BrowserRouter>
        </AntdApp>
      </ConfigProvider>
    </Provider>
  </StrictMode>,
);
