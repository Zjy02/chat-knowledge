import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Markdown } from './Markdown';

describe('Markdown', () => {
  it('renders markdown and turns citation markers into buttons', async () => {
    const onCitationClick = vi.fn();
    render(
      <Markdown
        content={'## 结论\n\n混合检索效果更好[1]。\n\n- 先 RRF\n- 再加权融合'}
        onCitationClick={onCitationClick}
      />,
    );
    expect(screen.getByRole('heading', { name: '结论' })).toBeInTheDocument();
    expect(screen.getByText('先 RRF')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '查看引用 1' }));
    expect(onCitationClick).toHaveBeenCalledWith(1);
  });

  it('does not render raw HTML from model output', () => {
    const { container } = render(<Markdown content={'<script>alert(1)</script>'} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<script>');
  });

  it('keeps citation-like text inside code blocks untouched', () => {
    render(<Markdown content={'```ts\nconst x = arr[1];\n```'} />);
    expect(screen.queryByRole('button', { name: '查看引用 1' })).toBeNull();
  });
});
