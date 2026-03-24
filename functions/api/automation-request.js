/**
 * ============================================================
 * Flux Web Studio — /api/automation-request (Pages Function)
 * ============================================================
 * Accepts form submission, verifies Turnstile, validates inputs,
 * scores lead quality, then forwards to the Email Worker.
 * ============================================================
 */

// ── Inline validation mirrors (server-side, no external deps) ─────
const JUNK_VALUES = new Set([
  'test','asd','qwe','qwerty','asdf','zxcv','xxx','lorem','ipsum',
  'n/a','na','none','idk','abc','xyz','hello','hi','123','1234',
  'name','company','email','null','undefined','placeholder'
]);

function isGibberish(str) {
  if (!str || typeof str !== 'string') return true;
  const cleaned = str.trim().toLowerCase();
  if (JUNK_VALUES.has(cleaned)) return true;
  const alpha = cleaned.replace(/[^a-z]/g, '');
  if (alpha.length === 0) return false;
  if (/(.)\1{3,}/.test(alpha)) return true;
  if (/^(.{1,2})\1{3,}$/.test(alpha)) return true;
  const vowels = (alpha.match(/[aeiou]/g) || []).length;
  if (alpha.length >= 5 && vowels / alpha.length < 0.15) return true;
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(cleaned)) return true;
  return false;
}

function isValidEmail(v) {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test((v || '').trim().toLowerCase());
}

function sanitize(str) {
  if (!str) return '';
  return String(str).trim().replace(/[<>]/g, ''); // Strip basic XSS chars
}

/** Score lead quality: returns { quality, score, flagged } */
function scoreLeadQuality(data) {
  const { fullName, companyName, companyWebsite, workflowDescription, urgency } = data;
  let score = 0;

  // Name looks human
  const nameAlpha = (fullName || '').replace(/[^a-zA-Z]/g, '');
  if (nameAlpha.length >= 3 && !isGibberish(fullName)) score += 2;

  // Company looks legitimate
  if (companyName && companyName.length >= 2 && !isGibberish(companyName)) score += 2;

  // Company website provided
  if (companyWebsite && companyWebsite.length >= 5) score += 1;

  // Description quality
  const desc = (workflowDescription || '').trim();
  const wordCount = desc.split(/\s+/).filter(w => w.length >= 2).length;
  if (desc.length >= 80 && wordCount >= 6) score += 3;
  else if (desc.length >= 30 && wordCount >= 3) score += 1;

  // Urgency signal
  if (urgency === 'asap') score += 2;
  else if (urgency === '30days') score += 1;

  const flagged = score <= 2;
  let quality = 'High';
  if (score <= 2) quality = 'Low';
  else if (score <= 5) quality = 'Medium';

  return { quality, score, flagged };
}

export async function onRequestPost({ request, env }) {
  try {
    const formData = await request.formData();

    // ── 1. Extract all fields ──────────────────────────────────────
    const turnstileToken     = formData.get('cf-turnstile-response');
    const fullName           = sanitize(formData.get('fullName'));
    const email              = sanitize(formData.get('email')).toLowerCase();
    const companyName        = sanitize(formData.get('companyName'));
    const companyWebsite     = sanitize(formData.get('companyWebsite') || '');
    const businessType       = sanitize(formData.get('businessType') || '');
    const automationInterest = sanitize(formData.get('automationInterest'));
    const workflowDescription = sanitize(formData.get('workflowDescription'));
    const urgency            = sanitize(formData.get('urgency') || 'exploring');

    // ── 2. Turnstile Verification ──────────────────────────────────
    const turnstileSecret = env.TURNSTILE_SECRET_KEY;

    if (!turnstileToken) {
      console.warn('[API] Submission rejected: missing Turnstile token.');
      return jsonError('Security check not completed. Please try again.', 400);
    }

    if (turnstileSecret) {
      const tsResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: turnstileToken,
          remoteip: request.headers.get('CF-Connecting-IP') || ''
        })
      });
      const tsResult = await tsResponse.json();
      if (!tsResult.success) {
        console.warn('[API] Turnstile verification failed:', tsResult['error-codes']);
        return jsonError('Security verification failed. Please refresh and try again.', 400);
      }
      console.log('[API] Turnstile verified.');
    } else {
      // Secret key not configured — warn but allow through in development
      console.warn('[API] TURNSTILE_SECRET_KEY not set. Skipping server-side Turnstile check.');
    }

    // ── 3. Server-side Validation ──────────────────────────────────
    if (!fullName || !email || !companyName || !automationInterest || !workflowDescription) {
      return jsonError('Missing required fields. Please complete all required information.', 400);
    }

    if (fullName.length < 3 || fullName.length > 80) {
      return jsonError('Full name must be between 3 and 80 characters.', 400, 'fullName');
    }

    if (!isValidEmail(email)) {
      return jsonError('Please enter a valid email address.', 400, 'email');
    }

    if (companyName.length < 2 || companyName.length > 100) {
      return jsonError('Company name must be between 2 and 100 characters.', 400, 'companyName');
    }

    if (workflowDescription.length < 30 || workflowDescription.length > 2000) {
      return jsonError(
        `Workflow description must be between 30 and 2000 characters (currently ${workflowDescription.length}).`,
        400, 'workflowDescription'
      );
    }

    // Basic gibberish check on key fields
    if (isGibberish(fullName)) {
      return jsonError('The name provided does not appear to be valid. Please check and try again.', 400, 'fullName');
    }

    // ── 4. Lead Quality Scoring ────────────────────────────────────
    const { quality, score, flagged } = scoreLeadQuality({
      fullName, companyName, companyWebsite, workflowDescription, urgency
    });

    console.log(`[API] Lead quality: ${quality} (score: ${score}, flagged: ${flagged})`);

    // ── 5. Forward to Email Worker ─────────────────────────────────
    const workerUrl = 'https://fws-email-worker.eltechldn.workers.dev';

    const payload = {
      fullName,
      email,
      companyName,
      companyWebsite,
      businessType,
      automationInterest,
      workflowDescription,
      urgency,
      leadQuality: quality,
      flaggedLowQuality: flagged,
    };

    console.log(`[API] Forwarding to worker. Lead: ${fullName}, Quality: ${quality}`);

    const workerResponse = await fetch(workerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log(`[API] Worker response status: ${workerResponse.status}`);

    if (workerResponse.ok) {
      const responseBody = await workerResponse.json();
      if (responseBody.success === true) {
        console.log('[API] Worker confirmed success. Redirecting.');
        return Response.redirect(new URL('/automation-request?success=1', request.url), 303);
      } else {
        console.error('[API] Worker returned success=false:', responseBody.error);
        return jsonError(responseBody.error || 'Failed to dispatch email.', 500);
      }
    } else {
      const errorText = await workerResponse.text();
      console.error(`[API] Worker failed (${workerResponse.status}):`, errorText);
      return jsonError('Internal server error. Please try again shortly.', 500);
    }

  } catch (error) {
    console.error('[API] Execution error:', error);
    return jsonError('Internal server error.', 500);
  }
}

/** Returns a structured JSON error response. */
function jsonError(message, status = 400, field = null) {
  const body = { success: false, error: message };
  if (field) body.field = field;
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
