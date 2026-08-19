import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { test, expect } from '@playwright/test';
import { registerUser, createMeeting } from './helpers/api';

async function setupMeeting(prefix: string) {
  const email = `${prefix}-${Date.now()}@example.com`;
  const password = 'password123';
  const token = await registerUser(email, password);
  const meetingId = await createMeeting(token, {
    title: 'Sprint retro',
    date: '2026-09-03T10:00:00.000Z',
    participants: [],
  });
  return { token, meetingId };
}

test('uploads a file via click-to-select, shows progress and updates the file card', async ({
  page,
  context,
}) => {
  const { token, meetingId } = await setupMeeting('file-upload');

  await context.addInitScript((accessToken) => {
    window.localStorage.setItem('accessToken', accessToken);
  }, token);

  // Delay the server's response so the progress UI stays visible long enough to assert on.
  await page.route('**/meetings/*/file', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.fulfill({ response });
  });

  await page.goto(`/meetings/${meetingId}`);
  await expect(page.getByText(/файл не прикреплён/i)).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: 'agenda.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 fake agenda content'),
  });

  await expect(page.getByRole('progressbar')).toBeVisible();
  await expect(page.getByText('agenda.pdf')).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('progressbar')).toHaveCount(0);
});

test('replaces the attached file when a new one is uploaded', async ({
  page,
  context,
}) => {
  const { token, meetingId } = await setupMeeting('file-upload-replace');

  await context.addInitScript((accessToken) => {
    window.localStorage.setItem('accessToken', accessToken);
  }, token);

  await page.goto(`/meetings/${meetingId}`);

  await page.locator('input[type="file"]').setInputFiles({
    name: 'first.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('first version'),
  });
  await expect(page.getByText('first.txt')).toBeVisible({ timeout: 10000 });

  await page.locator('input[type="file"]').setInputFiles({
    name: 'second.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('second version'),
  });
  await expect(page.getByText('second.txt')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('first.txt')).toHaveCount(0);
});

test('rejects a file with a disallowed type with a clear error', async ({
  page,
  context,
}) => {
  const { token, meetingId } = await setupMeeting('file-upload-bad-type');

  await context.addInitScript((accessToken) => {
    window.localStorage.setItem('accessToken', accessToken);
  }, token);

  await page.goto(`/meetings/${meetingId}`);

  await page.locator('input[type="file"]').setInputFiles({
    name: 'app.exe',
    mimeType: 'application/x-msdownload',
    buffer: Buffer.from('not really an executable'),
  });

  await expect(page.getByText(/недопустимый тип файла/i)).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveCount(0);
});

test('rejects a file exceeding the maximum size with a clear error', async ({
  page,
  context,
}) => {
  const { token, meetingId } = await setupMeeting('file-upload-too-big');

  await context.addInitScript((accessToken) => {
    window.localStorage.setItem('accessToken', accessToken);
  }, token);

  await page.goto(`/meetings/${meetingId}`);

  const oversizedPath = join(tmpdir(), `huge-${Date.now()}.pdf`);
  writeFileSync(oversizedPath, Buffer.alloc(100 * 1024 * 1024 + 1, 'a'));
  await page.locator('input[type="file"]').setInputFiles(oversizedPath);

  await expect(page.getByText(/превышает.*размер/i)).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveCount(0);
});
