import { Search, UploadCloud } from 'lucide-react';
import { DocumentRow } from './DocumentRow';
import type { DocumentItem, DocumentStatus } from '../../../types';

interface DocumentListProps {
  documents: DocumentItem[];
  loading: boolean;
  filter: 'all' | DocumentStatus;
  search: string;
  counts: Record<'all' | DocumentStatus, number>;
  onFilter: (filter: 'all' | DocumentStatus) => void;
  onSearch: (value: string) => void;
  onToggle: (document: DocumentItem) => void;
  onDelete: (document: DocumentItem) => void;
  onUpload: () => void;
}

const tabs: Array<{ key: 'all' | DocumentStatus; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'ready', label: '已就绪' },
  { key: 'processing', label: '处理中' },
  { key: 'failed', label: '失败' },
];

export function DocumentList({
  documents,
  loading,
  filter,
  search,
  counts,
  onFilter,
  onSearch,
  onToggle,
  onDelete,
  onUpload,
}: DocumentListProps) {
  const filtered = documents.filter((item) => {
    const matchFilter = filter === 'all' || item.status === filter;
    const matchSearch = item.filename.toLowerCase().includes(search.trim().toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <section className="panel document-panel">
      <div className="panel-head">
        <span className="panel-title">全部资料</span>
        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`tab ${filter === tab.key ? 'active' : ''}`}
              onClick={() => onFilter(tab.key)}
            >
              {tab.label} <i>{counts[tab.key]}</i>
            </button>
          ))}
        </div>
        <label className="search">
          <Search size={11} />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="搜索资料"
          />
        </label>
      </div>

      {loading ? (
        <div className="doc-skeletons">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="doc-skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="doc-empty">
          <div className="doc-empty-icon">
            <UploadCloud size={22} />
          </div>
          <b>{documents.length ? '没有匹配的资料' : '知识库还是空的'}</b>
          <span>
            {documents.length
              ? '试试切换筛选条件或搜索关键词。'
              : '上传 PDF、Word、Markdown 或 TXT，开始构建你的知识库。'}
          </span>
          {!documents.length && (
            <button type="button" className="btn btn-primary" onClick={onUpload}>
              上传第一篇资料
            </button>
          )}
        </div>
      ) : (
        <div className="doc-list">
          {filtered.map((document) => (
            <DocumentRow
              key={document.id}
              document={document}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      <div className="list-foot">
        <span>
          显示 {filtered.length} / {documents.length} 篇资料
        </span>
        <span>单文件 ≤ 10 MB · 仅支持文本型 PDF</span>
      </div>
    </section>
  );
}
