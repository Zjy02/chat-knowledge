import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { conversationsApi, streamChat } from '../../api';
import { ApiError } from '../../api/client';
import { CitationModal } from '../../components/CitationModal';
import { notify } from '../../store/notify';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { loadConversations, setActive, upsert } from '../../store/slices/conversationsSlice';
import { refreshStats, uploadDocument } from '../../store/slices/knowledgeSlice';
import { truncate } from '../../utils/format';
import type { ChatStreamPayload, Citation, Message } from '../../types';
import { ChatComposer } from './components/ChatComposer';
import { ContextRail } from './components/ContextRail';
import { EmptyChat } from './components/EmptyChat';
import { MessageItem } from './components/MessageItem';
import { Topbar } from './components/Topbar';

function nowIso() {
  return new Date().toISOString();
}

export function ChatPage() {
  const { conversationId: routeParam } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [messages, setMessages] = useState<Message[]>([]);
  const [title, setTitle] = useState('新对话');
  const [input, setInput] = useState('');
  const [useKnowledge, setUseKnowledge] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('DeepSeek · chat');
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  const conversationIdRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const runIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastNewChatKey = useRef(0);

  const newChatKey = useAppSelector((state) => state.conversations.newChatKey);
  const stats = useAppSelector((state) => state.knowledge.stats);

  // Cancels any in-flight stream and clears working state. Incrementing the run
  // id prevents late SSE callbacks from writing into the next conversation.
  const resetChat = useCallback(() => {
    runIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    conversationIdRef.current = null;
    setMessages([]);
    setTitle('新对话');
    setInput('');
    setStreaming(false);
    setLoading(false);
    setSelectedCitation(null);
    dispatch(setActive(null));
    autoScrollRef.current = true;
  }, [dispatch]);

  const loadConversation = useCallback(
    async (id: number) => {
      if (!Number.isFinite(id)) {
        navigate('/chat', { replace: true });
        return;
      }
      // Switching history must abort the previous stream; otherwise its deltas
      // could append to the newly opened conversation.
      runIdRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      setStreaming(false);
      conversationIdRef.current = id;
      dispatch(setActive(id));
      setLoading(true);
      setMessages([]);
      try {
        const detail = await conversationsApi.detail(id);
        if (conversationIdRef.current !== id) return;
        setTitle(detail.title);
        setMessages(detail.messages);
        autoScrollRef.current = true;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          notify.error('会话不存在或已被删除');
        } else {
          notify.error(error instanceof Error ? error.message : '会话加载失败');
        }
        resetChat();
        navigate('/chat', { replace: true });
      } finally {
        setLoading(false);
      }
    },
    [dispatch, navigate, resetChat],
  );

  const routeId = routeParam ? Number(routeParam) : null;
  useEffect(() => {
    if (routeId === null) return;
    if (conversationIdRef.current === routeId) return;
    void loadConversation(routeId);
  }, [routeId, loadConversation]);

  useEffect(() => {
    if (routeParam === undefined && conversationIdRef.current !== null) {
      resetChat();
    }
  }, [routeParam, resetChat]);

  useEffect(() => {
    if (newChatKey === lastNewChatKey.current) return;
    lastNewChatKey.current = newChatKey;
    resetChat();
  }, [newChatKey, resetChat]);

  // Only follow new tokens when the reader is already near the bottom. This
  // prevents the viewport from jumping while someone scrolls back through citations.
  useEffect(() => {
    if (!autoScrollRef.current) return;
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [messages]);

  const lastAssistant = [...messages].reverse().find((item) => item.role === 'assistant');
  const citations = lastAssistant?.citations || [];
  const lastAssistantId = lastAssistant?.id;

  // Shared by send and regenerate. `tempAssistantId` is replaced with the
  // server id in onMeta; callbacks locate the streaming row by status.
  const executeStream = useCallback(
    async (payload: ChatStreamPayload, tempAssistantId: number, isNewConversation: boolean) => {
      const runId = ++runIdRef.current;
      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);
      autoScrollRef.current = true;

      try {
        await streamChat(
          payload,
          {
            onMeta: (meta) => {
              if (runId !== runIdRef.current) return;
              conversationIdRef.current = meta.conversation_id;
              dispatch(setActive(meta.conversation_id));
              setTitle(meta.title);
              setModel(meta.model);
              dispatch(
                upsert({
                  id: meta.conversation_id,
                  title: meta.title,
                  ...(isNewConversation
                    ? {
                        message_count: 2,
                        last_message_at: nowIso(),
                        created_at: nowIso(),
                      }
                    : {}),
                }),
              );
              setMessages((previous) =>
                previous.map((item) =>
                  item.id === tempAssistantId ? { ...item, id: meta.assistant_message_id } : item,
                ),
              );
              navigate(`/chat/${meta.conversation_id}`, { replace: true });
            },
            onCitations: (nextCitations) => {
              if (runId !== runIdRef.current) return;
              setMessages((previous) =>
                previous.map((item) =>
                  item.role === 'assistant' && item.status === 'streaming'
                    ? { ...item, citations: nextCitations }
                    : item,
                ),
              );
            },
            onDelta: (content) => {
              if (runId !== runIdRef.current) return;
              setMessages((previous) =>
                previous.map((item) =>
                  item.role === 'assistant' && item.status === 'streaming'
                    ? { ...item, content: item.content + content }
                    : item,
                ),
              );
            },
            onDone: (done) => {
              if (runId !== runIdRef.current) return;
              setMessages((previous) =>
                previous.map((item) => {
                  if (item.role !== 'assistant' || item.status !== 'streaming') return item;
                  return { ...item, status: 'completed', latency_ms: done.latency_ms };
                }),
              );
            },
            onError: (message) => {
              if (runId !== runIdRef.current) return;
              setMessages((previous) =>
                previous.map((item) =>
                  item.role === 'assistant' && item.status === 'streaming'
                    ? { ...item, status: 'failed', error: message }
                    : item,
                ),
              );
              notify.error(message);
            },
          },
          controller.signal,
        );
      } catch (error) {
        if (runId !== runIdRef.current) return;
        if (error instanceof DOMException && error.name === 'AbortError') {
          setMessages((previous) =>
            previous.map((item) =>
              item.role === 'assistant' && item.status === 'streaming'
                ? { ...item, status: 'interrupted' }
                : item,
            ),
          );
        } else {
          const message = error instanceof Error ? error.message : '生成失败，请重试';
          setMessages((previous) =>
            previous.map((item) =>
              item.role === 'assistant' && item.status === 'streaming'
                ? { ...item, status: 'failed', error: message }
                : item,
            ),
          );
          notify.error(message);
        }
      } finally {
        if (runId === runIdRef.current) {
          setStreaming(false);
          abortRef.current = null;
          void dispatch(loadConversations());
          void dispatch(refreshStats());
        }
      }
    },
    [dispatch, navigate],
  );

  const sendMessage = useCallback(
    (raw?: string) => {
      const content = (raw ?? input).trim();
      if (!content || streaming) return;
      if (content.length > 2000) {
        notify.error('问题不能超过 2000 字');
        return;
      }
      const timestamp = nowIso();
      const tempAssistantId = -Date.now();
      const isNewConversation = conversationIdRef.current === null;
      setMessages((previous) => [
        ...previous,
        {
          id: -Date.now() - 1,
          role: 'user',
          content,
          status: 'completed',
          citations: null,
          latency_ms: null,
          created_at: timestamp,
        },
        {
          id: tempAssistantId,
          role: 'assistant',
          content: '',
          status: 'streaming',
          citations: null,
          latency_ms: null,
          created_at: timestamp,
        },
      ]);
      setInput('');
      if (isNewConversation) setTitle(truncate(content, 30));
      void executeStream(
        {
          conversation_id: conversationIdRef.current ?? undefined,
          message: content,
          use_knowledge: useKnowledge,
        },
        tempAssistantId,
        isNewConversation,
      );
    },
    [executeStream, input, streaming, useKnowledge],
  );

  const regenerate = useCallback(() => {
    if (!conversationIdRef.current || streaming || !lastAssistant) return;
    const tempAssistantId = -Date.now();
    setMessages((previous) => [
      ...previous.filter((item) => item.id !== lastAssistant.id),
      {
        id: tempAssistantId,
        role: 'assistant',
        content: '',
        status: 'streaming',
        citations: null,
        latency_ms: null,
        created_at: nowIso(),
      },
    ]);
    void executeStream(
      {
        conversation_id: conversationIdRef.current,
        use_knowledge: useKnowledge,
        regenerate: true,
      },
      tempAssistantId,
      false,
    );
  }, [executeStream, lastAssistant, streaming, useKnowledge]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  const toggleKnowledge = useCallback(() => {
    const next = !useKnowledge;
    setUseKnowledge(next);
    notify.info(next ? '已开启知识库增强' : '已切换为通用对话');
  }, [useKnowledge]);

  const attach = async (file: File | undefined) => {
    if (!file) return;
    notify.info('正在上传并解析资料…');
    await dispatch(uploadDocument(file));
  };

  const openCitation = (citation: Citation) => setSelectedCitation(citation);

  return (
    <>
      <Topbar section="对话" title={title} model={model} />
      <div className="workbench">
        <section className="chat-col">
          <div
            className="chat-scroll"
            ref={scrollRef}
            onScroll={(event) => {
              const element = event.currentTarget;
              autoScrollRef.current =
                element.scrollHeight - element.scrollTop - element.clientHeight < 140;
            }}
          >
            {loading ? (
              <div className="chat-loading">
                <div className="skeleton-line wide" />
                <div className="skeleton-line" />
                <div className="skeleton-card" />
                <div className="skeleton-line wide" />
                <div className="skeleton-line medium" />
              </div>
            ) : messages.length === 0 ? (
              <EmptyChat stats={stats} onAsk={sendMessage} />
            ) : (
              <div className="messages">
                {messages.map((message) => (
                  <MessageItem
                    key={`${message.role}-${message.id}`}
                    message={message}
                    isLastAssistant={message.id === lastAssistantId}
                    onRegenerate={regenerate}
                    onCitationOpen={openCitation}
                  />
                ))}
              </div>
            )}
          </div>
          <ChatComposer
            value={input}
            onChange={setInput}
            onSend={() => sendMessage()}
            onStop={stop}
            onAttach={() => fileInputRef.current?.click()}
            onToggleKnowledge={toggleKnowledge}
            streaming={streaming}
            useKnowledge={useKnowledge}
          />
          <input
            ref={fileInputRef}
            type="file"
            hidden
            accept=".pdf,.docx,.md,.txt"
            onChange={(event) => {
              void attach(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
        </section>
        <ContextRail
          stats={stats}
          useKnowledge={useKnowledge}
          onToggleKnowledge={toggleKnowledge}
          citations={citations}
          onCitationOpen={openCitation}
        />
      </div>
      <CitationModal citation={selectedCitation} onClose={() => setSelectedCitation(null)} />
    </>
  );
}
