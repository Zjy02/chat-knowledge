import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ChatComposer } from './ChatComposer';

function setup(overrides: Partial<Parameters<typeof ChatComposer>[0]> = {}) {
  const props = {
    value: '你好',
    onChange: vi.fn(),
    onSend: vi.fn(),
    onStop: vi.fn(),
    onAttach: vi.fn(),
    onToggleKnowledge: vi.fn(),
    streaming: false,
    useKnowledge: true,
    ...overrides,
  };
  render(<ChatComposer {...props} />);
  return props;
}

describe('ChatComposer', () => {
  it('sends on Enter and keeps Shift+Enter as a newline', () => {
    const props = setup();
    const textarea = screen.getByLabelText('输入问题');
    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(props.onSend).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(props.onSend).toHaveBeenCalledTimes(1);
  });

  it('shows a stop action while streaming', async () => {
    const props = setup({ streaming: true, value: '' });
    await userEvent.click(screen.getByRole('button', { name: '停止生成' }));
    expect(props.onStop).toHaveBeenCalledTimes(1);
  });

  it('toggles knowledge mode and opens the file picker', async () => {
    const props = setup();
    await userEvent.click(screen.getByTitle('正在使用知识库回答'));
    expect(props.onToggleKnowledge).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: '上传资料' }));
    expect(props.onAttach).toHaveBeenCalledTimes(1);
  });
});
