import { ExternalLink, Quote } from 'lucide-react';
import { Modal } from './Modal';
import type { Citation } from '../types';

interface CitationModalProps {
  citation: Citation | null;
  onClose: () => void;
}

export function CitationModal({ citation, onClose }: CitationModalProps) {
  if (!citation) return null;
  return (
    <Modal
      open={Boolean(citation)}
      onClose={onClose}
      title={`引用 ${citation.index} · ${citation.document_name}`}
      description={`片段 ${citation.chunk_index + 1} · 相关度 ${Math.round(citation.score * 100)}%`}
      width={640}
      footer={
        <div className="modal-actions">
          <button type="button" className="btn btn-primary" onClick={onClose}>
            知道了
          </button>
        </div>
      }
    >
      <div className="citation-source">
        <div className="citation-source-meta">
          <span>
            <Quote size={13} /> 原文片段
          </span>
          <span className="score-pill">{Math.round(citation.score * 100)}% 相关</span>
        </div>
        <blockquote>{citation.content || citation.snippet}</blockquote>
        <div className="citation-source-foot">
          <span>
            <ExternalLink size={12} /> 来自你的知识库
          </span>
          <span>Chunk #{citation.chunk_index + 1}</span>
        </div>
      </div>
    </Modal>
  );
}
