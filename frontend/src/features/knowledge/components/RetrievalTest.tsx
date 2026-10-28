import { ArrowUpRight, FlaskConical, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { knowledgeApi } from '../../../api';
import { toast } from '../../../stores/toastStore';
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
      const response = await knowledgeApi.search(value, 3);
      setResult(response);
    } catch (error) {
      toast(error instanceof Error ? error.message : '检索失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel test-panel">
      <div className="panel-head">
        <span className="panel-title">
          <FlaskConical size={13} /> 检索测试
        </span>
        <span className="panel-hint">不消耗模型额度</span>
      </div>
      <div className="test-body">
        <p>输入一个问题，看看知识库会召回哪些片段。</p>
        <div className="test-input">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void run();
            }}
            placeholder="例如：BM25 和向量怎么融合"
            disabled={disabled}
          />
          <button
            type="button"
            onClick={run}
            disabled={disabled || loading || !query.trim()}
            aria-label="检索"
          >
            {loading ? <LoaderCircle size={12} className="spin" /> : <ArrowUpRight size={12} />}
          </button>
        </div>
        <div className="test-result">
          {result ? (
            result.hits.length ? (
              result.hits.map((hit) => (
                <div key={hit.chunk_id} className="mini-hit">
                  <div className="mini-hit-top">
                    <b>{hit.document_name}</b>
                    <span>{Math.round(hit.score * 100)}%</span>
                  </div>
                  <p>{hit.snippet}</p>
                  <div className="mini-hit-foot">
                    片段 {hit.chunk_index + 1} · 耗时 {result.elapsed_ms}ms
                  </div>
                </div>
              ))
            ) : (
              <div className="test-empty">没有命中片段。尝试换一个更具体的关键词。</div>
            )
          ) : (
            <div className="test-empty">
              {disabled ? '先上传一篇资料，再进行检索测试。' : '输入问题后点击右上角按钮。'}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
