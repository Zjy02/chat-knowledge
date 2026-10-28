import { BadgeCheck, FileText, Layers, MessageSquare } from 'lucide-react';
import type { KnowledgeStats } from '../../../types';

interface StatsGridProps {
  stats: KnowledgeStats;
}

export function StatsGrid({ stats }: StatsGridProps) {
  const cards = [
    {
      label: '文档总数',
      value: stats.document_count,
      suffix: '篇',
      sub: `${stats.ready_count} 篇已建立索引`,
      icon: FileText,
    },
    {
      label: '知识片段',
      value: stats.chunk_count,
      suffix: 'chunks',
      sub: stats.document_count
        ? `平均 ${Math.round(stats.chunk_count / stats.document_count)} 段 / 篇`
        : '上传后自动切分',
      icon: Layers,
    },
    {
      label: '累计提问',
      value: stats.question_count,
      suffix: '次',
      sub: '基于知识库的持续对话',
      icon: MessageSquare,
    },
    {
      label: '已就绪',
      value: stats.ready_count,
      suffix: '篇',
      sub:
        stats.document_count - stats.ready_count > 0
          ? `${stats.document_count - stats.ready_count} 篇处理中`
          : '全部资料可检索',
      icon: BadgeCheck,
    },
  ];

  return (
    <div className="stats-grid">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="stat-card">
            <div className="stat-top">
              <span>{card.label}</span>
              <Icon size={13} />
            </div>
            <div className="stat-num">
              {card.value} <span>{card.suffix}</span>
            </div>
            <div className="stat-sub">{card.sub}</div>
          </div>
        );
      })}
    </div>
  );
}
