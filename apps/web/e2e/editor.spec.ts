import { test, expect } from '@playwright/test';

const uniqueEmail = () => `e2e-editor-${Date.now()}@test.com`;

async function registerAndCreateSong(page: import('@playwright/test').Page) {
  const email = uniqueEmail();
  await page.goto('/auth');
  await page.getByRole('button', { name: 'Sign Up' }).first().click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Name').fill('Editor Tester');
  await page.getByLabel('Password').fill('password123');
  await page.locator('form').getByRole('button', { name: /sign up/i }).click();
  await expect(page.getByText('My Songs')).toBeVisible({ timeout: 10000 });

  await page.getByRole('button', { name: /create new song/i }).first().click();
  await page.getByPlaceholder('My awesome MIDI').fill('Editor Test Song');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByText('Editor Test Song')).toBeVisible({ timeout: 5000 });

  await page.getByText('Editor Test Song').click();
  await expect(page.getByText('Track 1')).toBeVisible({ timeout: 5000 });
}

test.describe('Editor', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndCreateSong(page);
  });

  test('renders piano grid with track headers', async ({ page }) => {
    for (let i = 1; i <= 8; i++) {
      await expect(page.getByText(`Track ${i}`)).toBeVisible();
    }
  });

  test('shows song title in the toolbar', async ({ page }) => {
    const titleInput = page.locator('input[value="Editor Test Song"]');
    await expect(titleInput).toBeVisible();
  });

  test('shows note count', async ({ page }) => {
    await expect(page.getByText('0 notes')).toBeVisible();
  });

  test('navigates back to dashboard', async ({ page }) => {
    await page.getByText('← Dashboard').click();

    await expect(page).toHaveURL('/');
    await expect(page.getByText('My Songs')).toBeVisible({ timeout: 5000 });
  });

  test('displays left sidebar with song info', async ({ page }) => {
    await expect(page.getByText('Current Song')).toBeVisible();
    await expect(page.getByText('Editor Test Song')).toBeVisible();
  });

  test('can edit song title via toolbar', async ({ page }) => {
    const titleInput = page.locator('header input[type="text"]');
    await expect(titleInput).toHaveValue('Editor Test Song');
    await titleInput.fill('Renamed Song');
    await titleInput.blur();

    await expect(titleInput).toHaveValue('Renamed Song');
  });

  test('clicking grid cell creates a note', async ({ page }) => {
    const grid = page.locator('.h-10.cursor-pointer').first();
    await grid.click();

    await expect(page.getByText(/[1-9]\d* notes/)).toBeVisible({ timeout: 5000 });
  });

  test('clicking a note shows the edit panel', async ({ page }) => {
    const grid = page.locator('.h-10.cursor-pointer').first();
    await grid.click();
    await expect(page.getByText(/[1-9]\d* notes/)).toBeVisible({ timeout: 5000 });

    const noteCircle = page.locator('.rounded-full.h-5.w-5').first();
    await noteCircle.click();

    await expect(page.getByText('Edit Note')).toBeVisible({ timeout: 5000 });
  });
});
