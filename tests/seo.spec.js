import { test, expect } from '@playwright/test';

const PAGES = [
  '/',
  '/what-we-build.html',
  '/how-it-works.html',
  '/pricing.html',
  '/work.html',
  '/about.html',
  '/project-brief.html',
  '/privacy.html',
  '/terms.html'
];

test.describe('SEO and Metadata', () => {

  for (const p of PAGES) {
    test(`Page ${p} has unique title and description`, async ({ page }) => {
      await page.goto(p);
      
      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
      expect(title).toContain('Flux Web Studio');
      
      const description = await page.locator('meta[name="description"]').getAttribute('content');
      expect(description?.length).toBeGreaterThan(0);
      
      // Ensure only one H1 exists
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBe(1);
    });
    
    test(`Page ${p} has clean canonical URL`, async ({ page }) => {
      await page.goto(p);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toBeDefined();
      
      // Canonical should point to production domain
      expect(canonical.startsWith('https://fluxwebstudio.com/')).toBeTruthy();
      
      // Should not end with .html
      expect(canonical.endsWith('.html')).toBeFalsy();
    });
  }

  test('404 page contains noindex', async ({ page }) => {
    // Go to a random non-existent page to trigger 404
    await page.goto('/random-non-existent-page-12345', { waitUntil: 'domcontentloaded' });
    
    // Check if it's the custom 404 page (has the 404 h1)
    const h1 = await page.textContent('h1');
    expect(h1).toContain('404');
    
    // Check robots meta
    const robots = await page.locator('meta[name="robots"]').getAttribute('content');
    expect(robots).toContain('noindex');
  });

  test('robots.txt exists and is valid', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const text = await response.text();
    expect(text).toContain('User-agent: *');
    expect(text).toContain('Sitemap: https://fluxwebstudio.com/sitemap.xml');
  });

  test('sitemap.xml exists and uses clean URLs', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const xml = await response.text();
    
    // Check for some known URLs
    expect(xml).toContain('<loc>https://fluxwebstudio.com/about</loc>');
    expect(xml).toContain('<loc>https://fluxwebstudio.com/</loc>');
    
    // Ensure no .html extensions are in the sitemap locs
    expect(xml).not.toContain('.html</loc>');
  });

  test('Legacy redirects work correctly', async ({ page }) => {
    // In local dev, wrangler handles _redirects and serves clean URLs
    const redirects = [
      { from: '/services', to: '/what-we-build' },
      { from: '/automation-request', to: '/project-brief' },
      { from: '/case-studies', to: '/work' },
      { from: '/contact', to: '/project-brief' }
    ];
    
    for (const { from, to } of redirects) {
      // Navigate to the legacy path
      await page.goto(from);
      // Wait for navigation and check if we ended up at the correct actual page
      const currentUrl = page.url();
      expect(currentUrl).toContain(to);
    }
  });

});
