import { describe, expect, it } from 'vitest';
import { formatBytes, formatRelativeTime, initials, truncate } from './format';

describe('format helpers', () => {
  it('treats API datetimes as UTC when no timezone is present', () => {
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString().replace('Z', '');
    expect(formatRelativeTime(eightHoursAgo)).toBe('8 小时前');
  });

  it('formats bytes and initials', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MB');
    expect(initials('周谨宇')).toBe('周');
  });

  it('truncates long text', () => {
    expect(truncate('abcdef', 3)).toBe('abc…');
    expect(truncate('abc', 3)).toBe('abc');
  });
});
