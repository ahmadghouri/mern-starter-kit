import { expect, test } from '@playwright/test';
import { loginViaUi, newUser, registerViaUi, signOutViaUi } from './helpers.js';

async function openProfile(page, user) {
  await registerViaUi(page, user);
  await expect(page.getByRole('heading', { name: `Welcome, ${user.name}` })).toBeVisible();
  await page.getByRole('link', { name: 'Profile', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Profile', level: 1 })).toBeVisible();
}

// 1x1 PNG, decoded and re-encoded by the browser before upload.
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

test.describe('profile', () => {
  test('change password signs out other devices and the new password works', async ({
    browser,
  }) => {
    const user = newUser();
    const mainContext = await browser.newContext();
    const page = await mainContext.newPage();
    await openProfile(page, user);

    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await loginViaUi(otherPage, user);
    await expect(otherPage.getByRole('heading', { name: `Welcome, ${user.name}` })).toBeVisible();

    const form = page.getByRole('form', { name: 'Change password' });
    await form.getByLabel('Current password').fill(user.password);
    await form.getByLabel('New password', { exact: true }).fill('BrandNew123');
    await form.getByLabel('Confirm new password').fill('BrandNew123');
    await form.getByRole('button', { name: 'Change password' }).click();
    await expect(form.getByText(/other devices were signed out/i)).toBeVisible();

    await otherPage.reload();
    await expect(otherPage.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    await loginViaUi(otherPage, { ...user, password: 'BrandNew123' });
    await expect(otherPage.getByRole('heading', { name: `Welcome, ${user.name}` })).toBeVisible();

    await mainContext.close();
    await otherContext.close();
  });

  test('upload and remove a profile picture', async ({ page }) => {
    const user = newUser();
    await openProfile(page, user);

    await page.getByLabel('Choose profile picture').setInputFiles({
      name: 'me.png',
      mimeType: 'image/png',
      buffer: PNG_1X1,
    });

    const headerAvatar = page
      .getByRole('link', { name: 'Profile', exact: true })
      .getByRole('img', { name: `${user.name} profile picture` });
    await expect(headerAvatar).toBeVisible();
    // The browser re-encoded the image; the server serves it back.
    await expect
      .poll(() => headerAvatar.evaluate((img) => img.complete && img.naturalWidth))
      .toBe(256);

    await page.getByRole('button', { name: 'Remove photo' }).click();
    await expect(page.getByRole('button', { name: 'Upload photo' })).toBeVisible();
    await expect(headerAvatar).toHaveCount(0);
  });

  test('change email, then sign in with the new email', async ({ page }) => {
    const user = newUser();
    await openProfile(page, user);
    const newEmail = `changed-${user.email}`;

    const form = page.getByRole('form', { name: 'Change email' });
    await form.getByLabel('Email').fill(newEmail);
    await form.getByLabel('Current password').fill(user.password);
    await form.getByRole('button', { name: 'Change email' }).click();
    await expect(form.getByText('Your email has been updated.', { exact: false })).toBeVisible();

    await signOutViaUi(page);
    await loginViaUi(page, { email: newEmail, password: user.password });
    await expect(page.getByRole('heading', { name: `Welcome, ${user.name}` })).toBeVisible();
  });

  test('dark mode choice survives a reload', async ({ page }) => {
    const user = newUser();
    await openProfile(page, user);

    await page.getByText('Dark', { exact: true }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Profile', level: 1 })).toBeVisible();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(page.getByRole('radio', { name: 'Dark' })).toBeChecked();
  });
});
