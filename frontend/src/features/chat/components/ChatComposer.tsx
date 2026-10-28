import { Button, Input, Switch, Tooltip } from 'antd';
import { ArrowUpOutlined, BookOutlined, PaperClipOutlined, StopOutlined } from '@ant-design/icons';

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
  const canSend = value.trim().length > 0 && !streaming && !disabled;

  return (
    <div className="composer-wrap">
      <div className="composer">
        <Input.TextArea
          className="composer-textarea"
          variant="borderless"
          autoSize={{ minRows: 1, maxRows: 6 }}
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
            <Tooltip title="上传资料到知识库">
              <Button
                type="text"
                size="small"
                icon={<PaperClipOutlined />}
                onClick={onAttach}
                aria-label="上传资料"
              />
            </Tooltip>
            <div className="comp-divider" />
            <span className={`kb-toggle ${useKnowledge ? 'on' : ''}`}>
              <BookOutlined />
              知识库
              <Switch
                size="small"
                checked={useKnowledge}
                onChange={onToggleKnowledge}
                aria-label="知识库增强"
                title={useKnowledge ? '正在使用知识库回答' : '当前为通用对话'}
              />
            </span>
          </div>
          <div className="send-area">
            <span className="char-count">{value.length} / 2000</span>
            {streaming ? (
              <Button
                danger
                icon={<StopOutlined />}
                className="stop-btn"
                onClick={onStop}
                aria-label="停止生成"
              >
                停止
              </Button>
            ) : (
              <Button
                type="primary"
                shape="circle"
                className="send-btn"
                icon={<ArrowUpOutlined />}
                onClick={onSend}
                disabled={!canSend}
                aria-label="发送"
              />
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
