import { test, expect } from '@playwright/test';
import { registerUser, createMeeting, uploadMeetingFile } from './helpers/api';

test('displays attached meeting file card with working download', async ({
  page,
  context,
}) => {
  const email = `file-card-${Date.now()}@example.com`;
  const password = 'password123';
  const token = await registerUser(email, password);
  const meetingId = await createMeeting(token, {
    title: 'Sprint planning',
    date: '2026-09-01T10:00:00.000Z',
    participants: ['alice@example.com'],
  });
  const filename = 'notes.txt';
  const content = 'hello meeting notes';
  await uploadMeetingFile(token, meetingId, filename, content, 'text/plain');

  await context.addInitScript((accessToken) => {
    window.localStorage.setItem('accessToken', accessToken);
  }, token);

  await page.goto(`/meetings/${meetingId}`);

  await expect(page.getByText(filename)).toBeVisible();
  await expect(page.getByText(/Б|КБ|МБ/)).toBeVisible();

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
  const email = `file-card-empty-${Date.now()}@example.com`;
  const password = 'password123';
  const token = await registerUser(email, password);
  const meetingId = await createMeeting(token, {
    title: 'No file meeting',
    date: '2026-09-02T10:00:00.000Z',
    participants: [],
  });

  await context.addInitScript((accessToken) => {
    window.localStorage.setItem('accessToken', accessToken);
  }, token);

  await page.goto(`/meetings/${meetingId}`);

  await expect(page.getByRole('button', { name: /скачать/i })).toHaveCount(0);
  await expect(page.getByText(/файл не прикреплён/i)).toBeVisible();
});
