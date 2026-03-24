import { EmailMessage } from "cloudflare:email";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*", // Or restrict to "https://fluxwebstudio.com"
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export default {
  async fetch(request, env, ctx) {
    // 1. Handle CORS Preflight Requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // 2. Only accept POST requests
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
        status: 405,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }

    try {
      // 3. Parse and Validate JSON Payload
      const data = await request.json();
      console.log(`[Worker] Received request for: ${data.fullName}`);
      
      const {
        type, // 'automation' or 'website_enquiry'
        fullName,
        email,
        companyName,
        companyWebsite, // Added
        businessType,
        automationInterest,
        workflowDescription,
        urgency,
        leadQuality, // Added
        flaggedLowQuality, // Added
        // Website enquiry specific
        website,
        budget,
        subject,
        message
      } = data;

      // 4. Diagnostic Logging
      console.log(`[Worker] Detected Type: ${type}`);
      console.log(`[Worker] Fields:`, Object.keys(data).join(', '));

      // Validation based on type
      if (type === 'website_enquiry') {
        // Required for website: fullName, email, subject, message
        if (!fullName || !email || !subject || !message) {
          const missing = [];
          if (!fullName) missing.push('fullName');
          if (!email) missing.push('email');
          if (!subject) missing.push('subject');
          if (!message) missing.push('message');
          
          console.warn(`[Worker] Validation failed (website_enquiry). Missing: ${missing.join(', ')}`);
          return new Response(JSON.stringify({ 
            error: "Missing required fields.", 
            details: `Missing: ${missing.join(', ')} (Enquiry Type: website_enquiry)` 
          }), {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
          });
        }
      } else if (type === 'automation' || !type) {
        // Required for automation: fullName, email, automationInterest, workflowDescription
        if (!fullName || !email || !automationInterest || !workflowDescription) {
          const missing = [];
          if (!fullName) missing.push('fullName');
          if (!email) missing.push('email');
          if (!automationInterest) missing.push('automationInterest');
          if (!workflowDescription) missing.push('workflowDescription');
          
          console.warn(`[Worker] Validation failed (automation). Missing: ${missing.join(', ')}`);
          return new Response(JSON.stringify({ 
            error: "Missing required fields.", 
            details: `Missing: ${missing.join(', ')} (Enquiry Type: ${type || 'default/automation'})`
          }), {
            status: 400,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
          });
        }
      } else {
        // Unknown type
        return new Response(JSON.stringify({ 
          error: "Invalid enquiry type.", 
          details: `Type '${type}' is not recognized.`
        }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const timestamp = new Date().toISOString();
      const senderAddr = "no-reply@fluxwebstudio.com";
      const internalRecipient = "eltechldn@gmail.com"; // Verified destination inbox
      const publicAlias = "hello@fluxwebstudio.com";  // Public facing address

      // 5. Select Template based on type
      const isWebsite = type === 'website_enquiry';
      const emailTitle = isWebsite ? "New Website Enquiry" : "New Automation Request";
      
      // 5. Construct Branded HTML Internal Lead Email (A)
      const internalSubject = flaggedLowQuality
        ? `[Low Quality] New Lead: ${fullName} (${companyName || 'Lead'})`
        : `New Lead: ${fullName} (${companyName || 'Lead'})`;

      // Quality badge styling
      const qualityBadgeStyle = {
        High:   'background:#0c4a6e; color:#38bdf8; border:1px solid rgba(56,189,248,0.4);',
        Medium: 'background:#451a03; color:#fcd34d; border:1px solid rgba(252,211,77,0.4);',
        Low:    'background:#450a0a; color:#fca5a5; border:1px solid rgba(252,165,165,0.4);',
      };
      const qualityLabel = leadQuality || 'Unknown';
      const badgeStyle = qualityBadgeStyle[qualityLabel] || qualityBadgeStyle.Low;

      const lowQualityBanner = flaggedLowQuality
        ? `<div style="margin-bottom:24px; padding:12px 16px; background:rgba(239,68,68,0.08); border:1px solid rgba(252,165,165,0.3); border-radius:6px; color:#fca5a5; font-size:14px;">
             ⚠️ <strong>Potential Low Quality Lead</strong> — Review before responding. This submission scored low on quality signals.
           </div>`
        : '';

      const htmlBody = isWebsite
        ? getWebsiteTemplate(data, timestamp)
        : `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            .email-container { font-family: 'Inter', sans-serif; color: #1f2937; max-width: 600px; margin: 0 auto; line-height: 1.5; }
            .header { padding: 24px; background-color: #030712; color: #ffffff; border-radius: 8px 8px 0 0; }
            .content { padding: 32px; border: 1px solid #e5e7eb; border-top: none; }
            .footer { padding: 24px; text-align: center; font-size: 12px; color: #6b7280; }
            .field-label { font-weight: 600; color: #0ea5e9; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
            .field-value { margin-bottom: 24px; font-size: 16px; }
            .section-title { border-bottom: 1px solid #f3f4f6; padding-bottom: 8px; margin-bottom: 20px; font-weight: 700; }
            .btn { display: inline-block; padding: 12px 24px; background: #0ea5e9; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 10px; }
            .quality-badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 13px; font-weight: 600; margin-left: 10px; vertical-align: middle; }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <h2 style="margin:0; font-size: 20px;">Flux Web Studio</h2>
              <p style="margin:0; font-size: 14px; opacity: 0.8;">New Automation Request Received &nbsp;
                <span class="quality-badge" style="${badgeStyle}">${qualityLabel}</span>
              </p>
            </div>
            <div class="content">
              ${lowQualityBanner}
              <div class="section-title">Lead Information</div>
              <div class="field-label">Full Name</div>
              <div class="field-value">${fullName}</div>
              
              <div class="field-label">Email</div>
              <div class="field-value">${email}</div>
              
              <div class="field-label">Company</div>
              <div class="field-value">${companyName || 'Not provided'}${companyWebsite ? ` &mdash; <a href="${companyWebsite}" style="color:#0ea5e9;">${companyWebsite}</a>` : ''}</div>

              <div class="section-title">Project Details</div>
              <div class="field-label">Automation Interest</div>
              <div class="field-value">${automationInterest}</div>
              
              <div class="field-label">Workflow Description</div>
              <div class="field-value">${workflowDescription.replace(/\n/g, '<br>')}</div>
              
              <div class="field-label">Urgency</div>
              <div class="field-value">${urgency || 'Standard'}</div>

              <a href="mailto:${email}" class="btn">Reply to Lead</a>
            </div>
            <div class="footer">
              Flux Web Studio &bull; <a href="https://fluxwebstudio.com" style="color: #6b7280;">fluxwebstudio.com</a><br>
              Generating this alert automatically via Cloudflare Workers.
            </div>
          </div>
        </body>
        </html>
      `.trim();

      const internalDisplayName = "Flux Web Studio Leads";
      const fromFormatted = `"${internalDisplayName}" <${senderAddr}>`;

      // 6. Dispatch Results Tracking & PROBER LOOP
      let internalLeadSent = false;
      let customerReceiptSent = false;
      let dispatchError = null;

      const candidates = [
        "hello@fluxwebstudio.com", 
        "eltechldn@gmail.com", 
        "elainamarriott@gmail.com"
      ];

      for (const recipient of candidates) {
        try {
          console.log(`[Worker] PROBE: Attempting send to ${recipient}...`);
          // Use HTML mime creator
          const probeMime = createHtmlMime(fromFormatted, recipient, internalSubject, htmlBody, `Reply-To: ${email}`);
          const probeMsg = new EmailMessage(senderAddr, recipient, probeMime);
          
          await env.FWS_EMAIL.send(probeMsg);
          
          internalLeadSent = true;
          console.log(`[Worker] PROBE SUCCESS: Recipient ${recipient} accepted the message.`);
          break; // Stop at first success
        } catch (sendError) {
          console.error(`[Worker] PROBE FAILED for ${recipient}:`, sendError.message);
          dispatchError = sendError.message;
        }
      }

      // 7. Dispatch Customer Receipt (Disabled but logged as skipped)
      console.log(`[Worker] Customer receipt is currently DISABLED.`);

      // 8. Truthful Success Result
      const isActuallySuccessful = internalLeadSent === true;

      if (isActuallySuccessful) {
        console.log(`[Worker] Task complete. Internal lead confirmed. Returning success.`);
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Lead notification dispatched.",
          internalLeadSent: true,
          customerReceiptSent: false
        }), {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      } else {
        console.error(`[Worker] Dispatch failed.`);
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Failed to dispatch lead notification.",
          details: dispatchError,
          internalLeadSent: false
        }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

    } catch (err) {
      console.error("Worker Execution Error:", err);
      return new Response(JSON.stringify({ error: "Internal Server Error", details: err.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });
    }
  }
};

/**
 * Template Path: Website Enquiry
 * Matches fields from fluxwebstudio.co.uk contact form
 */
function getWebsiteTemplate(data, timestamp) {
  const { fullName, email, companyName, website, budget, subject, message } = data;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .em-c { font-family: 'Inter', sans-serif; color: #1f2937; max-width: 600px; margin: 0 auto; line-height: 1.5; }
        .head { padding: 32px; background-color: #030712; color: #ffffff; border-radius: 8px 8px 0 0; }
        .body { padding: 40px; border: 1px solid #e5e7eb; border-top: none; }
        .foot { padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; }
        .lbl { font-weight: 700; color: #0ea5e9; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .val { margin-bottom: 24px; font-size: 16px; color: #374151; }
        .sec { border-bottom: 1px solid #f3f4f6; padding-bottom: 8px; margin-bottom: 20px; font-weight: 700; color: #111827; }
        .btn { display: inline-block; padding: 14px 28px; background: #0ea5e9; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; }
      </style>
    </head>
    <body class="em-c">
      <div class="head">
        <h2 style="margin:0; font-size: 22px;">Flux Web Studio</h2>
        <p style="margin:8px 0 0; font-size: 14px; opacity: 0.8;">New Website Enquiry Received</p>
      </div>
      <div class="body">
        <div class="sec">Lead Information</div>
        <div class="lbl">Full Name</div>
        <div class="val">${fullName}</div>
        
        <div class="lbl">Email Address</div>
        <div class="val">${email}</div>
        
        <div class="lbl">Company Name</div>
        <div class="val">${companyName || 'N/A'}</div>

        <div class="lbl">Website URL</div>
        <div class="val">${website || 'N/A'}</div>
        
        <div class="lbl">Project Budget</div>
        <div class="val">${budget || 'N/A'}</div>

        <div class="sec">Project Enquiry</div>
        <div class="lbl">Subject</div>
        <div class="val">${subject || 'General Enquiry'}</div>
        
        <div class="lbl">Message</div>
        <div class="val" style="white-space: pre-wrap;">${message}</div>

        <div style="margin-top: 40px; text-align: center;">
          <a href="mailto:${email}" class="btn">Reply to Enquirer</a>
        </div>
      </div>
      <div class="foot">
        Submitted from &bull; fluxwebstudio.co.uk<br>
        ${timestamp}<br><br>
        &copy; 2024 Flux Web Studio
      </div>
    </body>
    </html>
  `.trim();
}

/**
 * Template Path: Automation Enquiry
 * Matches fields from fluxautomate.com
 */
function getAutomationTemplate(data, emailTitle, timestamp) {
  const { fullName, email, companyName, automationInterest, workflowDescription, urgency } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .email-container { font-family: 'Inter', sans-serif; color: #1f2937; max-width: 600px; margin: 0 auto; line-height: 1.5; }
        .header { padding: 24px; background-color: #030712; color: #ffffff; border-radius: 8px 8px 0 0; }
        .content { padding: 32px; border: 1px solid #e5e7eb; border-top: none; }
        .footer { padding: 24px; text-align: center; font-size: 12px; color: #6b7280; }
        .field-label { font-weight: 600; color: #0ea5e9; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .field-value { margin-bottom: 24px; font-size: 16px; }
        .section-title { border-bottom: 1px solid #f3f4f6; padding-bottom: 8px; margin-bottom: 20px; font-weight: 700; }
        .btn { display: inline-block; padding: 12px 24px; background: #0ea5e9; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h2 style="margin:0; font-size: 20px;">Flux Web Studio</h2>
          <p style="margin:0; font-size: 14px; opacity: 0.8;">${emailTitle}</p>
        </div>
        <div class="content">
          <div class="section-title">Lead Information</div>
          <div class="field-label">Full Name</div>
          <div class="field-value">${fullName}</div>
          
          <div class="field-label">Email</div>
          <div class="field-value">${email}</div>
          
          <div class="field-label">Company</div>
          <div class="field-value">${companyName || 'N/A'}</div>

          <div class="section-title">Project Details</div>
          <div class="field-label">Automation Interest</div>
          <div class="field-value">${automationInterest}</div>
          
          <div class="field-label">Workflow Description</div>
          <div class="field-value" style="white-space: pre-wrap;">${workflowDescription}</div>
          
          <div class="field-label">Urgency</div>
          <div class="field-value">${urgency || 'Standard'}</div>

          <a href="mailto:${email}" class="btn">Reply to Lead</a>
        </div>
        <div class="footer">
          Flux Web Studio &bull; Generated Automatically via Cloudflare Workers.<br>
          ${timestamp}
        </div>
      </div>
    </body>
    </html>
  `.trim();
}

/**
 * Helper: Creates a standard RFC 822 MIME HTML email string
 */
function createHtmlMime(from, to, subject, htmlBody, extraHeader = "") {
  const messageId = `<${crypto.randomUUID()}@fluxwebstudio.com>`;
  const dateHeader = new Date().toUTCString();

  let msg = `Message-ID: ${messageId}\r\n`;
  msg += `Date: ${dateHeader}\r\n`;
  msg += `From: ${from}\r\n`;
  msg += `To: ${to}\r\n`;
  msg += `Subject: ${subject}\r\n`;
  if (extraHeader) {
    msg += `${extraHeader}\r\n`;
  }
  msg += `MIME-Version: 1.0\r\n`;
  msg += `Content-Type: text/html; charset="utf-8"\r\n`;
  msg += `\r\n`;
  msg += `${htmlBody}\r\n`;
  return msg;
}
