import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { test, expect } from '@playwright/test';
import { registerUser, createMeeting, uploadMeetingFile } from './helpers/api';
import { setSessionCookie } from './helpers/session';

async function setupMeeting(
  prefix: string,
  overrides: { title?: string; date?: string } = {},
) {
  const email = `${prefix}-${Date.now()}@example.com`;
  const password = 'password123';
  const { accessToken: token, refreshTokenCookie } = await registerUser(
    email,
    password,
  );
  const meetingId = await createMeeting(token, {
    title: overrides.title ?? 'Sprint retro',
    date: overrides.date ?? '2026-09-03T10:00:00.000Z',
    participants: [],
  });
  return { token, refreshTokenCookie, meetingId };
}

test('displays attached meeting file card with working download', async ({
  page,
  context,
}) => {
  const { token, refreshTokenCookie, meetingId } = await setupMeeting('file-card', {
    title: 'Sprint planning',
    date: '2026-09-01T10:00:00.000Z',
  });
  const filename = 'notes.txt';
  const content = 'hello meeting notes';
  await uploadMeetingFile(token, meetingId, filename, content, 'text/plain');

  await setSessionCookie(context, refreshTokenCookie);

  await page.goto(`/meetings/${meetingId}`);

  await expect(page.getByText(filename)).toBeVisible();
  await expect(page.getByText(/^\d+(\.\d+)?\s(Б|КБ|МБ)/)).toBeVisible();

  const downloadButton = page.getByRole('button', { name: /скачать/i });
  await expect(downloadButton).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    downloadButton.click(),
  ]);
  expect(download.suggestedFilename()).toBe(filename);
});

test('shows empty state when meeting has no attached file', async ({
  page,
  context,
}) => {
  const { refreshTokenCookie, meetingId } = await setupMeeting('file-card-empty', {
    title: 'No file meeting',
    date: '2026-09-02T10:00:00.000Z',
  });

  await setSessionCookie(context, refreshTokenCookie);

  await page.goto(`/meetings/${meetingId}`);

  await expect(page.getByRole('button', { name: /скачать/i })).toHaveCount(0);
  await expect(page.getByText(/файлы не прикреплены/i)).toBeVisible();
});

test('uploads a file via click-to-select, shows progress and updates the file card', async ({
  page,
  context,
}) => {
  const { refreshTokenCookie, meetingId } = await setupMeeting('file-upload');

  await setSessionCookie(context, refreshTokenCookie);

  // Delay the server's response so the progress UI stays visible long enough to assert on.
  await page.route('**/meetings/*/files', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    await new Promise((resolve) => setTimeout(resolve, 800));
    await route.fulfill({ response });
  });

  await page.goto(`/meetings/${meetingId}`);
  await expect(page.getByText(/файлы не прикреплены/i)).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: 'agenda.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 fake agenda content'),
  });

  await expect(page.getByRole('progressbar')).toBeVisible();
  await expect(page.getByText('agenda.pdf')).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('progressbar')).toHaveCount(0);
});

test('adds a second file alongside the first instead of replacing it', async ({
  page,
  context,
}) => {
  const { refreshTokenCookie, meetingId } = await setupMeeting('file-upload-multi');

  await setSessionCookie(context, refreshTokenCookie);

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
  await expect(page.getByText('first.txt')).toBeVisible();
});

test('hides the upload zone once the meeting already has 10 files', async ({
  page,
  context,
}) => {
  const { token, refreshTokenCookie, meetingId } = await setupMeeting('file-upload-limit');

  for (let i = 0; i < 10; i += 1) {
    await uploadMeetingFile(
      token,
      meetingId,
      `notes-${i}.txt`,
      `content ${i}`,
      'text/plain',
    );
  }

  await setSessionCookie(context, refreshTokenCookie);

  await page.goto(`/meetings/${meetingId}`);

  await expect(page.getByText(/достигнут лимит 10 файлов/i)).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
});

test('rejects a file with a disallowed type with a clear error', async ({
  page,
  context,
}) => {
  const { refreshTokenCookie, meetingId } = await setupMeeting('file-upload-bad-type');

  await setSessionCookie(context, refreshTokenCookie);

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
  const { refreshTokenCookie, meetingId } = await setupMeeting('file-upload-too-big');

  await setSessionCookie(context, refreshTokenCookie);

  await page.goto(`/meetings/${meetingId}`);

  const oversizedPath = join(tmpdir(), `huge-${Date.now()}.pdf`);
  writeFileSync(oversizedPath, Buffer.alloc(100 * 1024 * 1024 + 1, 'a'));
  await page.locator('input[type="file"]').setInputFiles(oversizedPath);

  await expect(page.getByText(/превышает.*размер/i)).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveCount(0);
});

