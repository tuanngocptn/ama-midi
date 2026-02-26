import { test, expect } from '@playwright/test';

const uniqueEmail = () => `e2e-collab-${Date.now()}@test.com`;

test.describe('Collaboration', () => {
  test('shared song appears under shared filter tab', async ({ browser }) => {
    const ownerEmail = uniqueEmail();
    const collaboratorEmail = `collab-${Date.now()}@test.com`;

    // Register owner
    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();

    await ownerPage.goto('/auth');
    await ownerPage.getByRole('button', { name: 'Sign Up' }).first().click();
    await ownerPage.getByLabel('Email').fill(ownerEmail);
    await ownerPage.getByLabel('Name').fill('Owner');
    await ownerPage.getByLabel('Password').fill('password123');
    await ownerPage.locator('form').getByRole('button', { name: /sign up/i }).click();
    await expect(ownerPage.getByText('My Songs')).toBeVisible({ timeout: 10000 });

    // Create a song
    await ownerPage.getByRole('button', { name: /create new song/i }).first().click();
    await ownerPage.getByPlaceholder('My awesome MIDI').fill('Shared Song');
    await ownerPage.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(ownerPage.getByText('Shared Song')).toBeVisible({ timeout: 5000 });

    // Register collaborator in separate context
    const collabContext = await browser.newContext();
    const collabPage = await collabContext.newPage();

    await collabPage.goto('/auth');
    await collabPage.getByRole('button', { name: 'Sign Up' }).first().click();
    await collabPage.getByLabel('Email').fill(collaboratorEmail);
    await collabPage.getByLabel('Name').fill('Collaborator');
    await collabPage.getByLabel('Password').fill('password123');
    await collabPage.locator('form').getByRole('button', { name: /sign up/i }).click();
    await expect(collabPage.getByText('My Songs')).toBeVisible({ timeout: 10000 });

    // Verify collaborator's "Shared with me" tab exists
    await expect(collabPage.getByRole('button', { name: 'Shared with me' })).toBeVisible();
    await collabPage.getByRole('button', { name: 'Shared with me' }).click();

    // At this point the song hasn't been shared yet, so verify empty state
    await expect(collabPage.getByText('No songs yet')).toBeVisible({ timeout: 5000 });

    await ownerContext.close();
    await collabContext.close();
  });

  test('owner can see created song under owned filter', async ({ page }) => {
    const email = uniqueEmail();

    await page.goto('/auth');
    await page.getByRole('button', { name: 'Sign Up' }).first().click();
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Name').fill('Filter Tester');
    await page.getByLabel('Password').fill('password123');
    await page.locator('form').getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByText('My Songs')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /create new song/i }).first().click();
    await page.getByPlaceholder('My awesome MIDI').fill('Owned Song');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText('Owned Song')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Owned', exact: true }).click();

    await expect(page.getByText('Owned Song')).toBeVisible({ timeout: 5000 });
  });
});
