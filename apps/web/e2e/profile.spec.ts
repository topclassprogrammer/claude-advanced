import { test, expect } from '@playwright/test';
import { registerUser, updateProfileName, uploadAvatar } from './helpers/api';
import { setSessionCookie } from './helpers/session';

// 1x1 transparent PNG.
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

test('shows default name derived from email and avatar placeholder when profile has no name/avatar', async ({
  page,
  context,
}) => {
  const email = `profile-default-${Date.now()}@example.com`;
  const { refreshTokenCookie } = await registerUser(email, 'password123');
  await setSessionCookie(context, refreshTokenCookie);

  await page.goto('/profile');

  await expect(
    page.getByText(email.split('@')[0], { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByTestId('avatar-placeholder')).toBeVisible();
});

test('shows name and avatar set via API on the profile page and on the home page header', async ({
  page,
  context,
}) => {
  const email = `profile-full-${Date.now()}@example.com`;
  const { accessToken: token, refreshTokenCookie } = await registerUser(
    email,
    'password123',
  );
  await updateProfileName(token, 'Alice Example');
  await uploadAvatar(
    token,
    'avatar.png',
    Buffer.from(PNG_BASE64, 'base64'),
    'image/png',
  );
  await setSessionCookie(context, refreshTokenCookie);

  await page.goto('/profile');
  await expect(page.getByText('Alice Example')).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByRole('img', { name: /аватар/i })).toBeVisible();

  await page.goto('/');
  await expect(page.getByText('Alice Example')).toBeVisible();
  await expect(page.getByRole('img', { name: /аватар/i })).toBeVisible();
});
