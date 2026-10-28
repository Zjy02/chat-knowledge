import { useEffect, useMemo, useState } from 'react';
import { Button } from 'antd';
import { BulbOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  deleteDocument,
  fetchDocuments,
  fetchKnowledge,
  toggleDocument,
} from '../../store/slices/knowledgeSlice';
import type { DocumentItem, DocumentStatus } from '../../types';
import { Topbar } from '../chat/components/Topbar';
import { DocumentList } from './components/DocumentList';
import { RetrievalTest } from './components/RetrievalTest';
import { StatsGrid } from './components/StatsGrid';
import { UploadModal } from './components/UploadModal';

type Filter = 'all' | DocumentStatus;

export function KnowledgePage() {
  const dispatch = useAppDispatch();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const documents = useAppSelector((state) => state.knowledge.documents);
  const stats = useAppSelector((state) => state.knowledge.stats);
  const loading = useAppSelector((state) => state.knowledge.loading);
  const loaded = useAppSelector((state) => state.knowledge.loaded);
  const refreshing = useAppSelector((state) => state.knowledge.refreshing);

  useEffect(() => {
    if (!loaded) void dispatch(fetchKnowledge());
  }, [dispatch, loaded]);

  // Parsing runs in a backend BackgroundTask. Poll only while at least one
  // document is processing so an idle knowledge page makes no extra requests.
  const processing = documents.some((item) => item.status === 'processing');
  useEffect(() => {
    if (!processing || refreshing) return;
    const timer = window.setInterval(() => void dispatch(fetchDocuments()), 2500);
    return () => window.clearInterval(timer);
  }, [dispatch, processing, refreshing]);

  const counts = useMemo(() => {
    const result: Record<Filter, number> = {
      all: documents.length,
      ready: 0,
      processing: 0,
      failed: 0,
    };
    documents.forEach((item) => {
      result[item.status] += 1;
    });
    return result;
  }, [documents]);

  const toggle = (document: DocumentItem) => {
    void dispatch(toggleDocument({ id: document.id, enabled: !document.enabled }));
  };

  const remove = (document: DocumentItem) => {
    void dispatch(deleteDocument(document.id));
  };

  return (
    <>
      <Topbar section="知识库" title="个人知识库" />
      <div className="kb-view">
        <div className="kb-inner">
          <div className="kb-hero">
            <div>
              <div className="eyebrow">KNOWLEDGE BASE</div>
              <h1>你的资料，正在变成答案。</h1>
              <p>
                上传笔记、文档或手册，知问会自动解析并建立检索索引。
                <br />
                所有内容仅对你可见。
              </p>
            </div>
            <Button
              type="primary"
              size="large"
              className="upload-btn"
              icon={<UploadOutlined />}
              onClick={() => setUploadOpen(true)}
              aria-label="上传资料"
            >
              上传资料
            </Button>
          </div>

          <StatsGrid stats={stats} />

          <div className="kb-grid">
            <DocumentList
              documents={documents}
              loading={loading}
              filter={filter}
              search={search}
              counts={counts}
              onFilter={setFilter}
              onSearch={setSearch}
              onToggle={toggle}
              onDelete={remove}
              onUpload={() => setUploadOpen(true)}
            />

            <aside className="aside-stack">
              <RetrievalTest disabled={stats.ready_count === 0} />
              <div className="tip-card">
                <div className="tip-title">
                  <BulbOutlined /> 让检索更准的小建议
                </div>
                <p>
                  资料按主题拆分上传，文件名包含版本和日期；<b>扫描版 PDF 无法提取文字</b>
                  ，请先 OCR 或上传可复制文本的版本。
                </p>
                <div className="format-row">
                  <span className="format">TXT</span>
                  <span className="format">MD</span>
                  <span className="format">PDF</span>
                  <span className="format">DOCX</span>
                  <span className="format">≤ 10 MB</span>
                </div>
                <Button
                  type="link"
                  size="small"
                  className="tip-action"
                  icon={<PlusOutlined />}
                  onClick={() => setUploadOpen(true)}
                >
                  添加资料
                </Button>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </>
  );
}
