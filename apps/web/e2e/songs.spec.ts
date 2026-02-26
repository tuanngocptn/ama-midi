import { test, expect } from '@playwright/test';

const uniqueEmail = () => `e2e-songs-${Date.now()}@test.com`;

async function registerAndLogin(page: import('@playwright/test').Page) {
  const email = uniqueEmail();
  await page.goto('/auth');
  await page.getByRole('button', { name: 'Sign Up' }).first().click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Name').fill('Song Tester');
  await page.getByLabel('Password').fill('password123');
  await page.locator('form').getByRole('button', { name: /sign up/i }).click();
  await expect(page.getByText('My Songs')).toBeVisible({ timeout: 10000 });
}

test.describe('Songs', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page);
  });

  test('shows empty state initially', async ({ page }) => {
    await expect(page.getByText('No songs yet')).toBeVisible();
  });

  test('creates a new song', async ({ page }) => {
    await page.getByRole('button', { name: /create new song/i }).first().click();

    await expect(page.getByRole('heading', { name: 'Create New Song' })).toBeVisible();

    await page.getByPlaceholder('My awesome MIDI').fill('E2E Song');
    await page.getByPlaceholder('A short description').fill('Test description');
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page.getByText('E2E Song')).toBeVisible({ timeout: 5000 });
  });

  test('creates a song and opens it in editor', async ({ page }) => {
    await page.getByRole('button', { name: /create new song/i }).first().click();
    await page.getByPlaceholder('My awesome MIDI').fill('Open Me');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText('Open Me')).toBeVisible({ timeout: 5000 });

    await page.getByText('Open Me').click();

    await expect(page).toHaveURL(/\/songs\//);
    await expect(page.getByText('Track 1')).toBeVisible({ timeout: 5000 });
  });

  test('shows song description in the card', async ({ page }) => {
    await page.getByRole('button', { name: /create new song/i }).first().click();
    await page.getByPlaceholder('My awesome MIDI').fill('Described Song');
    await page.getByPlaceholder('A short description').fill('Has a description');
    await page.getByRole('button', { name: 'Create', exact: true }).click();

    await expect(page.getByText('Has a description')).toBeVisible({ timeout: 5000 });
  });

  test('filter tabs are rendered', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'All Songs' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Owned' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Shared with me' })).toBeVisible();
  });

  test('can close create modal by clicking Cancel', async ({ page }) => {
    await page.getByRole('button', { name: /create new song/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Create New Song' })).toBeVisible();

    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('heading', { name: 'Create New Song' })).not.toBeVisible();
  });
});
