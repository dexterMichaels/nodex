// Screenshot test for resizable AI panel and markdown rendering
import { test } from '@playwright/test';

test('capture resizable panel and markdown messages', async ({ page }) => {
  await page.setViewportSize({ width: 1400, height: 800 });
  await page.goto('http://localhost:3001/?testMode=true');
  await page.waitForSelector('[data-testid="workspace"]');

  // Screenshot showing the resize handle (visible as thin line between editor and AI panel)
  await page.screenshot({ path: 'tests/screenshots/resizable-panel.png' });
});
