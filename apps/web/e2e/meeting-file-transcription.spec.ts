import { test, expect } from '@playwright/test';
import { registerUser, createMeeting, uploadMeetingFile } from './helpers/api';
import { setSessionCookie } from './helpers/session';

const FAKE_TRANSCRIPT_TEXT =
  'Добро пожаловать на встречу. Сегодня обсудим план спринта.';

async function setupMeetingWithAudioFile(prefix: string) {
  const email = `${prefix}-${Date.now()}@example.com`;
  const password = 'password123';
  const { accessToken: token, refreshTokenCookie } = await registerUser(
    email,
    password,
  );
  const meetingId = await createMeeting(token, {
    title: 'Transcribed recording',
    date: '2026-09-07T10:00:00.000Z',
    participants: [],
  });
  const fileId = await uploadMeetingFile(
    token,
    meetingId,
    'recording.mp3',
    'fake audio bytes',
    'audio/mpeg',
  );
  return { token, refreshTokenCookie, meetingId, fileId };
}

/**
 * Real Whisper execution isn't available in the test environment, so the
 * transcription's status/text progression (PENDING/PROCESSING -> COMPLETED)
 * is faked at the network layer, the same route-interception pattern already
 * used for the upload-progress test in meeting-file.spec.ts. Only the polled
 * GET /meetings/:id/files responses are rewritten — everything else (auth,
 * meeting creation, file upload) goes through the real API.
 */
async function fakeTranscriptionProgress(
  page: import('@playwright/test').Page,
  fileId: string,
) {
  let pollCount = 0;
  await page.route('**/meetings/*/files', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    pollCount += 1;
    const response = await route.fetch();
    const body = (await response.json()) as Array<{
      id: string;
      transcription: { status: string; text: string | null } | null;
    }>;
    const target = body.find((file) => file.id === fileId);
    if (target) {
      target.transcription =
        pollCount === 1
          ? { status: 'PROCESSING', text: null }
          : { status: 'COMPLETED', text: FAKE_TRANSCRIPT_TEXT };
    }
    await route.fulfill({ response, json: body });
  });
}

test('shows transcription status that updates without reload and reveals the transcript text', async ({
  page,
  context,
}) => {
  const { refreshTokenCookie, meetingId, fileId } =
    await setupMeetingWithAudioFile('transcription-status');

  await setSessionCookie(context, refreshTokenCookie);
  // Warm up the route's compilation (Next dev compiles on demand) before
  // starting the timed PENDING -> PROCESSING -> COMPLETED poll sequence below,
  // otherwise a slow first compile can eat into the 4s poll interval and the
  // PROCESSING state can be missed entirely.
  await page.goto('/');
  await fakeTranscriptionProgress(page, fileId);

  await page.goto(`/meetings/${meetingId}`);

  const statusChip = page.getByTestId('transcription-status-chip');
  await expect(statusChip).toHaveText(/в процессе/i);

  await expect(statusChip).toHaveText(/готово/i, { timeout: 10000 });
  await expect(page.getByText(/файлы не прикреплены/i)).toHaveCount(0);

  await page.getByRole('button', { name: /транскрипт/i }).click();
  await expect(page.getByTestId('transcription-text')).toHaveText(
    FAKE_TRANSCRIPT_TEXT,
  );
});

test('shows a failed transcription status without blocking download/delete', async ({
  page,
  context,
}) => {
  const { refreshTokenCookie, meetingId, fileId } =
    await setupMeetingWithAudioFile('transcription-failed');

  await page.route('**/meetings/*/files', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const body = (await response.json()) as Array<{
      id: string;
      transcription: { status: string; text: string | null } | null;
    }>;
    const target = body.find((file) => file.id === fileId);
    if (target) {
      target.transcription = { status: 'FAILED', text: null };
    }
    await route.fulfill({ response, json: body });
  });
  await setSessionCookie(context, refreshTokenCookie);

  await page.goto(`/meetings/${meetingId}`);

  await expect(page.getByTestId('transcription-status-chip')).toHaveText(
    /ошибка/i,
  );
  await expect(page.getByTestId('transcription-text')).toHaveCount(0);

  // Download/delete stay functional despite the failed transcription.
  await expect(page.getByRole('button', { name: /скачать/i })).toBeEnabled();
  await expect(
    page.getByRole('button', { name: 'Удалить', exact: true }),
  ).toBeEnabled();
});

test('shows no transcription status for a non-transcribable file type', async ({
  page,
  context,
}) => {
  const email = `transcription-not-applicable-${Date.now()}@example.com`;
  const { accessToken: token, refreshTokenCookie } = await registerUser(
    email,
    'password123',
  );
  const meetingId = await createMeeting(token, {
    title: 'Document only meeting',
    date: '2026-09-07T11:00:00.000Z',
    participants: [],
  });
  await uploadMeetingFile(token, meetingId, 'agenda.pdf', '%PDF-1.4', 'application/pdf');

  await setSessionCookie(context, refreshTokenCookie);

  await page.goto(`/meetings/${meetingId}`);

  await expect(page.getByText('agenda.pdf')).toBeVisible();
  await expect(page.getByTestId('transcription-status-chip')).toHaveCount(0);
});
