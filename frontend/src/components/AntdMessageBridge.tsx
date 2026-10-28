import { App as AntdApp } from 'antd';
import { useEffect } from 'react';
import { bindMessageApi } from '../store/notify';

/**
 * Ant Design's message API is context-aware. Redux thunks live outside React,
 * so this bridge exposes the mounted message instance to the notify helper.
 */
export function AntdMessageBridge() {
  const { message } = AntdApp.useApp();

  useEffect(() => {
    bindMessageApi(message);
    return () => bindMessageApi(null);
  }, [message]);

  return null;
}
