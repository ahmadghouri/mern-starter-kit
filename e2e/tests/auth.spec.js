import { expect, test } from '@playwright/test';
import { loginViaUi, newUser, registerViaUi, signOutViaUi } from './helpers.js';

test.describe('authentication', () => {
  test('register, stay signed in after reload, then sign out', async ({ page }) => {
    const user = newUser();

    await registerViaUi(page, user);
    await expect(page.getByRole('heading', { name: `Welcome, ${user.name}` })).toBeVisible();
    await expect(page.getByText(user.email)).toBeVisible();

    // The access token is in memory only, so a reload proves the refresh cookie works.
    await page.reload();
    await expect(page.getByRole('heading', { name: `Welcome, ${user.name}` })).toBeVisible();

    await signOutViaUi(page);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    // After sign out, protected pages redirect to login.
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('login shows an error for wrong password, then succeeds', async ({ page }) => {
    const user = newUser();
    await registerViaUi(page, user);
    await signOutViaUi(page);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    await loginViaUi(page, { email: user.email, password: 'WrongPassword9' });
    await expect(page.getByRole('alert')).toContainText('Invalid email or password');

    await loginViaUi(page, user);
    await expect(page.getByRole('heading', { name: `Welcome, ${user.name}` })).toBeVisible();
  });

  test('refresh cookie is httpOnly and access token is not stored in the browser', async ({
    page,
    context,
  }) => {
    await registerViaUi(page, newUser());
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible();

    const cookies = await context.cookies();
    const refreshCookie = cookies.find((cookie) => cookie.name === 'refresh_token');
    expect(refreshCookie?.httpOnly).toBe(true);
    expect(refreshCookie?.sameSite).toBe('Strict');

    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
    expect(storage).not.toMatch(/eyJ/); // no JWT in web storage
  });

  test('protected page redirects to login and returns after sign in', async ({ page }) => {
    const user = newUser();
    await registerViaUi(page, user);
    await signOutViaUi(page);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel('Email').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('sign out another device from the sessions list', async ({ browser }) => {
    const user = newUser();
    const laptop = await browser.newContext();
    const phone = await browser.newContext();
    const laptopPage = await laptop.newPage();
    const phonePage = await phone.newPage();

    await registerViaUi(laptopPage, user);
    await expect(laptopPage.getByRole('heading', { name: /welcome/i })).toBeVisible();
    await loginViaUi(phonePage, user);
    await expect(phonePage.getByRole('heading', { name: /welcome/i })).toBeVisible();

    await laptopPage.reload();
    const sessions = laptopPage.getByRole('list', { name: 'Active sessions' });
    await expect(sessions.getByRole('listitem')).toHaveCount(2);

    await sessions.getByRole('button', { name: /^Sign out / }).click();
    await laptopPage
      .getByRole('alertdialog', { name: 'Sign out this device?' })
      .getByRole('button', { name: 'Sign out device' })
      .click();
    await expect(sessions.getByRole('listitem')).toHaveCount(1);

    // The other device is signed out on its next reload.
    await phonePage.reload();
    await expect(phonePage.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    await laptop.close();
    await phone.close();
  });
});

test.describe('password reset', () => {
  test('forgot password shows a generic confirmation', async ({ page }) => {
    await page.goto('/forgot-password');
    await page.getByLabel('Email').fill('someone@example.com');
    await page.getByRole('button', { name: 'Send reset link' }).click();

    await expect(page.getByRole('alert')).toContainText('If an account exists for this email');
  });

  test('reset page rejects an invalid token', async ({ page }) => {
    await page.goto('/reset-password?token=this-token-does-not-exist-123');
    await page.getByLabel('New password', { exact: true }).fill('NewPassword456');
    await page.getByLabel('Confirm new password').fill('NewPassword456');
    await page.getByRole('button', { name: 'Update password' }).click();

    await expect(page.getByRole('alert')).toContainText('invalid or has expired');
  });
});
