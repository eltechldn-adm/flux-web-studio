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

  test('Mobile navigation links work', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile nav test only');
    
    await page.goto('/');

    const menuToggle = page.locator('#nav-toggle');

    // What We Build
    await menuToggle.click();
    await page.click('.nav__menu >> text=What We Build');
    await expect(page).toHaveURL(/.*what-we-build(\.html)?/);

    // Pricing
    await menuToggle.click();
    await page.click('.nav__menu >> text=Pricing');
    await expect(page).toHaveURL(/.*pricing(\.html)?/);

    // Discuss Your Idea (not in .nav__menu, it's the CTA button in nav on mobile)
    await menuToggle.click();
    await page.click('.nav__cta >> text=Discuss Your Idea');
    await expect(page).toHaveURL(/.*project-brief(\.html)?/);
  });
});
