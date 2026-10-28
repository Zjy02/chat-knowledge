import { ArrowRight, BookOpen, Check, Link2, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Citation, KnowledgeStats } from '../../../types';

interface ContextRailProps {
  stats: KnowledgeStats;
  useKnowledge: boolean;
  onToggleKnowledge: () => void;
  citations: Citation[];
  onCitationOpen: (citation: Citation) => void;
}

export function ContextRail({
  stats,
  useKnowledge,
  onToggleKnowledge,
  citations,
  onCitationOpen,
}: ContextRailProps) {
  const navigate = useNavigate();

  return (
    <aside className="rail">
      <div className="rail-card">
        <div className="rail-head">
          <span className="rail-title">
            <BookOpen size={13} /> 知识库增强
          </span>
          <button
            type="button"
            className={`switch ${useKnowledge ? '' : 'off'}`}
            onClick={onToggleKnowledge}
            aria-label={useKnowledge ? '关闭知识库增强' : '开启知识库增强'}
            aria-pressed={useKnowledge}
          />
        </div>
        <div className="kb-status">
          <span className="ico">
            <Check size={13} />
          </span>
          <div>
            <b>{useKnowledge ? '检索就绪' : '通用对话模式'}</b>
            <span>BM25 · Top 5 · 阈值 0.15</span>
          </div>
        </div>
        <div className="rail-metrics">
          <div className="metric">
            <b>{stats.ready_count}</b>
            <span>篇资料</span>
          </div>
          <div className="metric">
            <b>{stats.chunk_count}</b>
            <span>个片段</span>
          </div>
        </div>
        <button type="button" className="rail-link" onClick={() => navigate('/knowledge')}>
          管理知识库 <ArrowRight size={12} />
        </button>
      </div>

      <div className="rail-card">
        <div className="rail-head">
          <span className="rail-title">
            <Link2 size={13} /> 本次引用
          </span>
          <span className="rail-count">{citations.length} 条</span>
        </div>
        {citations.length === 0 ? (
          <div className="rail-empty">
            本轮回答暂未引用资料。
            <br />
            开启知识库增强后再提问试试。
          </div>
        ) : (
          citations.map((citation) => (
            <button
              key={`${citation.chunk_id}-${citation.index}`}
              type="button"
              className="source-item"
              onClick={() => onCitationOpen(citation)}
            >
              <span className="source-num">{citation.index}</span>
              <span className="source-body">
                <span className="source-title">{citation.document_name}</span>
                <span className="source-snippet">{citation.snippet}</span>
                <span className="source-meta">
                  <span>片段 {citation.chunk_index + 1}</span>
                  <span>·</span>
                  <span className="source-score">{Math.round(citation.score * 100)}%</span>
                </span>
              </span>
            </button>
          ))
        )}
      </div>

      <div className="rail-note">
        <b>
          <ShieldCheck size={11} /> 回答生成规则
        </b>
        <br />
        优先依据知识库内容作答；资料不足时会明确说明，并标注通用知识来源。点击引用可展开原文。
      </div>
    </aside>
  );
}
