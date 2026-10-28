import { useEffect, useState } from 'react';
import { Alert, Button, Progress, Upload } from 'antd';
import type { UploadFile, UploadProps } from 'antd';
import {
  DeleteOutlined,
  FileTextOutlined,
  InboxOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Modal } from '../../../components/Modal';
import { knowledgeApi } from '../../../api';
import { useAppDispatch } from '../../../store/hooks';
import { fetchKnowledge } from '../../../store/slices/knowledgeSlice';
import { notify } from '../../../store/notify';
import { formatBytes } from '../../../utils/format';

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
}

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ['.pdf', '.docx', '.md', '.txt'];

export function UploadModal({ open, onClose }: UploadModalProps) {
  const dispatch = useAppDispatch();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setFileList([]);
      setProgress(0);
      setUploading(false);
      setError('');
    }
  }, [open]);

  const validate = (file: File) => {
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      setError('仅支持 PDF、DOCX、Markdown、TXT 文件');
      return false;
    }
    if (file.size > MAX_BYTES) {
      setError('文件超过 10MB 限制');
      return false;
    }
    setError('');
    return true;
  };

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    if (!validate(file)) return Upload.LIST_IGNORE;
    setFileList([
      {
        uid: file.uid,
        name: file.name,
        status: 'done',
        size: file.size,
        type: file.type,
        originFileObj: file,
      },
    ]);
    setProgress(0);
    return false;
  };

  const upload = async () => {
    const raw = fileList[0]?.originFileObj;
    if (!raw || uploading) return;
    setUploading(true);
    setError('');
    try {
      await knowledgeApi.upload(raw, setProgress);
      await dispatch(fetchKnowledge()).unwrap();
      notify.success('已加入解析队列，完成后会自动出现在列表中');
      onClose();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const selected = fileList[0];

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
            <SafetyCertificateOutlined /> 仅用于你的个人知识库
          </span>
          <div className="modal-actions">
            <Button onClick={onClose} disabled={uploading}>
              取消
            </Button>
            <Button type="primary" onClick={upload} loading={uploading} disabled={!selected}>
              开始解析
            </Button>
          </div>
        </>
      }
    >
      <Upload.Dragger
        accept={ACCEPTED.join(',')}
        multiple={false}
        maxCount={1}
        fileList={fileList}
        showUploadList={false}
        beforeUpload={beforeUpload}
        onRemove={() => setFileList([])}
        className="upload-dragger"
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">点击选择，或拖拽文件到这里</p>
        <p className="ant-upload-hint">
          单个文件不超过 10 MB
          <br />
          上传后会自动解析、切分并建立索引
        </p>
        <div className="formats">
          <em>.pdf</em>
          <em>.docx</em>
          <em>.md</em>
          <em>.txt</em>
        </div>
      </Upload.Dragger>

      {selected && (
        <div className="file-picked">
          <div className="fp-ico">
            <FileTextOutlined />
            <span>{selected.name.split('.').pop()?.toUpperCase()}</span>
          </div>
          <div className="fp-main">
            <b>{selected.name}</b>
            <span>
              {formatBytes(selected.size || 0)} · {uploading ? `上传中 ${progress}%` : '已选择'}
            </span>
            {uploading && <Progress percent={progress} showInfo={false} size="small" />}
          </div>
          {!uploading && (
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => setFileList([])}
              aria-label="移除文件"
            />
          )}
        </div>
      )}
      {error && <Alert className="upload-error" type="error" showIcon message={error} />}
      <div className="upload-note">扫描版 PDF 无法提取文字，请先 OCR，或上传可复制文本的版本。</div>
    </Modal>
  );
}
