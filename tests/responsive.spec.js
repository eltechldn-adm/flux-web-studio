import { test, expect } from '@playwright/test';

test.describe('Responsive Layouts', () => {
  test('Mobile menu toggle works on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    const menuToggle = page.locator('#nav-toggle');
    await expect(menuToggle).toBeVisible();
    
    const menu = page.locator('.nav__menu');
    await expect(menu).not.toBeVisible();
    
    await menuToggle.click();
    await expect(menu).toBeVisible();
  });
});
