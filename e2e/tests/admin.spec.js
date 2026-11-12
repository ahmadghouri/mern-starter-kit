import { expect, test } from '@playwright/test';
import { loginViaUi, newUser, registerViaUi } from './helpers.js';

// Seeded by backend/scripts/start-e2e.js (same defaults as `pnpm seed`).
const ADMIN = { email: 'admin@example.com', password: 'Admin12345' };

test.describe('admin dashboard', () => {
  test('normal users cannot open the admin page', async ({ page }) => {
    const user = newUser();
    await registerViaUi(page, user);
    await expect(page.getByRole('heading', { name: `Welcome, ${user.name}` })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);

    await page.goto('/admin');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: `Welcome, ${user.name}` })).toBeVisible();
  });

  test('admin promotes a user, who is then signed out', async ({ browser }) => {
    const member = newUser();
    const memberContext = await browser.newContext();
    const memberPage = await memberContext.newPage();
    await registerViaUi(memberPage, member);
    await expect(memberPage.getByRole('heading', { name: `Welcome, ${member.name}` })).toBeVisible();

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginViaUi(adminPage, ADMIN);
    await adminPage.getByRole('link', { name: 'Admin' }).click();
    await expect(adminPage.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible();
    await expect(adminPage.getByRole('group', { name: 'Total users' })).toBeVisible();

    await adminPage.getByRole('searchbox', { name: 'Search users' }).fill(member.email);
    await adminPage.getByRole('button', { name: 'Search' }).click();
    await adminPage.getByRole('button', { name: `Make admin: ${member.email}` }).click();
    await expect(
      adminPage.getByRole('button', { name: `Remove admin: ${member.email}` }),
    ).toBeVisible();

    // The role change revoked the member's sessions, so a reload ends on the login page.
    await memberPage.reload();
    await expect(memberPage.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    // After signing in again the new role applies.
    await loginViaUi(memberPage, member);
    await expect(memberPage.getByRole('link', { name: 'Admin' })).toBeVisible();

    await memberContext.close();
    await adminContext.close();
  });
});
