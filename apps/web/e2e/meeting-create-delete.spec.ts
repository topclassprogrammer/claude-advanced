import { test, expect } from '@playwright/test';
import { registerUser, createMeeting } from './helpers/api';
import { setSessionCookie } from './helpers/session';

test('creates a meeting via the modal with title, date and description', async ({
  page,
  context,
}) => {
  const email = `meeting-create-${Date.now()}@example.com`;
  const { refreshTokenCookie } = await registerUser(email, 'password123');

  await setSessionCookie(context, refreshTokenCookie);

  await page.goto('/');
  await expect(page.getByText(/у вас пока нет встреч/i)).toBeVisible();

  await page.getByRole('button', { name: 'Создать встречу' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('Заголовок').fill('Планирование спринта');
  await dialog.getByLabel('Дата и время').fill('2026-09-15T14:30');
  await dialog
    .getByLabel('Описание')
    .fill('Обсуждаем задачи на следующий спринт');

  await dialog.getByRole('button', { name: 'Создать' }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Планирование спринта').first()).toBeVisible();
  await expect(
    page.getByText('Обсуждаем задачи на следующий спринт').first(),
  ).toBeVisible();
});

test('deletes a meeting via the confirmation dialog', async ({
  page,
  context,
}) => {
  const email = `meeting-delete-${Date.now()}@example.com`;
  const { accessToken: token, refreshTokenCookie } = await registerUser(
    email,
    'password123',
  );
  await createMeeting(token, {
    title: 'Retro to delete',
    date: '2026-09-16T10:00:00.000Z',
    participants: [],
  });

  await setSessionCookie(context, refreshTokenCookie);

  await page.goto('/');
  await page.getByText('Retro to delete').first().click();

  await page.getByRole('button', { name: 'Удалить встречу' }).click();

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Удалить' }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByText(/у вас пока нет встреч/i)).toBeVisible();
});

test('cancelling the delete confirmation keeps the meeting', async ({
  page,
  context,
}) => {
  const email = `meeting-delete-cancel-${Date.now()}@example.com`;
  const { accessToken: token, refreshTokenCookie } = await registerUser(
    email,
    'password123',
  );
  await createMeeting(token, {
    title: 'Keep this meeting',
    date: '2026-09-17T10:00:00.000Z',
    participants: [],
  });

  await setSessionCookie(context, refreshTokenCookie);

  await page.goto('/');
  await page.getByText('Keep this meeting').first().click();

  await page.getByRole('button', { name: 'Удалить встречу' }).click();

  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Отмена' }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Keep this meeting').first()).toBeVisible();
});
