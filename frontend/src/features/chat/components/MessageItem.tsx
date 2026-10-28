import { useState } from 'react';
import { Check, Copy, RotateCcw, ThumbsUp, TriangleAlert } from 'lucide-react';
import { Markdown } from '../../../components/Markdown';
import { CitationChips } from '../../../components/CitationChips';
import { toast } from '../../../stores/toastStore';
import { formatTime } from '../../../utils/format';
import type { Citation, Message } from '../../../types';

interface MessageItemProps {
  message: Message;
  isLastAssistant: boolean;
  onRegenerate: () => void;
  onCitationOpen: (citation: Citation) => void;
}

export function MessageItem({
  message,
  isLastAssistant,
  onRegenerate,
  onCitationOpen,
}: MessageItemProps) {
  const [copied, setCopied] = useState(false);

  if (message.role === 'user') {
    return (
      <div className="msg user">
        <div className="msg-user-wrap">
          <div className="bubble">{message.content}</div>
          <div className="msg-time">{formatTime(message.created_at)}</div>
        </div>
      </div>
    );
  }

  const citations = message.citations || [];
  const isStreaming = message.status === 'streaming';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast('回答已复制', 'success');
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast('复制失败，请手动选择文本', 'error');
    }
  };

  const openCitation = (index: number) => {
    const citation = citations.find((item) => item.index === index);
    if (citation) onCitationOpen(citation);
  };

  return (
    <div className="msg assistant">
      <div className="ai-avatar">知</div>
      <div className="msg-ai-body">
        <div className="ai-head">
          <span className="ai-name">知问</span>
          <span className={`ai-tag ${citations.length ? 'grounded' : ''}`}>
            {citations.length ? '知识库增强' : '通用回答'}
          </span>
          {message.latency_ms != null && (
            <span className="ai-latency">
              检索完成 · 用时 {(message.latency_ms / 1000).toFixed(1)}s
            </span>
          )}
          {isStreaming && <span className="ai-latency">正在生成…</span>}
        </div>

        {isStreaming && !message.content ? (
          <div className="typing" aria-label="正在生成回答">
            <i />
            <i />
            <i />
          </div>
        ) : (
          <Markdown content={message.content} onCitationClick={openCitation} />
        )}
        {isStreaming && message.content && <span className="stream-cursor" />}

        {message.status === 'interrupted' && (
          <div className="message-note">
            <Check size={12} /> 已停止生成，已生成的内容已保存
          </div>
        )}
        {message.status === 'failed' && (
          <div className="message-error">
            <TriangleAlert size={13} />
            <span>{message.error || '回答生成失败，请重试'}</span>
          </div>
        )}

        <CitationChips citations={citations} onOpen={onCitationOpen} />

        {message.content && !isStreaming && (
          <div className="msg-tools">
            <button type="button" className="tool" onClick={copy}>
              {copied ? <Check size={11} /> : <Copy size={11} />}
              {copied ? '已复制' : '复制'}
            </button>
            {isLastAssistant && (
              <button type="button" className="tool" onClick={onRegenerate}>
                <RotateCcw size={11} /> 重新生成
              </button>
            )}
            <button
              type="button"
              className="tool"
              onClick={() => toast('感谢反馈，已记录为有帮助', 'success')}
            >
              <ThumbsUp size={11} /> 有帮助
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
