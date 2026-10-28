import { Button, Tag } from 'antd';
import { LinkOutlined, MessageOutlined } from '@ant-design/icons';
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
          <Button type="primary" onClick={onClose}>
            知道了
          </Button>
        </div>
      }
    >
      <div className="citation-source">
        <div className="citation-source-meta">
          <span>
            <MessageOutlined /> 原文片段
          </span>
          <Tag color="success">{Math.round(citation.score * 100)}% 相关</Tag>
        </div>
        <blockquote>{citation.content || citation.snippet}</blockquote>
        <div className="citation-source-foot">
          <span>
            <LinkOutlined /> 来自你的知识库
          </span>
          <span>Chunk #{citation.chunk_index + 1}</span>
        </div>
      </div>
    </Modal>
  );
}
