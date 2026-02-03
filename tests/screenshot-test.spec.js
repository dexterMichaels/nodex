// Quick scroll verification test with screenshot
import { test, expect } from '@playwright/test';

test('verify scrolling and take screenshot', async ({ page }) => {
  // Set a smaller viewport to ensure content overflows
  await page.setViewportSize({ width: 1200, height: 400 });

  // Navigate to app in test mode
  await page.goto('http://localhost:3001/?testMode=true');

  // Wait for workspace to load
  await page.waitForSelector('[data-testid="workspace"]', { timeout: 10000 });

  // Verify all three panes are visible
  await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
  await expect(page.locator('[data-testid="editor-pane"]')).toBeVisible();
  await expect(page.locator('[data-testid="ai-pane"]')).toBeVisible();

  // Test file tree scrolling
  const fileTree = page.locator('[data-testid="file-tree-content"]');
  const ftScrollHeight = await fileTree.evaluate(el => el.scrollHeight);
  const ftClientHeight = await fileTree.evaluate(el => el.clientHeight);
  console.log(`File tree - scrollHeight: ${ftScrollHeight}, clientHeight: ${ftClientHeight}`);

  if (ftScrollHeight > ftClientHeight) {
    // Scroll to bottom
    await fileTree.evaluate(el => el.scrollTo(0, el.scrollHeight));
    const scrollTop = await fileTree.evaluate(el => el.scrollTop);
    console.log(`File tree scrolled to: ${scrollTop}`);
    expect(scrollTop).toBeGreaterThan(0);
    console.log('✓ File tree is scrollable');
  } else {
    console.log('File tree content does not overflow (no scroll needed)');
  }

  // Test AI messages panel scrolling
  const messagesPanel = page.locator('[data-testid="ai-messages"]');
  const aiScrollHeight = await messagesPanel.evaluate(el => el.scrollHeight);
  const aiClientHeight = await messagesPanel.evaluate(el => el.clientHeight);
  console.log(`AI messages - scrollHeight: ${aiScrollHeight}, clientHeight: ${aiClientHeight}`);

  if (aiScrollHeight > aiClientHeight) {
    // Verify auto-scrolled to bottom
    const scrollTop = await messagesPanel.evaluate(el => el.scrollTop);
    const maxScroll = aiScrollHeight - aiClientHeight;
    console.log(`AI panel scrollTop: ${scrollTop}, maxScroll: ${maxScroll}`);
    expect(scrollTop).toBeGreaterThanOrEqual(maxScroll - 10);
    console.log('✓ AI messages panel is scrollable and auto-scrolled to bottom');
  } else {
    console.log('AI messages content does not overflow (no scroll needed)');
  }

  // Scroll both back to show content for screenshot
  await fileTree.evaluate(el => el.scrollTo(0, el.scrollHeight / 2));
  await messagesPanel.evaluate(el => el.scrollTo(0, el.scrollHeight / 2));

  // Take screenshot
  await page.screenshot({
    path: 'tests/screenshot-scrollable-ui.png',
    fullPage: false
  });

  console.log('✓ Screenshot saved to tests/screenshot-scrollable-ui.png');
});
