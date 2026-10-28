import { Button, Empty, Input, Popconfirm, Segmented, Switch, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  DeleteOutlined,
  FileTextOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { formatBytes, formatRelativeTime } from '../../../utils/format';
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

const typeLabel: Record<string, string> = {
  pdf: 'PDF',
  docx: 'DOCX',
  md: 'MD',
  txt: 'TXT',
};

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

  const columns: ColumnsType<DocumentItem> = [
    {
      title: '资料',
      dataIndex: 'filename',
      key: 'filename',
      render: (_, document) => (
        <div className="doc-file-cell">
          <div className={`file-ico type-${document.file_type}`}>
            <FileTextOutlined />
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
        </div>
      ),
    },
    {
      title: '片段',
      dataIndex: 'chunk_count',
      key: 'chunk_count',
      width: 88,
      responsive: ['md'],
      render: (value: number, document) =>
        document.status === 'ready' ? <span className="doc-chunks">{value} 片段</span> : '—',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 104,
      responsive: ['sm'],
      render: (value: DocumentStatus) => (
        <Tag className={`status ${value}`} bordered={false}>
          <i />
          {value === 'ready' ? '已就绪' : value === 'processing' ? '解析中' : '失败'}
        </Tag>
      ),
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      key: 'enabled',
      width: 76,
      responsive: ['sm'],
      render: (enabled: boolean, document) => (
        <Switch
          size="small"
          checked={enabled}
          disabled={document.status !== 'ready'}
          onChange={() => onToggle(document)}
          aria-label={enabled ? '停用资料' : '启用资料'}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 56,
      render: (_, document) => (
        <Popconfirm
          title="删除这篇资料？"
          description="相关引用将无法再打开。"
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          onConfirm={() => onDelete(document)}
        >
          <Button
            type="text"
            size="small"
            className="doc-delete"
            icon={<DeleteOutlined />}
            aria-label={`删除 ${document.filename}`}
          />
        </Popconfirm>
      ),
    },
  ];

  return (
    <section className="panel document-panel">
      <div className="panel-head">
        <span className="panel-title">全部资料</span>
        <Segmented
          className="doc-filter"
          size="small"
          value={filter}
          onChange={(value) => onFilter(value as 'all' | DocumentStatus)}
          options={[
            { label: `全部 ${counts.all}`, value: 'all' },
            { label: `已就绪 ${counts.ready}`, value: 'ready' },
            { label: `处理中 ${counts.processing}`, value: 'processing' },
            { label: `失败 ${counts.failed}`, value: 'failed' },
          ]}
        />
        <Input
          className="search"
          size="small"
          allowClear
          prefix={<SearchOutlined />}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="搜索资料"
          aria-label="搜索资料"
        />
      </div>

      <Table<DocumentItem>
        rowKey="id"
        className="doc-table"
        columns={columns}
        dataSource={filtered}
        loading={loading}
        pagination={false}
        showHeader={false}
        rowClassName={() => 'doc-row'}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                documents.length
                  ? '没有匹配的资料，试试切换筛选条件'
                  : '知识库还是空的，上传第一篇资料吧'
              }
            >
              {!documents.length && (
                <Button type="primary" icon={<UploadOutlined />} onClick={onUpload}>
                  上传第一篇资料
                </Button>
              )}
            </Empty>
          ),
        }}
      />

      <div className="list-foot">
        <span>
          显示 {filtered.length} / {documents.length} 篇资料
        </span>
        <span>单文件 ≤ 10 MB · 仅支持文本型 PDF</span>
      </div>
    </section>
  );
}