test('organizer deletes the attached file and card reverts to empty state', async ({
  page,
  context,
}) => {
  const { token, refreshTokenCookie, meetingId } = await setupMeeting('file-delete', {
    title: 'Retro',
    date: '2026-09-04T10:00:00.000Z',
  });
  await uploadMeetingFile(token, meetingId, 'notes.txt', 'hello', 'text/plain');

  await setSessionCookie(context, refreshTokenCookie);

  await page.goto(`/meetings/${meetingId}`);
  await expect(page.getByText('notes.txt')).toBeVisible();

  const deleteButton = page.getByRole('button', { name: 'Удалить', exact: true });
  await expect(deleteButton).toBeVisible();
  await deleteButton.click();

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /удалить/i }).click();

  await expect(page.getByText(/файлы не прикреплены/i)).toBeVisible();
  await expect(page.getByText('notes.txt')).toHaveCount(0);
});

test('deletes only the selected file, leaving the others attached', async ({
  page,
  context,
}) => {
  const { token, refreshTokenCookie, meetingId } = await setupMeeting('file-delete-selective', {
    title: 'Retro with multiple files',
    date: '2026-09-04T12:00:00.000Z',
  });
  await uploadMeetingFile(token, meetingId, 'keep.txt', 'keep', 'text/plain');
  await uploadMeetingFile(
    token,
    meetingId,
    'remove.txt',
    'remove',
    'text/plain',
  );

  await setSessionCookie(context, refreshTokenCookie);

  await page.goto(`/meetings/${meetingId}`);
  await expect(page.getByText('keep.txt')).toBeVisible();
  await expect(page.getByText('remove.txt')).toBeVisible();

  const removeRow = page.locator('.rounded-xl.bg-default.p-4', {
    hasText: 'remove.txt',
  });
  await removeRow.getByRole('button', { name: /удалить/i }).click();

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('remove.txt')).toBeVisible();
  await dialog.getByRole('button', { name: /удалить/i }).click();

  await expect(page.getByText('remove.txt')).toHaveCount(0);
  await expect(page.getByText('keep.txt')).toBeVisible();
});

test('cancelling the confirmation dialog keeps the file attached', async ({
  page,
  context,
}) => {
  const { token, refreshTokenCookie, meetingId } = await setupMeeting('file-delete-cancel', {
    title: 'Cancel deletion',
    date: '2026-09-04T11:00:00.000Z',
  });
  await uploadMeetingFile(token, meetingId, 'keep.txt', 'hello', 'text/plain');

  await setSessionCookie(context, refreshTokenCookie);

  await page.goto(`/meetings/${meetingId}`);
  await page.getByRole('button', { name: 'Удалить', exact: true }).click();

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /отмена/i }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('keep.txt')).toBeVisible();
});

test('a non-organizer cannot view another user\'s meeting or its files', async ({
  page,
  context,
}) => {
  const { token: organizerToken, meetingId } = await setupMeeting(
    'file-delete-owner',
    { title: 'Non-organizer view', date: '2026-09-05T10:00:00.000Z' },
  );
  await uploadMeetingFile(
    organizerToken,
    meetingId,
    'shared.txt',
    'shared content',
    'text/plain',
  );

  const otherEmail = `file-delete-other-${Date.now()}@example.com`;
  const { refreshTokenCookie: otherRefreshTokenCookie } = await registerUser(
    otherEmail,
    'password123',
  );
  await setSessionCookie(context, otherRefreshTokenCookie);

  // GET /meetings/:id (and the file endpoints) 404/403 for anyone but the
  // organizer, so a non-organizer never sees the meeting's files.
  await page.goto(`/meetings/${meetingId}`);

  await expect(page.getByText(/не удалось загрузить встречу/i)).toBeVisible();
  await expect(page.getByText('shared.txt')).toHaveCount(0);
});

test('full lifecycle: upload, display, download, delete', async ({
  page,
  context,
}) => {
  const { refreshTokenCookie, meetingId } = await setupMeeting('file-lifecycle', {
    title: 'Lifecycle meeting',
    date: '2026-09-06T10:00:00.000Z',
  });

  await setSessionCookie(context, refreshTokenCookie);

  await page.goto(`/meetings/${meetingId}`);
  await expect(page.getByText(/файлы не прикреплены/i)).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: 'lifecycle.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('lifecycle content'),
  });
  await expect(page.getByText('lifecycle.txt')).toBeVisible({
    timeout: 10000,
  });

  const downloadButton = page.getByRole('button', { name: /скачать/i });
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    downloadButton.click(),
  ]);
  expect(download.suggestedFilename()).toBe('lifecycle.txt');

  await page.getByRole('button', { name: 'Удалить', exact: true }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /удалить/i }).click();

  await expect(page.getByText(/файлы не прикреплены/i)).toBeVisible();
});
