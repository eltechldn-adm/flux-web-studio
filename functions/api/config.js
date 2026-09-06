/**
 * ============================================================
 * Flux Web Studio — /api/config (Pages Function)
 * ============================================================
 * Returns public configuration securely at runtime.
 * Allows safely passing the Turnstile Sitekey to the frontend.
 * ============================================================
 */

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const isPreview = url.hostname.endsWith('.pages.dev') || url.hostname.includes('localhost') || url.hostname.includes('127.0.0.1');

  if (!env.TURNSTILE_SITEKEY) {
    if (isPreview) {
      return new Response(JSON.stringify({ turnstileSitekey: "1x00000000000000000000AA" }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      console.error("[API] Configuration Error.");
      return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ turnstileSitekey: env.TURNSTILE_SITEKEY }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
