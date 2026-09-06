# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: responsive.spec.js >> Responsive Layouts >> Mobile menu toggle works on small screens
- Location: tests/responsive.spec.js:4:7

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
  3  | test.describe('Responsive Layouts', () => {
  4  |   test('Mobile menu toggle works on small screens', async ({ page }) => {
  5  |     await page.setViewportSize({ width: 375, height: 667 });
> 6  |     await page.goto('/');
     |                ^ Error: page.goto: Could not connect to the server.
  7  |     
  8  |     const menuToggle = page.locator('#nav-toggle');
  9  |     await expect(menuToggle).toBeVisible();
  10 |     
  11 |     const menu = page.locator('.nav__menu');
  12 |     await expect(menu).not.toBeVisible();
  13 |     
  14 |     await menuToggle.click();
  15 |     await expect(menu).toBeVisible();
  16 |   });
  17 | });
  18 | 
```