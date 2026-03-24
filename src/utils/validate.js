/**
 * ============================================================
 * Flux Web Studio — Form Validation & Lead Quality Library
 * ============================================================
 * Deterministic, zero-dependency validation utilities.
 * Used client-side in automation-request.html.
 * Mirror logic is duplicated server-side in the Pages Function.
 * ============================================================
 */

'use strict';

// ── Known junk values ─────────────────────────────────────────
const JUNK_VALUES = new Set([
  'test', 'asd', 'asd', 'qwe', 'qwerty', 'asdf', 'zxcv', 'xxx',
  'lorem', 'ipsum', 'n/a', 'na', 'none', 'idk', 'abc', 'xyz',
  'hello', 'hi', '123', '1234', 'name', 'company', 'email',
  'null', 'undefined', 'placeholder', '....', '----'
]);

/**
 * Checks if a string looks like gibberish using deterministic heuristics.
 * @param {string} str — The string to check.
 * @returns {boolean} true if likely gibberish.
 */
function isGibberish(str) {
  if (!str || typeof str !== 'string') return true;

  const cleaned = str.trim().toLowerCase();

  // Check known junk list
  if (JUNK_VALUES.has(cleaned)) return true;

  // Strip non-alpha characters for analysis
  const alpha = cleaned.replace(/[^a-z]/g, '');
  if (alpha.length === 0) return false; // Let other validators catch this

  // Repeated character pattern (e.g. "aaaa", "ababab")
  if (/(.)\1{3,}/.test(alpha)) return true;

  // Alternating two-char repeat (e.g. "ababab")
  if (/^(.{1,2})\1{3,}$/.test(alpha)) return true;

  // Vowel ratio check — real words have ~35-45% vowels
  const vowels = (alpha.match(/[aeiou]/g) || []).length;
  const vowelRatio = vowels / alpha.length;
  if (alpha.length >= 5 && vowelRatio < 0.15) return true;

  // Long consecutive consonant run (> 4 consonants without a vowel)
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(cleaned)) return true;

  return false;
}

/**
 * Validates Full Name.
 * @param {string} v
 * @returns {{ valid: boolean, message: string }}
 */
function validateFullName(v) {
  const s = (v || '').trim();
  if (!s) return { valid: false, message: 'Full name is required.' };
  if (s.length < 3) return { valid: false, message: 'Name must be at least 3 characters.' };
  if (s.length > 80) return { valid: false, message: 'Name is too long (max 80 characters).' };

  const alpha = s.replace(/[^a-zA-Z]/g, '');
  if (alpha.length < 2) return { valid: false, message: 'Please enter a real name.' };

  if (isGibberish(s)) return { valid: false, message: 'This doesn\'t look like a real name. Please check.' };

  return { valid: true, message: '' };
}

/**
 * Validates Email.
 * @param {string} v
 * @returns {{ valid: boolean, message: string }}
 */
function validateEmail(v) {
  const s = (v || '').trim().toLowerCase();
  if (!s) return { valid: false, message: 'Email address is required.' };

  // Standard RFC-like email regex
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(s)) return { valid: false, message: 'Please enter a valid email address.' };

  return { valid: true, message: '' };
}

/**
 * Validates Company Name.
 * @param {string} v
 * @returns {{ valid: boolean, message: string }}
 */
function validateCompany(v) {
  const s = (v || '').trim();
  if (!s) return { valid: false, message: 'Company name is required.' };
  if (s.length < 2) return { valid: false, message: 'Company name must be at least 2 characters.' };
  if (s.length > 100) return { valid: false, message: 'Company name is too long (max 100 characters).' };

  // Only flag gibberish if the full string is clearly junk (be lenient with short names)
  if (s.length >= 5 && isGibberish(s)) return { valid: false, message: 'Please enter a real company name.' };

  return { valid: true, message: '' };
}

/**
 * Validates Company Website (optional field).
 * @param {string} v
 * @returns {{ valid: boolean, message: string }}
 */
function validateWebsite(v) {
  const s = (v || '').trim();
  if (!s) return { valid: true, message: '' }; // Optional

  try {
    const url = new URL(s.startsWith('http') ? s : `https://${s}`);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, message: 'Please enter a valid website URL.' };
    }
  } catch {
    return { valid: false, message: 'Please enter a valid website URL (e.g. https://yourbusiness.com).' };
  }
  return { valid: true, message: '' };
}

/**
 * Validates Workflow Description.
 * @param {string} v
 * @returns {{ valid: boolean, message: string }}
 */
function validateWorkflowDescription(v) {
  const s = (v || '').trim();
  if (!s) return { valid: false, message: 'Workflow description is required.' };
  if (s.length < 30) return { valid: false, message: `Please describe the workflow in more detail (${s.length}/30 characters minimum).` };
  if (s.length > 2000) return { valid: false, message: 'Description is too long (max 2000 characters).' };

  // Must have at least 3 real words (split on whitespace)
  const words = s.split(/\s+/).filter(w => w.length >= 2);
  if (words.length < 3) return { valid: false, message: 'Please describe your workflow in at least a few sentences.' };

  // Check that bulk of description isn't gibberish
  // Sample the first 40 alpha chars for vowel ratio
  const alphaOnly = s.replace(/[^a-zA-Z]/g, '');
  if (alphaOnly.length >= 20) {
    const vowels = (alphaOnly.match(/[aeiouAEIOU]/g) || []).length;
    const ratio = vowels / alphaOnly.length;
    if (ratio < 0.10) return { valid: false, message: 'Your description doesn\'t look like real text. Please describe the workflow in plain English.' };
  }

  return { valid: true, message: '' };
}

/**
 * Validates Automation Interest select.
 * @param {string} v
 * @returns {{ valid: boolean, message: string }}
 */
function validateAutomationInterest(v) {
  if (!v || v === '') return { valid: false, message: 'Please select an automation area.' };
  return { valid: true, message: '' };
}

/**
 * Validates Business Type select.
 * @param {string} v
 * @returns {{ valid: boolean, message: string }}
 */
function validateBusinessType(v) {
  if (!v || v === '') return { valid: false, message: 'Please select a business type.' };
  return { valid: true, message: '' };
}

/**
 * Scores the lead quality based on submission signals.
 * @param {{ fullName, email, companyName, companyWebsite, automationInterest, workflowDescription, urgency }} data
 * @returns {{ quality: 'High'|'Medium'|'Low', score: number, flagged: boolean }}
 */
function scoreLeadQuality(data) {
  let score = 0;

  const { fullName, companyName, companyWebsite, workflowDescription, urgency } = data;

  // Name looks human (+2)
  if (validateFullName(fullName).valid && !isGibberish(fullName)) score += 2;

  // Company looks legitimate (+2)
  if (validateCompany(companyName).valid && !isGibberish(companyName)) score += 2;

  // Company website provided (+1)
  if (companyWebsite && validateWebsite(companyWebsite).valid) score += 1;

  // Description length & depth
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

// Export for use as ES module (browser) or via globalThis (inline script)
const FWSValidate = {
  validateFullName,
  validateEmail,
  validateCompany,
  validateWebsite,
  validateWorkflowDescription,
  validateAutomationInterest,
  validateBusinessType,
  scoreLeadQuality,
  isGibberish,
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FWSValidate;
} else if (typeof window !== 'undefined') {
  window.FWSValidate = FWSValidate;
}
