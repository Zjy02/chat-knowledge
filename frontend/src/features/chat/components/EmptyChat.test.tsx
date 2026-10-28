import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmptyChat } from './EmptyChat';

describe('EmptyChat', () => {
  it('shows knowledge stats and sends a suggestion', async () => {
    const onAsk = vi.fn();
    render(
      <EmptyChat
        stats={{ document_count: 2, ready_count: 2, chunk_count: 9, question_count: 3 }}
        onAsk={onAsk}
      />,
    );
    expect(screen.getByText(/已连接 2 篇资料/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /梳理核心结论/ }));
    expect(onAsk).toHaveBeenCalledWith('总结知识库里关于 RAG 评估的核心结论');
  });
});
