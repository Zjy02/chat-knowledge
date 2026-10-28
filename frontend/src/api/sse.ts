import { API_BASE, ApiError, tokenStorage } from './client';
import type { ChatStreamHandlers, ChatStreamPayload } from '../types';

interface SseFrame {
  event: string;
  data: string;
}

function parseFrame(block: string): SseFrame | null {
  const lines = block.split('\n');
  let event = 'message';
  const data: string[] = [];
  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    if (line.startsWith('event:')) event = line.slice(6).trim();
    if (line.startsWith('data:')) data.push(line.slice(5).trim());
  }
  if (!data.length) return null;
  return { event, data: data.join('\n') };
}

/**
 * POST + ReadableStream SSE client.
 *
 * We intentionally do not use EventSource: the API needs POST, an
 * Authorization header and AbortController support, none of which EventSource
 * provides. The parser buffers across chunks because a frame may be split.
 */
export async function streamChat(
  payload: ChatStreamPayload,
  handlers: ChatStreamHandlers,
  signal: AbortSignal,
): Promise<void> {
  const token = tokenStorage.get();
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('无法连接问答服务，请稍后重试', 'NETWORK_ERROR');
  }

  if (!response.ok) {
    let message = `请求失败（${response.status}）`;
    let code = 'REQUEST_FAILED';
    try {
      const body = await response.json();
      message = body.message || message;
      code = body.code || code;
    } catch {
      // keep fallback message
    }
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('zhiwen:unauthorized'));
    }
    throw new ApiError(message, code, response.status);
  }
  if (!response.body) {
    throw new ApiError('浏览器不支持流式响应', 'STREAM_UNSUPPORTED');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let finished = false;

  const dispatch = (frame: SseFrame) => {
    let data: unknown;
    try {
      data = JSON.parse(frame.data);
    } catch {
      return;
    }
    if (frame.event === 'meta') handlers.onMeta(data as never);
    if (frame.event === 'citations') {
      const payload = data as { citations: never[] };
      handlers.onCitations(payload.citations || []);
    }
    if (frame.event === 'delta') {
      handlers.onDelta((data as { content: string }).content || '');
    }
    if (frame.event === 'done') {
      finished = true;
      handlers.onDone(data as never);
    }
    if (frame.event === 'error') {
      finished = true;
      handlers.onError((data as { message: string }).message || '生成失败，请重试');
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);
      if (block && !block.startsWith(':')) {
        const frame = parseFrame(block);
        if (frame) dispatch(frame);
      }
      boundary = buffer.indexOf('\n\n');
    }
  }

  // Flush a final frame if the proxy closed without a trailing blank line.
  const tail = buffer.trim();
  if (tail && !tail.startsWith(':')) {
    const frame = parseFrame(tail);
    if (frame) dispatch(frame);
  }
  if (!finished) {
    handlers.onError('连接意外中断，请重试');
  }
}
