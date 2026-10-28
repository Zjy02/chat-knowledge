import path from 'node:path';
import { expect, test } from '@playwright/test';

test('注册、提问、上传知识库并验证引用与重命名', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  await page.goto('/register');
  await page.getByLabel('昵称').fill('E2E 用户');
  await page.getByLabel('邮箱').fill(email);
  await page.getByLabel('密码', { exact: true }).fill('Demo1234');
  await page.getByRole('button', { name: '创建账号' }).click();
  await expect(page).toHaveURL(/\/chat$/, { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: /把知识/ })).toBeVisible();

  // 1. 通用对话：SSE 流式回答完成
  await page.getByLabel('输入问题').fill('什么是 RRF？');
  await page.getByRole('button', { name: '发送' }).click();
  await expect(page.locator('.msg.assistant')).toHaveCount(1);
  await expect(page.locator('.msg.assistant')).toContainText('本地演示模式', {
    timeout: 30_000,
  });
  await expect(page.locator('.msg.assistant .msg-tools')).toBeVisible();

  // 2. 上传资料，等待后台解析完成
  await page.getByRole('link', { name: /知识库/ }).click();
  await expect(page).toHaveURL(/\/knowledge$/);
  await page.getByRole('button', { name: '上传资料', exact: true }).first().click();
  await page
    .locator('input[type=file]')
    .setInputFiles(path.join(process.cwd(), 'e2e/fixtures/rag-note.md'));
  await page.getByRole('button', { name: '开始解析' }).click();
  await expect(page.locator('.doc-row')).toHaveCount(1);
  await expect(page.locator('.doc-row')).toContainText('rag-note.md');
  await expect(page.locator('.doc-row .status.ready')).toBeVisible({ timeout: 30_000 });

  // 3. 检索测试能看到命中片段
  await page.getByPlaceholder('例如：BM25 和向量怎么融合').fill('BM25 向量 融合');
  await page.getByRole('button', { name: '检索' }).click();
  await expect(page.locator('.mini-hit').first()).toBeVisible();
  await expect(page.locator('.mini-hit').first()).toContainText('rag-note.md');

  // 4. 新会话中提问，回答带可展开引用
  await page.getByRole('button', { name: /开启新对话/ }).click();
  await expect(page).toHaveURL(/\/chat$/);
  await page.getByLabel('输入问题').fill('混合检索里 BM25 和向量怎么融合？');
  await page.getByRole('button', { name: '发送' }).click();
  await expect(page.locator('.cite-chip').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('.cite-chip').first()).toContainText('rag-note.md');
  await page.locator('.cite-chip').first().click();
  await expect(page.getByText('原文片段')).toBeVisible();
  await page.getByRole('button', { name: '知道了' }).click();

  // 5. 重命名当前会话
  await page.locator('.conv.active').hover();
  await page.locator('.conv.active .conv-more').click({ force: true });
  await page.getByRole('menuitem', { name: '重命名' }).click();
  const titleInput = page.getByLabel('会话标题');
  await titleInput.fill('E2E 引用验证');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(page.locator('.conv.active .conv-title')).toHaveText('E2E 引用验证');

  // 6. 刷新后历史消息仍可回放
  await page.reload();
  await expect(page.locator('.msg.assistant')).toHaveCount(1);
  await expect(page.getByText('E2E 引用验证').first()).toBeVisible();
});
