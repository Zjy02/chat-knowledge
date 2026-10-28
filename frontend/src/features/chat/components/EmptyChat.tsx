import { BookOpen, GitCompareArrows, ListChecks, Search, Sparkles } from 'lucide-react';
import type { KnowledgeStats } from '../../../types';

interface EmptyChatProps {
  stats: KnowledgeStats;
  onAsk: (question: string) => void;
}

const suggestions = [
  {
    icon: BookOpen,
    title: '梳理核心结论',
    text: '总结知识库里关于 RAG 评估的核心结论',
  },
  {
    icon: GitCompareArrows,
    title: '对比技术方案',
    text: '对比 BM25 和向量检索的优缺点',
  },
  {
    icon: Search,
    title: '查产品手册',
    text: '企业版如何开通 SSO？需要哪些配置？',
  },
  {
    icon: ListChecks,
    title: '生成行动清单',
    text: '把资料里的优化建议整理成可执行清单',
  },
];

export function EmptyChat({ stats, onAsk }: EmptyChatProps) {
  return (
    <div className="empty-chat">
      <div className="empty-mark">知</div>
      <div className="empty-eyebrow">
        <Sparkles size={12} />
        YOUR KNOWLEDGE, ANSWERED
      </div>
      <h1>
        把知识，<em>问清楚</em>。
      </h1>
      <p>
        基于你的资料回答，每一句都有出处。
        <br />
        先提一个问题，或从下面的示例开始。
      </p>
      <div className="suggestions">
        {suggestions.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              type="button"
              className="suggestion"
              onClick={() => onAsk(item.text)}
            >
              <span className="s-ico">
                <Icon size={14} />
              </span>
              <span className="s-body">
                <b>{item.title}</b>
                <span>{item.text}</span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="empty-foot">
        <i />
        {stats.ready_count > 0
          ? `已连接 ${stats.ready_count} 篇资料 · ${stats.chunk_count} 个知识片段`
          : '还没有资料，先去知识库上传第一篇文档'}
      </div>
    </div>
  );
}
