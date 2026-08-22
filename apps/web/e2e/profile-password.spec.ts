import { test, expect } from '@playwright/test';
import { registerUser } from './helpers/api';

async function loginAs(
  page: import('@playwright/test').Page,
  context: import('@playwright/test').BrowserContext,
  token: string,
) {
  await context.addInitScript((accessToken) => {
    window.localStorage.setItem('accessToken', accessToken);
  }, token);
  void page;
}

test('changing the password with the correct old password allows logging in with the new one', async ({
  page,
  context,
}) => {
  const email = `profile-password-${Date.now()}@example.com`;
  const token = await registerUser(email, 'password123');
  await loginAs(page, context, token);

  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Профиль' })).toBeVisible();

  await page.getByLabel('Текущий пароль').fill('password123');
  await page.getByLabel('Новый пароль').fill('newpassword456');
  await page.getByRole('button', { name: 'Сменить пароль' }).click();

  await expect(page.getByText(/пароль изменён/i)).toBeVisible();

  await page.evaluate(() => window.localStorage.removeItem('accessToken'));
  await page.goto('/auth/login');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('textbox', { name: 'Пароль' }).fill('newpassword456');
  await page.getByRole('button', { name: 'Войти' }).click();

  await expect(page).toHaveURL('/');
});

test('changing the password with an incorrect old password shows a clear error without resetting the form', async ({
  page,
  context,
}) => {
  const email = `profile-password-wrong-${Date.now()}@example.com`;
  const token = await registerUser(email, 'password123');
  await loginAs(page, context, token);

  await page.goto('/profile');

  await page.getByLabel('Текущий пароль').fill('wrongpassword');
  await page.getByLabel('Новый пароль').fill('newpassword456');
  await page.getByRole('button', { name: 'Сменить пароль' }).click();

  await expect(page.getByText(/неверный текущий пароль|invalid credentials/i)).toBeVisible();
  await expect(page.getByLabel('Текущий пароль')).toHaveValue('wrongpassword');
  await expect(page.getByLabel('Новый пароль')).toHaveValue('newpassword456');
});

test('changing to a too-short new password shows a validation error', async ({
  page,
  context,
}) => {
  const email = `profile-password-short-${Date.now()}@example.com`;
  const token = await registerUser(email, 'password123');
  await loginAs(page, context, token);

  await page.goto('/profile');

  await page.getByLabel('Текущий пароль').fill('password123');
  await page.getByLabel('Новый пароль').fill('short');
  await page.getByRole('button', { name: 'Сменить пароль' }).click();

  await expect(page.getByText(/минимум 8 символов/i)).toBeVisible();
});
