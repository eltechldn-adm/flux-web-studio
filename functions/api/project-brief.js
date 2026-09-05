/**
 * ============================================================
 * Flux Web Studio — /api/project-brief (Pages Function)
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
  const { name, company, description, budget } = data;
  let score = 0;

  // Name looks human
  const nameAlpha = (name || '').replace(/[^a-zA-Z]/g, '');
  if (nameAlpha.length >= 3 && !isGibberish(name)) score += 2;

  // Company looks legitimate
  if (company && company.length >= 2 && !isGibberish(company)) score += 2;

  // Description quality
  const desc = (description || '').trim();
  const wordCount = desc.split(/\s+/).filter(w => w.length >= 2).length;
  if (desc.length >= 80 && wordCount >= 6) score += 3;
  else if (desc.length >= 30 && wordCount >= 3) score += 1;

  // Budget signal
  if (budget === '10k+') score += 3;
  else if (budget === '5k-10k') score += 2;
  else if (budget === '3k-5k') score += 1;

  const flagged = score <= 2;
  let quality = 'High';
  if (score <= 2) quality = 'Low';
  else if (score <= 5) quality = 'Medium';

  return { quality, score, flagged };
}

export async function onRequestPost({ request, env }) {
  try {
    let bodyData;
    
    // Support both JSON and FormData depending on how it was sent
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      bodyData = await request.json();
    } else {
      return jsonError('Invalid content type. Expected application/json.', 400);
    }

    // ── 1. Extract all fields ──────────────────────────────────────
    const turnstileToken = bodyData['cf-turnstile-response'];
    const name           = sanitize(bodyData.name);
    const email          = sanitize(bodyData.email).toLowerCase();
    const company        = sanitize(bodyData.company || '');
    const projectType    = sanitize(bodyData.project_type);
    const budget         = sanitize(bodyData.budget);
    const description    = sanitize(bodyData.description);
    const websiteUrl     = bodyData.website_url; // Honeypot

    // ── 1b. Honeypot check ─────────────────────────────────────────
    if (websiteUrl && websiteUrl !== '') {
      console.warn('[API] Honeypot triggered. Silently accepting.');
      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    }

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
      console.warn('[API] TURNSTILE_SECRET_KEY not set. Skipping server-side Turnstile check.');
    }

    // ── 3. Server-side Validation ──────────────────────────────────
    if (!name || !email || !projectType || !budget || !description) {
      return jsonError('Missing required fields. Please complete all required information.', 400);
    }

    if (name.length < 2 || name.length > 80) {
      return jsonError('Name must be between 2 and 80 characters.', 400, 'name');
    }

    if (!isValidEmail(email)) {
      return jsonError('Please enter a valid email address.', 400, 'email');
    }

    if (company && (company.length > 100)) {
      return jsonError('Company name must be under 100 characters.', 400, 'company');
    }

    if (description.length < 20 || description.length > 3000) {
      return jsonError(
        `Description must be between 20 and 3000 characters (currently ${description.length}).`,
        400, 'description'
      );
    }

    // Basic gibberish check on key fields
    if (isGibberish(name)) {
      return jsonError('The name provided does not appear to be valid. Please check and try again.', 400, 'name');
    }

    // ── 4. Lead Quality Scoring ────────────────────────────────────
    const { quality, score, flagged } = scoreLeadQuality({
      name, company, description, budget
    });

    console.log(`[API] Lead quality: ${quality} (score: ${score}, flagged: ${flagged})`);

    // ── 5. Forward to Email Worker ─────────────────────────────────
    // Using Service Binding instead of fetch URL if available, but falling back to fetch just in case.
    // The previous implementation used fetch, we'll keep it but ideally would use `env.EMAIL_WORKER.fetch()` if bound.
    let workerResponse;
    
    const payload = {
      fullName: name,
      email,
      companyName: company,
      companyWebsite: '',
      businessType: projectType,
      automationInterest: projectType,
      workflowDescription: description,
      urgency: budget,
      leadQuality: quality,
      flaggedLowQuality: flagged,
    };

    console.log(`[API] Forwarding to worker. Lead: ${name}, Quality: ${quality}`);

    if (env.EMAIL_WORKER) {
      workerResponse = await env.EMAIL_WORKER.fetch(new Request('https://fws-email-worker.eltechldn.workers.dev', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }));
    } else {
      const workerUrl = 'https://fws-email-worker.eltechldn.workers.dev';
      workerResponse = await fetch(workerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    }

    console.log(`[API] Worker response status: ${workerResponse.status}`);

    if (workerResponse.ok) {
      const responseBody = await workerResponse.json();
      if (responseBody.success === true) {
        console.log('[API] Worker confirmed success.');
        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' }});
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
