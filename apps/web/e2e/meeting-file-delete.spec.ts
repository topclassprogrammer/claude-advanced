import { test, expect } from '@playwright/test';
import {
  registerUser,
  createMeeting,
  uploadMeetingFile,
  getMeeting,
} from './helpers/api';

const API_URL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3001';

test('organizer deletes the attached file and card reverts to empty state', async ({
  page,
  context,
}) => {
  const email = `file-delete-${Date.now()}@example.com`;
  const password = 'password123';
  const token = await registerUser(email, password);
  const meetingId = await createMeeting(token, {
    title: 'Retro',
    date: '2026-09-04T10:00:00.000Z',
    participants: [],
  });
  await uploadMeetingFile(token, meetingId, 'notes.txt', 'hello', 'text/plain');

  await context.addInitScript((accessToken) => {
    window.localStorage.setItem('accessToken', accessToken);
  }, token);

  await page.goto(`/meetings/${meetingId}`);
  await expect(page.getByText('notes.txt')).toBeVisible();

  const deleteButton = page.getByRole('button', { name: /удалить/i });
  await expect(deleteButton).toBeVisible();
  await deleteButton.click();

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /удалить/i }).click();

  await expect(page.getByText(/файл не прикреплён/i)).toBeVisible();
  await expect(page.getByText('notes.txt')).toHaveCount(0);
});

test('cancelling the confirmation dialog keeps the file attached', async ({
  page,
  context,
}) => {
  const email = `file-delete-cancel-${Date.now()}@example.com`;
  const password = 'password123';
  const token = await registerUser(email, password);
  const meetingId = await createMeeting(token, {
    title: 'Cancel deletion',
    date: '2026-09-04T11:00:00.000Z',
    participants: [],
  });
  await uploadMeetingFile(token, meetingId, 'keep.txt', 'hello', 'text/plain');

  await context.addInitScript((accessToken) => {
    window.localStorage.setItem('accessToken', accessToken);
  }, token);

  await page.goto(`/meetings/${meetingId}`);
  await page.getByRole('button', { name: /удалить/i }).click();

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /отмена/i }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('keep.txt')).toBeVisible();
});

test('delete button is not visible to a non-organizer', async ({
  page,
  context,
}) => {
  const organizerEmail = `file-delete-owner-${Date.now()}@example.com`;
  const organizerToken = await registerUser(organizerEmail, 'password123');
  const meetingId = await createMeeting(organizerToken, {
    title: 'Non-organizer view',
    date: '2026-09-05T10:00:00.000Z',
    participants: [],
  });
  await uploadMeetingFile(
    organizerToken,
    meetingId,
    'shared.txt',
    'shared content',
    'text/plain',
  );
  const meeting = await getMeeting(organizerToken, meetingId);

  const otherEmail = `file-delete-other-${Date.now()}@example.com`;
  const otherToken = await registerUser(otherEmail, 'password123');

  await context.addInitScript((accessToken) => {
    window.localStorage.setItem('accessToken', accessToken);
  }, otherToken);

  // The meeting itself is only readable by its organizer; to exercise the
  // "non-organizer viewing a meeting's file" UI state without changing that
  // backend rule, the meeting fetch is mocked to return the organizer's
  // meeting while the file endpoints hit the real API with the other user's
  // (non-organizer) token, which is not organizer-gated for reads. Matched
  // against the API origin exactly, so the Next.js page route of the same
  // shape (http://localhost:3000/meetings/:id) is left untouched.
  await page.route(`${API_URL}/meetings/${meetingId}`, async (route) => {
    await route.fulfill({ status: 200, json: meeting });
  });

  await page.goto(`/meetings/${meetingId}`);

  await expect(page.getByText('shared.txt')).toBeVisible();
  await expect(page.getByRole('button', { name: /удалить/i })).toHaveCount(0);
});

test('full lifecycle: upload, display, download, delete', async ({
  page,
  context,
}) => {
  const email = `file-lifecycle-${Date.now()}@example.com`;
  const password = 'password123';
  const token = await registerUser(email, password);
  const meetingId = await createMeeting(token, {
    title: 'Lifecycle meeting',
    date: '2026-09-06T10:00:00.000Z',
    participants: [],
  });

  await context.addInitScript((accessToken) => {
    window.localStorage.setItem('accessToken', accessToken);
  }, token);

  await page.goto(`/meetings/${meetingId}`);
  await expect(page.getByText(/файл не прикреплён/i)).toBeVisible();

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

  await page.getByRole('button', { name: /удалить/i }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: /удалить/i }).click();

  await expect(page.getByText(/файл не прикреплён/i)).toBeVisible();
});
