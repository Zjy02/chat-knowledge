import { Card, Statistic } from 'antd';
import {
  CheckCircleOutlined,
  FileTextOutlined,
  MessageOutlined,
  PartitionOutlined,
} from '@ant-design/icons';
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
      icon: <FileTextOutlined />,
    },
    {
      label: '知识片段',
      value: stats.chunk_count,
      suffix: 'chunks',
      sub: stats.document_count
        ? `平均 ${Math.round(stats.chunk_count / stats.document_count)} 段 / 篇`
        : '上传后自动切分',
      icon: <PartitionOutlined />,
    },
    {
      label: '累计提问',
      value: stats.question_count,
      suffix: '次',
      sub: '基于知识库的持续对话',
      icon: <MessageOutlined />,
    },
    {
      label: '已就绪',
      value: stats.ready_count,
      suffix: '篇',
      sub:
        stats.document_count - stats.ready_count > 0
          ? `${stats.document_count - stats.ready_count} 篇处理中`
          : '全部资料可检索',
      icon: <CheckCircleOutlined />,
    },
  ];

  return (
    <div className="stats-grid">
      {cards.map((card) => (
        <Card key={card.label} className="stat-card" variant="borderless" size="small">
          <div className="stat-top">
            <span>{card.label}</span>
            {card.icon}
          </div>
          <Statistic value={card.value} suffix={card.suffix} />
          <div className="stat-sub">{card.sub}</div>
        </Card>
      ))}
    </div>
  );
}
