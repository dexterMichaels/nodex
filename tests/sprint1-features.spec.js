// Sprint 1 Feature Tests
// Tests for: Graph View, Framework Selector, Markdown Preview

import { test, expect } from '@playwright/test';

test.describe('Sprint 1 Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3001/?testMode=true');
    await page.waitForSelector('[data-testid="workspace"]');
  });

  test.describe('Graph View', () => {
    test('graph toggle button is visible', async ({ page }) => {
      const graphBtn = page.locator('.toggle-btn', { hasText: 'Graph' });
      await expect(graphBtn).toBeVisible();
    });

    test('clicking graph toggle shows graph view', async ({ page }) => {
      // Click on Graph toggle
      await page.click('.toggle-btn:has-text("Graph")');

      // Graph view should be visible
      await expect(page.locator('[data-testid="graph-view"]')).toBeVisible();

      // Graph container should exist
      await expect(page.locator('[data-testid="graph-container"]')).toBeVisible();
    });

    test('graph shows statistics', async ({ page }) => {
      await page.click('.toggle-btn:has-text("Graph")');

      // Wait for graph to build
      await page.waitForSelector('[data-testid="graph-stats"]');

      // Stats should show note count
      const stats = page.locator('[data-testid="graph-stats"]');
      await expect(stats).toContainText('notes');
    });

    test('can toggle back to editor', async ({ page }) => {
      // Go to graph
      await page.click('.toggle-btn:has-text("Graph")');
      await expect(page.locator('[data-testid="graph-view"]')).toBeVisible();

      // Go back to editor
      await page.click('.toggle-btn:has-text("Editor")');
      await expect(page.locator('.cm-editor')).toBeVisible();
    });
  });

  test.describe('Framework Selector', () => {
    test('framework selector is visible', async ({ page }) => {
      const selector = page.locator('[data-testid="framework-selector"]');
      await expect(selector).toBeVisible();
    });

    test('framework selector has options', async ({ page }) => {
      const select = page.locator('[data-testid="framework-selector"] select');
      await expect(select).toBeVisible();

      // Check that options exist
      const options = await select.locator('option').all();
      expect(options.length).toBeGreaterThan(1);
    });

    test('can select different frameworks', async ({ page }) => {
      const select = page.locator('[data-testid="framework-selector"] select');

      // Select Knowledge Curator
      await select.selectOption('knowledge-curator');
      await expect(select).toHaveValue('knowledge-curator');

      // Hint should update
      const hint = page.locator('.framework-hint');
      await expect(hint).toContainText('Organize');
    });

    test('all framework options are present', async ({ page }) => {
      const select = page.locator('[data-testid="framework-selector"] select');

      // Verify all frameworks are available
      const expectedFrameworks = [
        'General Assistant',
        'Knowledge Curator',
        'Knowledge Linker',
        'Knowledge Query',
        'Knowledge Creator'
      ];

      for (const name of expectedFrameworks) {
        const option = select.locator('option', { hasText: name });
        await expect(option).toBeAttached();
      }
    });
  });

  test.describe('Markdown Preview', () => {
    test('edit/preview toggle is visible in editor mode', async ({ page }) => {
      // Should see Edit and Preview buttons
      const editBtn = page.locator('.toggle-btn.small', { hasText: 'Edit' });
      const previewBtn = page.locator('.toggle-btn.small', { hasText: 'Preview' });

      await expect(editBtn).toBeVisible();
      await expect(previewBtn).toBeVisible();
    });

    test('clicking preview shows rendered markdown', async ({ page }) => {
      // Click Preview
      await page.click('.toggle-btn.small:has-text("Preview")');

      // Preview should be visible
      await expect(page.locator('[data-testid="markdown-preview"]')).toBeVisible();

      // Should show rendered content
      const previewContent = page.locator('.preview-content');
      await expect(previewContent).toBeVisible();

      // Should contain the heading from test file
      await expect(previewContent).toContainText('Test Vault');
    });

    test('can toggle back to edit mode', async ({ page }) => {
      // Go to preview
      await page.click('.toggle-btn.small:has-text("Preview")');
      await expect(page.locator('[data-testid="markdown-preview"]')).toBeVisible();

      // Go back to edit
      await page.click('.toggle-btn.small:has-text("Edit")');
      await expect(page.locator('.cm-editor')).toBeVisible();
    });

    test('edit/preview toggle hidden in graph mode', async ({ page }) => {
      // Go to graph mode
      await page.click('.toggle-btn:has-text("Graph")');

      // Edit/Preview buttons should not be visible
      const editBtn = page.locator('.toggle-btn.small', { hasText: 'Edit' });
      await expect(editBtn).not.toBeVisible();
    });
  });

  test.describe('View State Persistence', () => {
    test('switching views maintains state', async ({ page }) => {
      // Start in editor edit mode
      await expect(page.locator('.cm-editor')).toBeVisible();

      // Switch to graph
      await page.click('.toggle-btn:has-text("Graph")');
      await expect(page.locator('[data-testid="graph-view"]')).toBeVisible();

      // Switch back to editor
      await page.click('.toggle-btn:has-text("Editor")');
      await expect(page.locator('.cm-editor')).toBeVisible();

      // Content should still be there
      const content = await page.locator('.cm-content').textContent();
      expect(content).toContain('Test Vault');
    });
  });
});
