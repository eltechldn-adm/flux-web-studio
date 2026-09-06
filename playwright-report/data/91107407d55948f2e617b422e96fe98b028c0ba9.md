# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: navigation.spec.js >> Navigation >> Mobile navigation links work
- Location: tests/navigation.spec.js:27:7

# Error details

```
Error: page.goto: Could not connect to the server.
Call log:
  - navigating to "http://localhost:8788/", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Navigation', () => {
  4  |   test('Main navigation links work', async ({ page, isMobile }) => {
  5  |     test.skip(isMobile, 'Desktop nav test only');
  6  |     await page.goto('/');
  7  | 
  8  |     await page.click('text=What We Build');
  9  |     await expect(page).toHaveURL(/.*what-we-build(\.html)?/);
  10 | 
  11 |     await page.click('text=How It Works');
  12 |     await expect(page).toHaveURL(/.*how-it-works(\.html)?/);
  13 | 
  14 |     await page.click('text=Pricing');
  15 |     await expect(page).toHaveURL(/.*pricing(\.html)?/);
  16 | 
  17 |     await page.click('text=Work');
  18 |     await expect(page).toHaveURL(/.*work(\.html)?/);
  19 | 
  20 |     await page.click('text=About');
  21 |     await expect(page).toHaveURL(/.*about(\.html)?/);
  22 | 
  23 |     await page.click('text=Discuss Your Idea');
  24 |     await expect(page).toHaveURL(/.*project-brief(\.html)?/);
  25 |   });
  26 | 
  27 |   test('Mobile navigation links work', async ({ page, isMobile }) => {
  28 |     test.skip(!isMobile, 'Mobile nav test only');
  29 |     
> 30 |     await page.goto('/');
     |                ^ Error: page.goto: Could not connect to the server.
  31 | 
  32 |     const menuToggle = page.locator('#nav-toggle');
  33 | 
  34 |     // What We Build
  35 |     await menuToggle.click();
  36 |     await page.click('.nav__menu >> text=What We Build');
  37 |     await expect(page).toHaveURL(/.*what-we-build(\.html)?/);
  38 | 
  39 |     // Pricing
  40 |     await menuToggle.click();
  41 |     await page.click('.nav__menu >> text=Pricing');
  42 |     await expect(page).toHaveURL(/.*pricing(\.html)?/);
  43 | 
  44 |     // Discuss Your Idea (not in .nav__menu, it's the CTA button in nav on mobile)
  45 |     await menuToggle.click();
  46 |     await page.click('.nav__cta >> text=Discuss Your Idea');
  47 |     await expect(page).toHaveURL(/.*project-brief(\.html)?/);
  48 |   });
  49 | });
  50 | 
```