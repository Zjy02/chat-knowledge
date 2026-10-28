import { useEffect, useRef } from 'react';
import { ArrowUp, BookOpen, Paperclip, Square } from 'lucide-react';

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  onAttach: () => void;
  onToggleKnowledge: () => void;
  streaming: boolean;
  useKnowledge: boolean;
  disabled?: boolean;
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  onStop,
  onAttach,
  onToggleKnowledge,
  streaming,
  useKnowledge,
  disabled = false,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = 'auto';
    element.style.height = `${Math.min(element.scrollHeight, 150)}px`;
  }, [value]);

  const canSend = value.trim().length > 0 && !streaming && !disabled;

  return (
    <div className="composer-wrap">
      <div className="composer">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          maxLength={2000}
          placeholder="向你的知识库提问…"
          aria-label="输入问题"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (canSend) onSend();
            }
          }}
        />
        <div className="composer-bar">
          <div className="composer-tools">
            <button
              type="button"
              className="comp-btn"
              onClick={onAttach}
              title="上传资料到知识库"
              aria-label="上传资料"
            >
              <Paperclip size={13} />
            </button>
            <div className="comp-divider" />
            <button
              type="button"
              className={`comp-btn ${useKnowledge ? 'on' : ''}`}
              onClick={onToggleKnowledge}
              title={useKnowledge ? '正在使用知识库回答' : '当前为通用对话'}
            >
              <BookOpen size={12} />
              知识库
              <span className={`tiny-state ${useKnowledge ? 'on' : ''}`}>
                {useKnowledge ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
          <div className="send-area">
            <span className="char-count">{value.length} / 2000</span>
            {streaming ? (
              <button type="button" className="stop-btn" onClick={onStop} aria-label="停止生成">
                <Square size={11} fill="currentColor" />
                停止
              </button>
            ) : (
              <button
                type="button"
                className="send-btn"
                onClick={onSend}
                disabled={!canSend}
                aria-label="发送"
              >
                <ArrowUp size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="composer-hint">
        <span>Enter 发送</span>
        <i />
        <span>Shift + Enter 换行</span>
        <i />
        <span>AI 可能出错，请核对引用</span>
      </div>
    </div>
  );
}
