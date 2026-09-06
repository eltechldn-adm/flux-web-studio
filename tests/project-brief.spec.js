import { test, expect } from '@playwright/test';

test.describe('Project Brief Form E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('/api/config', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ turnstileSitekey: '1x00000000000000000000AA' })
      });
    });
    await page.goto('/project-brief.html');
  });

  test('Page opens and elements are visible', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Tell us what you\'re trying to solve.');
    await expect(page.locator('#project-brief-form')).toBeVisible();
  });

  test('Validates required fields', async ({ page }) => {
    await page.locator('#submit-btn').click();
    
    // Check validation messages
    await expect(page.locator('#error-projectType')).toBeVisible();
    await expect(page.locator('#error-problem')).toBeVisible();
    await expect(page.locator('#error-timeframe')).toBeVisible();
    await expect(page.locator('#error-name')).toBeVisible();
    await expect(page.locator('#error-email')).toBeVisible();
  });

  test('Invalid email shows specific error', async ({ page }) => {
    await page.fill('#email', 'invalid-email');
    await page.click('#submit-btn');
    await expect(page.locator('#error-email')).toBeVisible();
    await expect(page.locator('#error-email')).toContainText('valid email');
  });

  test('Successful submission with all data permutations including unicode and XSS', async ({ page }) => {
    // Intercept API call to prevent actual submission and verify payload
    let interceptedRequest = null;
    await page.route('/api/project-brief', route => {
      interceptedRequest = route.request();
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // Test specific permutations as requested
    await page.click('.radio-card:has-text("I\'m Not Sure")');
    await page.fill('#problem', 'We need an automation system for <script>alert("XSS")</script>');
    await page.selectOption('#budget', 'Not sure yet');
    await page.selectOption('#timeframe', 'Just exploring');
    
    // Complex names
    await page.fill('#name', 'José García O\'Connor Anne-Marie Smith');
    await page.fill('#email', 'jose.garcia@example.com');
    
    // Optional company left blank to verify it's optional
    
    // Turnstile mock - manually insert token since the widget won't solve automatically in headless if not setup fully
    await page.evaluate(() => {
      document.getElementById('turnstileToken').value = '1x00000000000000000000AA';
    });

    await page.click('#submit-btn');

    // Should show success panel
    await expect(page.locator('#success-panel')).toBeVisible();
    await expect(page.locator('#project-brief-form')).not.toBeVisible();

    // Verify backend payload mapping
    expect(interceptedRequest).not.toBeNull();
    const payload = JSON.parse(interceptedRequest.postData());
    expect(payload.projectType).toBe("I'm Not Sure");
    expect(payload.problem).toBe('We need an automation system for <script>alert("XSS")</script>');
    expect(payload.budget).toBe('Not sure yet');
    expect(payload.timeframe).toBe('Just exploring');
    expect(payload.name).toBe('José García O\'Connor Anne-Marie Smith');
    expect(payload.email).toBe('jose.garcia@example.com');
    expect(payload.company).toBe('');
    expect(payload.turnstileToken).toBe('1x00000000000000000000AA');
  });

  test('Server validation error preserves data', async ({ page }) => {
    await page.route('/api/project-brief', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Server validation failed for some reason.' })
      });
    });

    await page.click('.radio-card:has-text("AI Application")');
    await page.fill('#problem', 'Valid problem description');
    await page.selectOption('#timeframe', '1–2 months');
    await page.fill('#name', 'Test User');
    await page.fill('#email', 'test@example.com');
    
    await page.evaluate(() => {
      document.getElementById('turnstileToken').value = '1x00000000000000000000AA';
    });

    await page.click('#submit-btn');

    // Form should still be visible and data preserved
    await expect(page.locator('#global-error')).toBeVisible();
    await expect(page.locator('#global-error')).toContainText('Server validation failed');
    
    expect(await page.isChecked('input[name="projectType"][value="AI Application"]')).toBeTruthy();
    expect(await page.inputValue('#problem')).toBe('Valid problem description');
    expect(await page.inputValue('#name')).toBe('Test User');
  });

  test('Turnstile failure handles properly', async ({ page }) => {
    // Fill out form correctly but leave Turnstile token empty
    await page.click('.radio-card:has-text("Custom Business App")');
    await page.fill('#problem', 'Valid problem description');
    await page.selectOption('#timeframe', '1–2 months');
    await page.fill('#name', 'Test User');
    await page.fill('#email', 'test@example.com');
    
    // Ensure token is empty
    await page.evaluate(() => {
      document.getElementById('turnstileToken').value = '';
    });

    await page.click('#submit-btn');

    // Should show error and not submit
    await expect(page.locator('#error-turnstileToken')).toBeVisible();
  });

  test('Failed Turnstile (server side) returns error', async ({ page }) => {
    await page.route('/api/project-brief', route => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ fieldErrors: { turnstileToken: 'Security verification failed.' } })
      });
    });

    await page.click('.radio-card:has-text("Custom Business App")');
    await page.fill('#problem', 'Valid problem description');
    await page.selectOption('#timeframe', '1–2 months');
    await page.fill('#name', 'Test User');
    await page.fill('#email', 'test@example.com');
    
    await page.evaluate(() => {
      document.getElementById('turnstileToken').value = '1x00000000000000000000AA';
    });

    await page.click('#submit-btn');
    await expect(page.locator('#error-turnstileToken')).toBeVisible();
    await expect(page.locator('#error-turnstileToken')).toContainText('Security verification failed');
  });

  test('Honeypot submission is silently discarded', async ({ page }) => {
    let apiCalled = false;
    await page.route('/api/project-brief', route => {
      apiCalled = true;
      route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    await page.click('.radio-card:has-text("Custom Business App")');
    await page.fill('#problem', 'Valid problem description');
    await page.selectOption('#timeframe', '1–2 months');
    await page.fill('#name', 'Test User');
    await page.fill('#email', 'test@example.com');
    
    // Fill honeypot
    await page.evaluate(() => {
      document.getElementById('honeypot_website').value = 'spam';
      document.getElementById('turnstileToken').value = '1x00000000000000000000AA';
    });

    await page.click('#submit-btn');

    // Should show success panel without calling API
    await expect(page.locator('#success-panel')).toBeVisible();
    expect(apiCalled).toBe(false);
  });

  test('Double-submit prevention disables button', async ({ page }) => {
    await page.route('/api/project-brief', async route => {
      // Delay response to check button state
      await new Promise(resolve => setTimeout(resolve, 500));
      route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
    });

    await page.click('.radio-card:has-text("Custom Business App")');
    await page.fill('#problem', 'Valid problem description');
    await page.selectOption('#timeframe', '1–2 months');
    await page.fill('#name', 'Test User');
    await page.fill('#email', 'test@example.com');
    
    await page.evaluate(() => {
      document.getElementById('turnstileToken').value = '1x00000000000000000000AA';
    });

    await page.click('#submit-btn');
    
    // Button should be disabled and show 'Submitting...'
    const btn = page.locator('#submit-btn');
    await expect(btn).toBeDisabled();
    await expect(btn).toContainText('Submitting...');
  });

  test('Layout remains stable during Turnstile load', async ({ page }) => {
    // Record initial position of the submit button
    const btn = page.locator('#submit-btn');
    const initialBox = await btn.boundingBox();
    expect(initialBox).not.toBeNull();
    
    // Wait for the Turnstile script to load and initialize (or timeout gracefully in headless)
    await page.waitForTimeout(1500);
    
    // Record final position
    const finalBox = await btn.boundingBox();
    expect(finalBox).not.toBeNull();
    
    // The button should not have moved disruptively (allow <15px for iframe baseline descender quirks across engines, prevent the 65px+ complete shift)
    expect(Math.abs(finalBox.y - initialBox.y)).toBeLessThan(15);
    
    // The button must remain clickable normally
    await btn.click();
    await expect(page.locator('#error-projectType')).toBeVisible();
  });
});
