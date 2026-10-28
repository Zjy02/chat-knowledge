import type { MessageInstance } from 'antd/es/message/interface';

// Redux thunks are not React components, so they cannot call App.useApp().
// The bridge registers Ant Design's context-aware message instance at runtime.
let messageApi: MessageInstance | null = null;

export function bindMessageApi(instance: MessageInstance | null) {
  messageApi = instance;
}

export const notify = {
  success: (content: string) => messageApi?.success(content),
  error: (content: string) => messageApi?.error(content),
  info: (content: string) => messageApi?.info(content),
  warning: (content: string) => messageApi?.warning(content),
};
