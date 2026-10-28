import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './client';
import { streamChat } from './sse';
import type { ChatStreamHandlers } from '../types';

function createHandlers(): ChatStreamHandlers & {
  events: string[];
} {
  const events: string[] = [];
  return {
    events,
    onMeta: (meta) => events.push(`meta:${meta.conversation_id}`),
    onCitations: (citations) => events.push(`citations:${citations.length}`),
    onDelta: (content) => events.push(`delta:${content}`),
    onDone: (done) => events.push(`done:${done.status}`),
    onError: (message) => events.push(`error:${message}`),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('streamChat', () => {
  it('parses SSE frames split across chunks', async () => {
    const body =
      'event: meta\ndata: {"conversation_id":7,"user_message_id":1,"assistant_message_id":2,"title":"t","model":"m","use_knowledge":true,"regenerated":false}\n\n' +
      'event: citations\ndata: {"citations":[{"index":1}]}\n\n' +
      'event: delta\ndata: {"content":"你"}\n\n' +
      'event: delta\ndata: {"content":"好"}\n\n' +
      ': ping\n\n' +
      'event: done\ndata: {"assistant_message_id":2,"latency_ms":12,"content_length":2,"status":"completed"}\n\n';
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(body.slice(0, 17)));
        controller.enqueue(encoder.encode(body.slice(17, 80)));
        controller.enqueue(encoder.encode(body.slice(80)));
        controller.close();
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(stream, { status: 200 })));
    const handlers = createHandlers();
    await streamChat(
      { message: 'hi', use_knowledge: true },
      handlers,
      new AbortController().signal,
    );
    expect(handlers.events).toEqual([
      'meta:7',
      'citations:1',
      'delta:你',
      'delta:好',
      'done:completed',
    ]);
  });

  it('reports an unexpected disconnect', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('event: delta\ndata: {"content":"x"}\n\n', { status: 200 }),
        ),
    );
    const handlers = createHandlers();
    await streamChat(
      { message: 'hi', use_knowledge: false },
      handlers,
      new AbortController().signal,
    );
    expect(handlers.events).toContain('error:连接意外中断，请重试');
  });

  it('throws a typed error for HTTP failures', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 'RATE_LIMITED', message: '太快了' }), {
          status: 429,
        }),
      ),
    );
    await expect(
      streamChat(
        { message: 'hi', use_knowledge: false },
        createHandlers(),
        new AbortController().signal,
      ),
    ).rejects.toBeInstanceOf(ApiError);
  });
});
