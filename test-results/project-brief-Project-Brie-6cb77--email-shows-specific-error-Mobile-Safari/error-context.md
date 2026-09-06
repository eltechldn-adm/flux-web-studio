# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: project-brief.spec.js >> Project Brief Form E2E >> Invalid email shows specific error
- Location: tests/project-brief.spec.js:31:7

# Error details

```
Error: page.goto: Could not connect to the server.
Call log:
  - navigating to "http://localhost:8788/project-brief.html", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Project Brief Form E2E', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     await page.route('/api/config', route => {
  6   |       route.fulfill({
  7   |         status: 200,
  8   |         contentType: 'application/json',
  9   |         body: JSON.stringify({ turnstileSitekey: '1x00000000000000000000AA' })
  10  |       });
  11  |     });
> 12  |     await page.goto('/project-brief.html');
      |                ^ Error: page.goto: Could not connect to the server.
  13  |   });
  14  | 
  15  |   test('Page opens and elements are visible', async ({ page }) => {
  16  |     await expect(page.locator('h1')).toContainText('Tell us what you\'re trying to solve.');
  17  |     await expect(page.locator('#project-brief-form')).toBeVisible();
  18  |   });
  19  | 
  20  |   test('Validates required fields', async ({ page }) => {
  21  |     await page.locator('#submit-btn').click();
  22  |     
  23  |     // Check validation messages
  24  |     await expect(page.locator('#error-projectType')).toBeVisible();
  25  |     await expect(page.locator('#error-problem')).toBeVisible();
  26  |     await expect(page.locator('#error-timeframe')).toBeVisible();
  27  |     await expect(page.locator('#error-name')).toBeVisible();
  28  |     await expect(page.locator('#error-email')).toBeVisible();
  29  |   });
  30  | 
  31  |   test('Invalid email shows specific error', async ({ page }) => {
  32  |     await page.fill('#email', 'invalid-email');
  33  |     await page.click('#submit-btn');
  34  |     await expect(page.locator('#error-email')).toBeVisible();
  35  |     await expect(page.locator('#error-email')).toContainText('valid email');
  36  |   });
  37  | 
  38  |   test('Successful submission with all data permutations including unicode and XSS', async ({ page }) => {
  39  |     // Intercept API call to prevent actual submission and verify payload
  40  |     let interceptedRequest = null;
  41  |     await page.route('/api/project-brief', route => {
  42  |       interceptedRequest = route.request();
  43  |       route.fulfill({
  44  |         status: 200,
  45  |         contentType: 'application/json',
  46  |         body: JSON.stringify({ success: true })
  47  |       });
  48  |     });
  49  | 
  50  |     // Test specific permutations as requested
  51  |     await page.click('.radio-card:has-text("I\'m Not Sure")');
  52  |     await page.fill('#problem', 'We need an automation system for <script>alert("XSS")</script>');
  53  |     await page.selectOption('#budget', 'Not sure yet');
  54  |     await page.selectOption('#timeframe', 'Just exploring');
  55  |     
  56  |     // Complex names
  57  |     await page.fill('#name', 'José García O\'Connor Anne-Marie Smith');
  58  |     await page.fill('#email', 'jose.garcia@example.com');
  59  |     
  60  |     // Optional company left blank to verify it's optional
  61  |     
  62  |     // Turnstile mock - manually insert token since the widget won't solve automatically in headless if not setup fully
  63  |     await page.evaluate(() => {
  64  |       document.getElementById('turnstileToken').value = '1x00000000000000000000AA';
  65  |     });
  66  | 
  67  |     await page.click('#submit-btn');
  68  | 
  69  |     // Should show success panel
  70  |     await expect(page.locator('#success-panel')).toBeVisible();
  71  |     await expect(page.locator('#project-brief-form')).not.toBeVisible();
  72  | 
  73  |     // Verify backend payload mapping
  74  |     expect(interceptedRequest).not.toBeNull();
  75  |     const payload = JSON.parse(interceptedRequest.postData());
  76  |     expect(payload.projectType).toBe("I'm Not Sure");
  77  |     expect(payload.problem).toBe('We need an automation system for <script>alert("XSS")</script>');
  78  |     expect(payload.budget).toBe('Not sure yet');
  79  |     expect(payload.timeframe).toBe('Just exploring');
  80  |     expect(payload.name).toBe('José García O\'Connor Anne-Marie Smith');
  81  |     expect(payload.email).toBe('jose.garcia@example.com');
  82  |     expect(payload.company).toBe('');
  83  |     expect(payload.turnstileToken).toBe('1x00000000000000000000AA');
  84  |   });
  85  | 
  86  |   test('Server validation error preserves data', async ({ page }) => {
  87  |     await page.route('/api/project-brief', route => {
  88  |       route.fulfill({
  89  |         status: 400,
  90  |         contentType: 'application/json',
  91  |         body: JSON.stringify({ error: 'Server validation failed for some reason.' })
  92  |       });
  93  |     });
  94  | 
  95  |     await page.click('.radio-card:has-text("AI Application")');
  96  |     await page.fill('#problem', 'Valid problem description');
  97  |     await page.selectOption('#timeframe', '1–2 months');
  98  |     await page.fill('#name', 'Test User');
  99  |     await page.fill('#email', 'test@example.com');
  100 |     
  101 |     await page.evaluate(() => {
  102 |       document.getElementById('turnstileToken').value = '1x00000000000000000000AA';
  103 |     });
  104 | 
  105 |     await page.click('#submit-btn');
  106 | 
  107 |     // Form should still be visible and data preserved
  108 |     await expect(page.locator('#global-error')).toBeVisible();
  109 |     await expect(page.locator('#global-error')).toContainText('Server validation failed');
  110 |     
  111 |     expect(await page.isChecked('input[name="projectType"][value="AI Application"]')).toBeTruthy();
  112 |     expect(await page.inputValue('#problem')).toBe('Valid problem description');
```