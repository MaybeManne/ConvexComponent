import { test, expect } from '@playwright/test';

/**
 * Browser Use E2E Tests
 *
 * These tests run against the app with BROWSER_USE_TEST_MODE=1
 * to use deterministic mock responses instead of real API calls.
 *
 * Prerequisites:
 * - Terminal 1: BROWSER_USE_TEST_MODE=1 npx convex dev
 * - Terminal 2: npm run dev
 * - Terminal 3: npm run test:e2e
 */

test.describe('Browser Use Agent', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to load
    await expect(page.locator('h1')).toContainText('Browser Use Agent');
  });

  test('Test 1: page loads and Run button is enabled when prompt filled', async ({ page }) => {
    // Run button should be disabled initially (no prompt)
    const runButton = page.locator('button[type="submit"]');
    await expect(runButton).toBeDisabled();

    // Fill in a prompt
    const textarea = page.locator('textarea');
    await textarea.fill('Go to google.com and search for "test"');

    // Run button should now be enabled
    await expect(runButton).toBeEnabled();
    await expect(runButton).toContainText('Run');
  });

  test('Test 2: clicking Run creates a task in history', async ({ page }) => {
    // Fill in a prompt
    const textarea = page.locator('textarea');
    await textarea.fill('Test task for e2e');

    // Click Run
    const runButton = page.locator('button[type="submit"]');
    await runButton.click();

    // Should show "Starting..." while submitting
    await expect(runButton).toContainText(/Starting|Run/);

    // Wait for task to appear in history (left sidebar)
    const taskHistory = page.locator('aside');
    await expect(taskHistory.locator('button').first()).toBeVisible({ timeout: 10000 });

    // Task should show the prompt text
    await expect(taskHistory).toContainText('Test task for e2e');
  });

  test('Test 3: timeline updates with at least 2 events', async ({ page }) => {
    // Fill in a prompt and submit
    const textarea = page.locator('textarea');
    await textarea.fill('Test timeline events');

    const runButton = page.locator('button[type="submit"]');
    await runButton.click();

    // Wait for timeline to show events
    const timeline = page.locator('text=Timeline').locator('..');
    await expect(timeline).toBeVisible({ timeout: 10000 });

    // Wait for at least 2 events to appear (test mode generates events quickly)
    await page.waitForTimeout(5000);

    // Check for progress events in the timeline section
    const timelineSection = page.locator('h3:has-text("Timeline")').locator('..');
    const events = timelineSection.locator('.animate-slide-in');

    // Should have at least 2 events
    await expect(events).toHaveCount(2, { timeout: 15000 });
  });

  test('Test 4: refresh mid-run and task still exists', async ({ page }) => {
    // Fill in a prompt and submit
    const textarea = page.locator('textarea');
    await textarea.fill('Test persistence on refresh');

    const runButton = page.locator('button[type="submit"]');
    await runButton.click();

    // Wait for task to appear in history
    const taskHistory = page.locator('aside');
    await expect(taskHistory).toContainText('Test persistence', { timeout: 10000 });

    // Wait a bit for task to start running
    await page.waitForTimeout(2000);

    // Refresh the page
    await page.reload();

    // Wait for app to reload
    await expect(page.locator('h1')).toContainText('Browser Use Agent');

    // Task should still be in history
    await expect(taskHistory).toContainText('Test persistence', { timeout: 10000 });
  });

  test('Test 5: cancel works and status becomes canceled', async ({ page }) => {
    // Fill in a prompt and submit
    const textarea = page.locator('textarea');
    await textarea.fill('Test cancel functionality');

    const runButton = page.locator('button[type="submit"]');
    await runButton.click();

    // Wait for task to start and cancel button to appear
    const cancelButton = page.locator('button:has-text("Cancel")');
    await expect(cancelButton).toBeVisible({ timeout: 10000 });

    // Click cancel
    await cancelButton.click();

    // Status should change to "Canceled"
    await expect(page.locator('text=Canceled')).toBeVisible({ timeout: 10000 });

    // Cancel button should disappear
    await expect(cancelButton).not.toBeVisible();
  });

  test('example prompts fill the textarea', async ({ page }) => {
    // Click on an example prompt
    const exampleButton = page.locator('button:has-text("Book Airbnb")');
    await exampleButton.click();

    // Textarea should be filled with the example prompt
    const textarea = page.locator('textarea');
    await expect(textarea).toHaveValue(/airbnb\.com/);

    // Run button should be enabled
    const runButton = page.locator('button[type="submit"]');
    await expect(runButton).toBeEnabled();
  });
});
