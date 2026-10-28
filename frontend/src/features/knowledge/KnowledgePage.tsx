import { useCallback, useEffect, useMemo, useState } from 'react';
import { Lightbulb, Plus, UploadCloud } from 'lucide-react';
import { knowledgeApi } from '../../api';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useKnowledgeStore } from '../../stores/knowledgeStore';
import { toast } from '../../stores/toastStore';
import type { DocumentItem, DocumentStatus } from '../../types';
import { Topbar } from '../chat/components/Topbar';
import { DocumentList } from './components/DocumentList';
import { RetrievalTest } from './components/RetrievalTest';
import { StatsGrid } from './components/StatsGrid';
import { UploadModal } from './components/UploadModal';

type Filter = 'all' | DocumentStatus;

export function KnowledgePage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DocumentItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const stats = useKnowledgeStore((state) => state.stats);
  const refreshStats = useKnowledgeStore((state) => state.refreshStats);

  const refreshDocuments = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const list = await knowledgeApi.documents();
        setDocuments(list);
        void refreshStats();
      } catch (error) {
        toast(error instanceof Error ? error.message : '资料列表加载失败', 'error');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [refreshStats],
  );

  useEffect(() => {
    void refreshDocuments();
  }, [refreshDocuments]);

  // Parsing runs in a backend BackgroundTask. Poll only while at least one
  // document is processing so an idle knowledge page makes no extra requests.
  const processing = documents.some((item) => item.status === 'processing');
  useEffect(() => {
    if (!processing) return;
    const timer = window.setInterval(() => void refreshDocuments(true), 2500);
    return () => window.clearInterval(timer);
  }, [processing, refreshDocuments]);

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

  const toggleDocument = async (document: DocumentItem) => {
    const next = !document.enabled;
    setDocuments((previous) =>
      previous.map((item) => (item.id === document.id ? { ...item, enabled: next } : item)),
    );
    try {
      const updated = await knowledgeApi.toggle(document.id, next);
      setDocuments((previous) => previous.map((item) => (item.id === updated.id ? updated : item)));
      toast(next ? '已启用该资料' : '已停用该资料，不再参与检索', 'success');
    } catch (error) {
      setDocuments((previous) =>
        previous.map((item) =>
          item.id === document.id ? { ...item, enabled: document.enabled } : item,
        ),
      );
      toast(error instanceof Error ? error.message : '操作失败', 'error');
    }
  };

  const removeDocument = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await knowledgeApi.remove(pendingDelete.id);
      setDocuments((previous) => previous.filter((item) => item.id !== pendingDelete.id));
      void refreshStats();
      toast('资料已删除', 'success');
      setPendingDelete(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : '删除失败', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleUploaded = (document: DocumentItem) => {
    setDocuments((previous) => [document, ...previous]);
    setFilter('all');
    void refreshStats();
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
            <button type="button" className="upload-btn" onClick={() => setUploadOpen(true)}>
              <UploadCloud size={14} />
              上传资料
            </button>
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
              onToggle={toggleDocument}
              onDelete={setPendingDelete}
              onUpload={() => setUploadOpen(true)}
            />

            <aside className="aside-stack">
              <RetrievalTest disabled={stats.ready_count === 0} />
              <div className="tip-card">
                <div className="tip-title">
                  <Lightbulb size={12} />
                  让检索更准的小建议
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
                <button type="button" className="tip-action" onClick={() => setUploadOpen(true)}>
                  <Plus size={12} /> 添加资料
                </button>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={handleUploaded}
      />
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="删除这篇资料？"
        description={`「${pendingDelete?.filename || ''}」及其全部知识片段会被删除，相关引用将无法再打开。`}
        confirmText="删除资料"
        danger
        loading={deleting}
        onClose={() => setPendingDelete(null)}
        onConfirm={removeDocument}
      />
    </>
  );
}
