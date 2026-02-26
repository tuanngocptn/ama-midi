import { test, expect } from '@playwright/test';

const uniqueEmail = () => `e2e-${Date.now()}@test.com`;

async function openUserMenu(page: import('@playwright/test').Page) {
  await page.locator('nav').getByText(/AL|E2|Lo|Te|Fi/i).first().click();
}

test.describe('Authentication', () => {
  test('redirects unauthenticated user to /auth', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/auth/);
  });

  test('shows sign-in form by default', async ({ page }) => {
    await page.goto('/auth');

    await expect(page.getByText('AMA-MIDI')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.locator('form').getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('can switch to sign-up form', async ({ page }) => {
    await page.goto('/auth');

    await page.getByRole('button', { name: 'Sign Up' }).first().click();
    await expect(page.getByLabel('Name')).toBeVisible();
  });

  test('registers a new account and redirects to dashboard', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/auth');
    await page.getByRole('button', { name: 'Sign Up' }).first().click();

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Name').fill('E2E Tester');
    await page.getByLabel('Password').fill('password123');
    await page.locator('form').getByRole('button', { name: /sign up/i }).click();

    await expect(page.getByText('My Songs')).toBeVisible({ timeout: 10000 });
    await expect(page).toHaveURL('/');
  });

  test('logs in with existing account', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/auth');
    await page.getByRole('button', { name: 'Sign Up' }).first().click();
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Name').fill('E2E User');
    await page.getByLabel('Password').fill('password123');
    await page.locator('form').getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByText('My Songs')).toBeVisible({ timeout: 10000 });

    // Open user menu and logout
    await openUserMenu(page);
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/auth/);

    // Login
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('password123');
    await page.locator('form').getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText('My Songs')).toBeVisible({ timeout: 10000 });
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/auth');

    await page.getByLabel('Email').fill('nonexistent@test.com');
    await page.getByLabel('Password').fill('wrong');
    await page.locator('form').getByRole('button', { name: 'Sign In' }).click();

    await expect(page.getByText(/error|invalid|unauthorized|not found/i)).toBeVisible({ timeout: 5000 });
  });

  test('logout clears session and redirects to /auth', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/auth');
    await page.getByRole('button', { name: 'Sign Up' }).first().click();
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Name').fill('Logout Test');
    await page.getByLabel('Password').fill('password123');
    await page.locator('form').getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByText('My Songs')).toBeVisible({ timeout: 10000 });

    await openUserMenu(page);
    await page.getByRole('button', { name: 'Logout' }).click();

    await expect(page).toHaveURL(/\/auth/);
    await expect(page.getByLabel('Email')).toBeVisible();
  });
});
