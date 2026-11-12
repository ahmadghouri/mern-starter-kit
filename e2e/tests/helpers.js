import { randomUUID } from 'node:crypto';

export const PASSWORD = 'Password123';

/** Unique user per test so tests can run in parallel against one database. */
export function newUser() {
  const id = randomUUID().slice(0, 8);
  return { name: `E2E User ${id}`, email: `e2e-${id}@example.com`, password: PASSWORD };
}

export async function registerViaUi(page, user) {
  await page.goto('/register');
  await page.getByLabel('Name').fill(user.name);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByLabel('Confirm password').fill(user.password);
  await page.getByRole('button', { name: 'Create account' }).click();
}

/** Clicks "Sign out" in the header and confirms the popup. */
export async function signOutViaUi(page) {
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page
    .getByRole('alertdialog', { name: 'Sign out?' })
    .getByRole('button', { name: 'Sign out', exact: true })
    .click();
}

export async function loginViaUi(page, { email, password }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}
