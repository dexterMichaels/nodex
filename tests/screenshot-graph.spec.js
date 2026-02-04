// Screenshot test for graph visualization enhancements
import { test } from '@playwright/test';

test('capture graph view with new features', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:3001/?testMode=true');
  await page.waitForSelector('[data-testid="workspace"]');

  // Switch to graph view
  await page.click('button:has-text("Graph")');
  await page.waitForSelector('[data-testid="graph-container"]');

  // Wait for graph to render
  await page.waitForTimeout(1500);

  // Screenshot showing graph with controls (orphan filter, views section)
  await page.screenshot({ path: 'tests/screenshots/graph-enhanced.png' });
});
