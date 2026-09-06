import { test, expect } from '@playwright/test';

test.describe('Legal Pages', () => {

  test('Privacy page loads and has correct structure', async ({ page }) => {
    await page.goto('/privacy');
    
    // Check it loads
    await expect(page).toHaveTitle(/Privacy Policy/);
    
    // Check single H1
    const h1s = await page.locator('h1').count();
    expect(h1s).toBe(1);
    await expect(page.locator('h1')).toHaveText('Privacy Policy');
  });

  test('Terms page loads and has correct structure', async ({ page }) => {
    await page.goto('/terms');
    
    // Check it loads
    await expect(page).toHaveTitle(/Terms of Service/);
    
    // Check single H1
    const h1s = await page.locator('h1').count();
    expect(h1s).toBe(1);
    await expect(page.locator('h1')).toHaveText('Terms of Service');
  });

  test('Footer contains working legal links', async ({ page }) => {
    await page.goto('/');
    
    const privacyLink = page.locator('footer a[href*="privacy"]');
    const termsLink = page.locator('footer a[href*="terms"]');
    
    await expect(privacyLink).toBeVisible();
    await expect(termsLink).toBeVisible();
    
    // Click privacy
    await privacyLink.click();
    await expect(page).toHaveURL(/.*\/privacy/);
    
    // Go back and click terms
    await page.goto('/');
    await page.locator('footer a[href*="terms"]').click();
    await expect(page).toHaveURL(/.*\/terms/);
  });

  test('Privacy Policy contains required practical disclosures', async ({ page }) => {
    await page.goto('/privacy');
    
    const content = await page.locator('main').innerText();
    
    // ICO Information
    expect(content).toContain('Information Commissioner’s Office (ICO)');
    expect(content).toContain('ico.org.uk');
    
    // Cloudflare/Turnstile disclosure
    expect(content).toContain('Cloudflare Turnstile');
    expect(content).toContain('provide bot and abuse protection');
    
    // No false analytics claims
    expect(content).toContain('We do not currently use analytics or advertising cookies.');
    expect(content).not.toContain('Google Analytics');
  });

  test('Terms of Service contains required contractual bounds', async ({ page }) => {
    await page.goto('/terms');
    
    const content = await page.locator('main').innerText();
    
    // Precedence of SOW
    expect(content).toContain('Statement of Work (SOW)');
    expect(content).toContain('signed SOW will always take precedence');
    
    // Liability qualification
    expect(content).toContain('Nothing in these terms excludes or limits our liability where it would be unlawful to do so');
    
    // Governing law
    expect(content).toContain('laws of England and Wales');
  });

});
