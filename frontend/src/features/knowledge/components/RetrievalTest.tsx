import { useState } from 'react';
import { Button, Empty, Input, Tag } from 'antd';
import { ArrowUpOutlined, ExperimentOutlined } from '@ant-design/icons';
import { knowledgeApi } from '../../../api';
import { notify } from '../../../store/notify';
import type { SearchResponse } from '../../../types';

interface RetrievalTestProps {
  disabled: boolean;
}

export function RetrievalTest({ disabled }: RetrievalTestProps) {
  const [query, setQuery] = useState('BM25 和向量怎么融合');
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    const value = query.trim();
    if (!value || loading) return;
    setLoading(true);
    try {
      setResult(await knowledgeApi.search(value, 3));
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '检索失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel test-panel">
      <div className="panel-head">
        <span className="panel-title">
          <ExperimentOutlined /> 检索测试
        </span>
        <span className="panel-hint">不消耗模型额度</span>
      </div>
      <div className="test-body">
        <p>输入一个问题，看看知识库会召回哪些片段。</p>
        <div className="test-input">
          <Input
            variant="borderless"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onPressEnter={() => void run()}
            placeholder="例如：BM25 和向量怎么融合"
            disabled={disabled}
          />
          <Button
            type="primary"
            shape="circle"
            size="small"
            icon={<ArrowUpOutlined />}
            onClick={run}
            loading={loading}
            disabled={disabled || !query.trim()}
            aria-label="检索"
          />
        </div>
        <div className="test-result">
          {result ? (
            result.hits.length ? (
              result.hits.map((hit) => (
                <div key={hit.chunk_id} className="mini-hit">
                  <div className="mini-hit-top">
                    <b>{hit.document_name}</b>
                    <Tag color="success">{Math.round(hit.score * 100)}%</Tag>
                  </div>
                  <p>{hit.snippet}</p>
                  <div className="mini-hit-foot">
                    片段 {hit.chunk_index + 1} · 耗时 {result.elapsed_ms}ms
                  </div>
                </div>
              ))
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="没有命中片段，换个关键词试试"
              />
            )
          ) : (
            <div className="test-empty">
              {disabled ? '先上传一篇资料，再进行检索测试。' : '输入问题后点击右侧按钮。'}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
