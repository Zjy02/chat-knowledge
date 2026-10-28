import { FileText, Trash2 } from 'lucide-react';
import { formatBytes, formatRelativeTime } from '../../../utils/format';
import type { DocumentItem } from '../../../types';

interface DocumentRowProps {
  document: DocumentItem;
  onToggle: (document: DocumentItem) => void;
  onDelete: (document: DocumentItem) => void;
}

const typeLabel: Record<string, string> = {
  pdf: 'PDF',
  docx: 'DOCX',
  md: 'MD',
  txt: 'TXT',
};

export function DocumentRow({ document, onToggle, onDelete }: DocumentRowProps) {
  const statusText =
    document.status === 'ready' ? '已就绪' : document.status === 'processing' ? '解析中' : '失败';
  const canToggle = document.status === 'ready';

  return (
    <div className={`doc-row ${document.enabled ? '' : 'disabled'}`}>
      <div className={`file-ico type-${document.file_type}`}>
        <FileText size={13} />
        <span>{typeLabel[document.file_type] || document.file_type.toUpperCase()}</span>
      </div>
      <div className="doc-main">
        <div className="doc-name">{document.filename}</div>
        <div className="doc-meta">
          {formatBytes(document.file_size)}
          <span className="dot" />
          {formatRelativeTime(document.created_at)}
          <span className="dot" />
          {typeLabel[document.file_type] || document.file_type}
        </div>
        {document.status === 'failed' && document.error_message && (
          <div className="doc-error" title={document.error_message}>
            {document.error_message}
          </div>
        )}
      </div>
      <div className="doc-chunks">
        {document.status === 'ready' ? (
          <>
            <b>{document.chunk_count}</b> 片段
          </>
        ) : (
          '—'
        )}
      </div>
      <span className={`status ${document.status}`}>
        <i />
        {statusText}
      </span>
      <button
        type="button"
        className={`doc-switch ${document.enabled ? '' : 'off'}`}
        onClick={() => canToggle && onToggle(document)}
        disabled={!canToggle}
        aria-label={document.enabled ? '停用资料' : '启用资料'}
        aria-pressed={document.enabled}
      />
      <button
        type="button"
        className="doc-delete"
        onClick={() => onDelete(document)}
        aria-label={`删除 ${document.filename}`}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}
