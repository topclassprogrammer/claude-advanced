import { test, expect } from '@playwright/test';
import { registerUser, createMeeting, uploadMeetingFile } from './helpers/api';
import { setSessionCookie } from './helpers/session';

const FAKE_TRANSCRIPT_TEXT =
  'Добро пожаловать на встречу. Сегодня обсудим план спринта.';
const FAKE_SUMMARY_TEXT =
  'Обсудили план спринта и распределили задачи между командой.';
const FAKE_ACTION_ITEMS = [
  { text: 'Подготовить макеты', assignee: 'Анна' },
  { text: 'Проверить бюджет', assignee: null },
];
const FAKE_DECISIONS = ['Перенести релиз на следующую неделю'];

async function setupMeetingWithAudioFile(prefix: string) {
  const email = `${prefix}-${Date.now()}@example.com`;
  const password = 'password123';
  const { accessToken: token, refreshTokenCookie } = await registerUser(
    email,
    password,
  );
  const meetingId = await createMeeting(token, {
    title: 'Meeting with summary',
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

type FakeFile = {
  id: string;
  transcription: { status: string; text: string | null } | null;
  summary: {
    status: string;
    summary: string | null;
    actionItems: { text: string; assignee: string | null }[];
    decisions: string[];
  } | null;
};

/**
 * Applies `mutate` to the target file in a GET /meetings/:id/files response and
 * fulfills the route with the result. Passes non-GET requests through untouched,
 * and leaves non-2xx responses (e.g. a 401 mid silent-refresh, transient 5xx) as-is
 * instead of mutating an error body — matters for tests that reload the page, where
 * the files fetch can race the access token being restored.
 */
function routeFilesResponse(
  page: import('@playwright/test').Page,
  fileId: string,
  mutate: (file: FakeFile) => void,
) {
  return page.route('**/meetings/*/files', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    if (!response.ok()) {
      await route.fulfill({ response });
      return;
    }
    const body = (await response.json()) as FakeFile[];
    const target = body.find((file) => file.id === fileId);
    if (target) mutate(target);
    await route.fulfill({ response, json: body });
  });
}

/**
 * Real Whisper/Claude execution isn't available in the test environment, so the
 * transcription -> summary status progression is faked at the network layer,
 * the same route-interception pattern used in meeting-file-transcription.spec.ts.
 * Once the summary reaches COMPLETED, later polls (including the one triggered by
 * a page reload) keep returning COMPLETED — mirrors real backend persistence.
 */
async function fakeSummaryProgress(
  page: import('@playwright/test').Page,
  fileId: string,
) {
  let pollCount = 0;
  await routeFilesResponse(page, fileId, (target) => {
    pollCount += 1;
    if (pollCount === 1) {
      target.transcription = { status: 'PROCESSING', text: null };
      target.summary = null;
    } else if (pollCount === 2) {
      target.transcription = { status: 'COMPLETED', text: FAKE_TRANSCRIPT_TEXT };
      target.summary = {
        status: 'PENDING',
        summary: null,
        actionItems: [],
        decisions: [],
      };
    } else if (pollCount === 3) {
      target.transcription = { status: 'COMPLETED', text: FAKE_TRANSCRIPT_TEXT };
      target.summary = {
        status: 'PROCESSING',
        summary: null,
        actionItems: [],
        decisions: [],
      };
    } else {
      target.transcription = { status: 'COMPLETED', text: FAKE_TRANSCRIPT_TEXT };
      target.summary = {
        status: 'COMPLETED',
        summary: FAKE_SUMMARY_TEXT,
        actionItems: FAKE_ACTION_ITEMS,
        decisions: FAKE_DECISIONS,
      };
    }
  });
}

test('shows summary status that updates without reload and reveals summary content', async ({
  page,
  context,
}) => {
  test.setTimeout(45000);
  const { refreshTokenCookie, meetingId, fileId } =
    await setupMeetingWithAudioFile('summary-status');

  await fakeSummaryProgress(page, fileId);
  await setSessionCookie(context, refreshTokenCookie);

  await page.goto(`/meetings/${meetingId}`);

  const summaryChip = page.getByTestId('summary-status-chip');
  await expect(page.getByTestId('transcription-status-chip')).toHaveText(
    /готово/i,
    { timeout: 20000 },
  );
  await expect(summaryChip).toHaveText(/в процессе/i);
  await expect(summaryChip).toHaveText(/готово/i, { timeout: 20000 });

  await page.getByRole('button', { name: /выжимка/i }).click();
  await expect(page.getByTestId('summary-text')).toHaveText(FAKE_SUMMARY_TEXT);

  const actionItems = page.getByTestId('summary-action-items');
  await expect(actionItems).toContainText('Подготовить макеты — Анна');
  await expect(actionItems).toContainText('Проверить бюджет');
  await expect(actionItems).not.toContainText('Проверить бюджет —');

  const decisions = page.getByTestId('summary-decisions');
  await expect(decisions).toContainText(FAKE_DECISIONS[0]);
});

test('persists summary content after reloading the page', async ({
  page,
  context,
}) => {
  test.setTimeout(45000);
  const { refreshTokenCookie, meetingId, fileId } =
    await setupMeetingWithAudioFile('summary-persist');

  await fakeSummaryProgress(page, fileId);
  await setSessionCookie(context, refreshTokenCookie);

  await page.goto(`/meetings/${meetingId}`);
  await expect(page.getByTestId('summary-status-chip')).toHaveText(
    /готово/i,
    { timeout: 20000 },
  );

  await page.reload();

  await expect(page.getByTestId('summary-status-chip')).toHaveText(
    /готово/i,
    { timeout: 20000 },
  );
  await page.getByRole('button', { name: /выжимка/i }).click();
  await expect(page.getByTestId('summary-text')).toHaveText(FAKE_SUMMARY_TEXT);
});

test('shows explicit empty markers when action items and decisions lists are empty', async ({
  page,
  context,
}) => {
  const { refreshTokenCookie, meetingId, fileId } =
    await setupMeetingWithAudioFile('summary-empty-lists');

  await routeFilesResponse(page, fileId, (target) => {
    target.transcription = { status: 'COMPLETED', text: FAKE_TRANSCRIPT_TEXT };
    target.summary = {
      status: 'COMPLETED',
      summary: FAKE_SUMMARY_TEXT,
      actionItems: [],
      decisions: [],
    };
  });
  await setSessionCookie(context, refreshTokenCookie);

  await page.goto(`/meetings/${meetingId}`);

  await page.getByRole('button', { name: /выжимка/i }).click();
  await expect(page.getByTestId('summary-action-items-empty')).toHaveText(
    /нет пунктов/i,
  );
  await expect(page.getByTestId('summary-decisions-empty')).toHaveText(
    /нет пунктов/i,
  );
  await expect(page.getByTestId('summary-action-items')).toHaveCount(0);
  await expect(page.getByTestId('summary-decisions')).toHaveCount(0);
});

test('shows a failed summary status without blocking download/delete', async ({
  page,
  context,
}) => {
  const { refreshTokenCookie, meetingId, fileId } =
    await setupMeetingWithAudioFile('summary-failed');

  await routeFilesResponse(page, fileId, (target) => {
    target.transcription = { status: 'COMPLETED', text: FAKE_TRANSCRIPT_TEXT };
    target.summary = {
      status: 'FAILED',
      summary: null,
      actionItems: [],
      decisions: [],
    };
  });
  await setSessionCookie(context, refreshTokenCookie);

  await page.goto(`/meetings/${meetingId}`);

  await expect(page.getByTestId('summary-status-chip')).toHaveText(/ошибка/i);
  await expect(page.getByRole('button', { name: /выжимка/i })).toHaveCount(0);

  await expect(page.getByRole('button', { name: /скачать/i })).toBeEnabled();
  await expect(
    page.getByRole('button', { name: 'Удалить', exact: true }),
  ).toBeEnabled();
});

test('shows no summary status for a non-transcribable file type', async ({
  page,
  context,
}) => {
  const email = `summary-not-applicable-${Date.now()}@example.com`;
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
  await expect(page.getByTestId('summary-status-chip')).toHaveCount(0);
});
