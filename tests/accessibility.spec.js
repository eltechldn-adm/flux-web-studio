import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Testing', () => {
  const pages = [
    '/',
    '/what-we-build.html',
    '/how-it-works.html',
    '/pricing.html',
    '/work.html',
    '/about.html',
    '/project-brief.html'
  ];

  for (const page of pages) {
    test(`Check A11y for ${page}`, async ({ page: browserPage }) => {
      await browserPage.goto(page);
      await browserPage.waitForTimeout(1000);
      const accessibilityScanResults = await new AxeBuilder({ page: browserPage }).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }
});
