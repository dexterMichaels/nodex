// Screenshot tests for Sprint 1 features
import { test } from '@playwright/test';

test('capture Sprint 1 features screenshots', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 800 });
  await page.goto('http://localhost:3001/?testMode=true');
  await page.waitForSelector('[data-testid="workspace"]');

  // Screenshot 1: Editor view with framework selector
  await page.screenshot({ path: 'tests/screenshots/sprint1-editor-view.png' });

  // Screenshot 2: Preview mode
  await page.click('.toggle-btn.small:has-text("Preview")');
  await page.waitForSelector('[data-testid="markdown-preview"]');
  await page.screenshot({ path: 'tests/screenshots/sprint1-preview-mode.png' });

  // Screenshot 3: Graph view
  await page.click('.toggle-btn:has-text("Graph")');
  await page.waitForSelector('[data-testid="graph-view"]');
  await page.waitForTimeout(1000); // Wait for graph to render
  await page.screenshot({ path: 'tests/screenshots/sprint1-graph-view.png' });
});
