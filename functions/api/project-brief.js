/**
 * ============================================================
 * Flux Web Studio — /api/project-brief (Pages Function)
 * ============================================================
 * Accepts form submission, verifies Turnstile, validates inputs,
 * scores lead quality, then forwards to the Email Worker.
 * ============================================================
 */

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
  // Convert to string and basic escape for safety
  return String(str).trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** Score lead quality: returns { quality, score, flagged } */
function scoreLeadQuality(data) {
  const { name, company, problem, budget, timeframe } = data;
  let score = 0;

  // Name looks human (allow Unicode, just check length)
  if (name && name.length >= 2 && !isGibberish(name)) score += 2;

  // Company looks legitimate
  if (company && company.length >= 2 && !isGibberish(company)) score += 2;

  // Problem description quality
  const desc = (problem || '').trim();
  const wordCount = desc.split(/\s+/).filter(w => w.length >= 2).length;
  if (desc.length >= 80 && wordCount >= 6) score += 3;
  else if (desc.length >= 30 && wordCount >= 3) score += 1;

  // Budget signal
  if (budget === '£10,000+') score += 3;
  else if (budget === '£5,000–£10,000') score += 2;
  else if (budget === '£2,000–£5,000') score += 1;

  // Timeframe signal
  if (timeframe === 'ASAP' || timeframe === '1–2 months') score += 1;

  const flagged = score <= 2;
  let quality = 'High';
  if (score <= 2) quality = 'Low';
  else if (score <= 5) quality = 'Medium';

  return { quality, score, flagged };
}

export async function onRequestPost({ request, env }) {
  try {
    let bodyData;
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      bodyData = await request.json();
    } else {
      return jsonError('Invalid content type. Expected application/json.', 400);
    }

    // ── 1. Extract and sanitize payload ────────────────────────────
    const turnstileToken = bodyData.turnstileToken || '';
    const projectType    = sanitize(bodyData.projectType);
    const problem        = sanitize(bodyData.problem);
    const existingTools  = sanitize(bodyData.existingTools);
    const timeframe      = sanitize(bodyData.timeframe);
    const budget         = sanitize(bodyData.budget);
    const name           = sanitize(bodyData.name);
    const email          = sanitize(bodyData.email).toLowerCase();
    const company        = sanitize(bodyData.company);
    const website        = sanitize(bodyData.website);
    
    const honeypot       = bodyData.honeypot_website || '';

    // ── 1.5. Server-side Honeypot Check ────────────────────────────
    if (honeypot) {
      // Bots that fill this out should be silently discarded with a success message
      return new Response(JSON.stringify({ ok: true, message: "Honeypot filled." }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ── 2. Turnstile Verification ──────────────────────────────────
    const turnstileSecret = env.TURNSTILE_SECRET_KEY;
    if (!turnstileToken) {
      return jsonFieldError('turnstileToken', 'Security check not completed. Please try again.');
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
        return jsonFieldError('turnstileToken', 'Security verification failed. Please refresh and try again.');
      }
    }

    // ── 3. Server-side Field Validation ────────────────────────────
    const fieldErrors = {};

    if (!projectType) fieldErrors.projectType = "Please select a project type.";
    
    if (!problem || problem.length < 20 || problem.length > 5000) {
      fieldErrors.problem = "Description must be between 20 and 5000 characters.";
    }

    if (!timeframe) fieldErrors.timeframe = "Please select a timeframe.";
    if (!budget) fieldErrors.budget = "Please select a budget range.";

    if (!name || name.length < 2 || name.length > 100) {
      fieldErrors.name = "Please enter a valid name (2-100 characters).";
    }

    if (!email || !isValidEmail(email)) {
      fieldErrors.email = "Please enter a valid email address.";
    }

    if (company && company.length > 150) {
      fieldErrors.company = "Company name is too long.";
    }

    if (website && website.length > 300) {
      fieldErrors.website = "Website URL is too long.";
    }

    if (Object.keys(fieldErrors).length > 0) {
      return new Response(JSON.stringify({ ok: false, fieldErrors }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Additional gibberish check on name only if it's strictly alphabetical gibberish
    // But don't block valid unicode names. isGibberish mostly targets repeating chars or pure consonants.
    if (name && isGibberish(name)) {
       fieldErrors.name = "The name provided does not appear to be valid. Please check and try again.";
       return new Response(JSON.stringify({ ok: false, fieldErrors }), {
         status: 400,
         headers: { 'Content-Type': 'application/json' }
       });
    }

    // ── 4. Lead Quality Scoring ────────────────────────────────────
    const { quality, score, flagged } = scoreLeadQuality({
      name, company, problem, budget, timeframe
    });

    // ── 5. Forward to Email Worker ─────────────────────────────────
    const payload = {
      fullName: name,
      email,
      companyName: company || '',
      companyWebsite: website || '',
      businessType: projectType,
      automationInterest: projectType,
      workflowDescription: problem + (existingTools ? `\n\nExisting tools: ${existingTools}` : ''),
      urgency: timeframe + ' | ' + budget,
      leadQuality: quality,
      flaggedLowQuality: flagged,
    };

    let workerResponse;
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

    if (workerResponse.ok) {
      const responseBody = await workerResponse.json();
      if (responseBody.success === true) {
        return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' }});
      } else {
        return jsonError(responseBody.error || 'Failed to dispatch email.', 500);
      }
    } else {
      return jsonError('Internal server error. Please try again shortly.', 500);
    }

  } catch (error) {
    console.error('[API] Execution error:', error);
    return jsonError('Internal server error.', 500);
  }
}

/** Returns a generic JSON error response. */
function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

/** Returns a field-specific validation error. */
function jsonFieldError(field, message) {
  return new Response(JSON.stringify({ ok: false, fieldErrors: { [field]: message } }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}
