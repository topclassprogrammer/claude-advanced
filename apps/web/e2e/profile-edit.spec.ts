import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { test, expect } from '@playwright/test';
import { registerUser, uploadAvatar } from './helpers/api';
import { setSessionCookie } from './helpers/session';

// 1x1 transparent PNG.
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test('editing the name via the form updates /profile and the home page header', async ({
  page,
  context,
}) => {
  const email = `profile-edit-name-${Date.now()}@example.com`;
  const { refreshTokenCookie } = await registerUser(email, 'password123');
  await setSessionCookie(context, refreshTokenCookie);

  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Профиль' })).toBeVisible();

  await page.getByLabel('Имя').fill('Борис Новый');
  await page.getByRole('button', { name: 'Сохранить' }).click();

  await expect(
    page.getByText('Борис Новый', { exact: true }).first(),
  ).toBeVisible();

  await page.goto('/');
  await expect(page.getByText('Борис Новый', { exact: true })).toBeVisible();
});

test('uploading a valid avatar via drag-and-drop updates the avatar on /profile and the home page', async ({
  page,
  context,
}) => {
  const email = `profile-edit-avatar-${Date.now()}@example.com`;
  const { refreshTokenCookie } = await registerUser(email, 'password123');
  await setSessionCookie(context, refreshTokenCookie);

  await page.goto('/profile');
  await expect(page.getByTestId('avatar-placeholder').first()).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(PNG_BASE64, 'base64'),
  });

  await expect(page.getByRole('img', { name: /аватар/i })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Удалить аватар' }),
  ).toBeVisible();

  await page.goto('/');
  await expect(page.getByRole('img', { name: /аватар/i })).toBeVisible();
});

test('rejects an avatar with a disallowed file type with a clear error, without losing the page', async ({
  page,
  context,
}) => {
  const email = `profile-edit-avatar-invalid-type-${Date.now()}@example.com`;
  const { refreshTokenCookie } = await registerUser(email, 'password123');
  await setSessionCookie(context, refreshTokenCookie);

  await page.goto('/profile');

  await page.locator('input[type="file"]').setInputFiles({
    name: 'not-an-image.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('hello'),
  });

  await expect(page.getByText(/недопустимый тип файла/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Профиль' })).toBeVisible();
  await expect(page.getByTestId('avatar-placeholder').first()).toBeVisible();
});

test('rejects an oversized avatar with a clear error, without losing the page', async ({
  page,
  context,
}) => {
  const email = `profile-edit-avatar-oversized-${Date.now()}@example.com`;
  const { refreshTokenCookie } = await registerUser(email, 'password123');
  await setSessionCookie(context, refreshTokenCookie);

  await page.goto('/profile');

  const oversizedPath = join(tmpdir(), `huge-avatar-${Date.now()}.png`);
  writeFileSync(oversizedPath, Buffer.alloc(5 * 1024 * 1024 + 1, 'a'));

  await page.locator('input[type="file"]').setInputFiles(oversizedPath);

  await expect(page.getByText(/превышает.*размер/i)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Профиль' })).toBeVisible();
  await expect(page.getByTestId('avatar-placeholder').first()).toBeVisible();
});

test('deleting the avatar reverts to the placeholder', async ({
  page,
  context,
}) => {
  const email = `profile-edit-avatar-delete-${Date.now()}@example.com`;
  const { accessToken: token, refreshTokenCookie } = await registerUser(
    email,
    'password123',
  );
  await uploadAvatar(
    token,
    'avatar.png',
    Buffer.from(PNG_BASE64, 'base64'),
    'image/png',
  );
  await setSessionCookie(context, refreshTokenCookie);

  await page.goto('/profile');
  await expect(page.getByRole('img', { name: /аватар/i })).toBeVisible();

  await page.getByRole('button', { name: 'Удалить аватар' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Удалить' }).click();

  await expect(page.getByTestId('avatar-placeholder').first()).toBeVisible();

  await page.goto('/');
  await expect(page.getByTestId('avatar-placeholder').first()).toBeVisible();
});
