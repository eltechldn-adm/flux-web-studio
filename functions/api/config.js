/**
 * ============================================================
 * Flux Web Studio — /api/config (Pages Function)
 * ============================================================
 * Returns public configuration securely at runtime.
 * Allows safely passing the Turnstile Sitekey to the frontend.
 * ============================================================
 */

export async function onRequestGet({ env }) {
  // If no production sitekey is configured, fall back to the public testing sitekey.
  const turnstileSitekey = env.TURNSTILE_SITEKEY || "1x00000000000000000000AA";
  
  return new Response(JSON.stringify({ turnstileSitekey }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
