import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('Main navigation links work', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop nav test only');
    await page.goto('/');

    await page.click('text=What We Build');
    await expect(page).toHaveURL(/.*what-we-build(\.html)?/);

    await page.click('text=How It Works');
    await expect(page).toHaveURL(/.*how-it-works(\.html)?/);

    await page.click('text=Pricing');
    await expect(page).toHaveURL(/.*pricing(\.html)?/);

    await page.click('text=Work');
    await expect(page).toHaveURL(/.*work(\.html)?/);

    await page.click('text=About');
    await expect(page).toHaveURL(/.*about(\.html)?/);

    await page.click('text=Discuss Your Idea');
    await expect(page).toHaveURL(/.*project-brief(\.html)?/);
  });
});
