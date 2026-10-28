import { useEffect, useRef, useState } from 'react';
import { FileText, ShieldCheck, UploadCloud, X } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { knowledgeApi } from '../../../api';
import { formatBytes } from '../../../utils/format';
import { toast } from '../../../stores/toastStore';
import type { DocumentItem } from '../../../types';

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onUploaded: (document: DocumentItem) => void;
}

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ['.pdf', '.docx', '.md', '.txt'];

export function UploadModal({ open, onClose, onUploaded }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setProgress(0);
      setUploading(false);
      setError('');
    }
  }, [open]);

  const pick = (candidate: File | undefined) => {
    if (!candidate) return;
    const ext = candidate.name.slice(candidate.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      setError('仅支持 PDF、DOCX、Markdown、TXT 文件');
      return;
    }
    if (candidate.size > MAX_BYTES) {
      setError('文件超过 10MB 限制');
      return;
    }
    setError('');
    setFile(candidate);
    setProgress(0);
  };

  const upload = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError('');
    try {
      const document = await knowledgeApi.upload(file, setProgress);
      toast('已加入解析队列，完成后会自动出现在列表中', 'success');
      onUploaded(document);
      onClose();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={uploading ? () => undefined : onClose}
      title="上传资料"
      description="支持文本型 PDF、Word、Markdown 与纯文本，解析通常在 10 秒内完成。"
      width={500}
      footer={
        <>
          <span className="privacy-note">
            <ShieldCheck size={11} /> 仅用于你的个人知识库
          </span>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={uploading}>
              取消
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={upload}
              disabled={!file || uploading}
            >
              {uploading ? '上传中…' : '开始解析'}
            </button>
          </div>
        </>
      }
    >
      <div
        className={`dropzone ${dragActive ? 'drag' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          pick(event.dataTransfer.files?.[0]);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click();
        }}
      >
        <div className="drop-icon">
          <UploadCloud size={21} />
        </div>
        <b>点击选择，或拖拽文件到这里</b>
        <span>
          单个文件不超过 10 MB
          <br />
          上传后会自动解析、切分并建立索引
        </span>
        <div className="formats">
          <em>.pdf</em>
          <em>.docx</em>
          <em>.md</em>
          <em>.txt</em>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={ACCEPTED.join(',')}
        onChange={(event) => pick(event.target.files?.[0])}
      />

      {file && (
        <div className="file-picked">
          <div className="fp-ico">
            <FileText size={14} />
            <span>{file.name.split('.').pop()?.toUpperCase()}</span>
          </div>
          <div className="fp-main">
            <b>{file.name}</b>
            <span>
              {formatBytes(file.size)} · {uploading ? `上传中 ${progress}%` : '已选择'}
            </span>
            {uploading && (
              <div className="progress">
                <i style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
          {!uploading && (
            <button
              type="button"
              className="icon-btn"
              onClick={() => setFile(null)}
              aria-label="移除文件"
            >
              <X size={13} />
            </button>
          )}
        </div>
      )}
      {error && <div className="upload-error">{error}</div>}
      <div className="upload-note">扫描版 PDF 无法提取文字，请先 OCR，或上传可复制文本的版本。</div>
    </Modal>
  );
}
