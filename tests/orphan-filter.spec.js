// Test orphan filter toggle functionality
import { test, expect } from '@playwright/test';

test('orphan filter toggles when clicking the count', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.goto('http://localhost:3001/?testMode=true');
  await page.waitForSelector('[data-testid="workspace"]');

  // Switch to graph view
  await page.click('button:has-text("Graph")');
  await page.waitForSelector('[data-testid="graph-container"]');
  await page.waitForTimeout(1000);

  // Find the orphan filter button
  const orphanButton = page.locator('button.orphan-filter');
  await expect(orphanButton).toBeVisible();

  // Should not have 'active' class initially
  await expect(orphanButton).not.toHaveClass(/active/);

  // Click to toggle on
  await orphanButton.click();
  await expect(orphanButton).toHaveClass(/active/);
  await expect(orphanButton).toContainText('(hidden)');

  // Take screenshot with filter active
  await page.screenshot({ path: 'tests/screenshots/orphan-filter-active.png' });

  // Click to toggle off
  await orphanButton.click();
  await expect(orphanButton).not.toHaveClass(/active/);
  await expect(orphanButton).not.toContainText('(hidden)');
});
