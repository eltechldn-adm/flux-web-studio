import { EmailMessage } from "cloudflare:email";

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default {
  async fetch(request, env, ctx) {
    // 1. Only accept POST requests
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed. Use POST." }), {
        status: 405,
        headers: { "Content-Type": "application/json" }
      });
    }

    try {
      // 3. Parse and Validate JSON Payload
      const data = await request.json();
      console.log(`[Worker] Received incoming request.`);
      
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

      // Ensure strict email validation to prevent header injection in Reply-To
      const safeEmail = (email || '').trim().toLowerCase();
      if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(safeEmail) || /[\r\n]/.test(safeEmail)) {
        return new Response(JSON.stringify({ error: "Invalid email structure." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (subject && /[\r\n]/.test(subject)) {
        return new Response(JSON.stringify({ error: "Invalid characters in subject." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      const checkStrLen = (val, max) => !val || (typeof val === 'string' && val.length <= max);
      if (!checkStrLen(fullName, 100) || !checkStrLen(safeEmail, 150) || 
          !checkStrLen(companyName, 150) || !checkStrLen(companyWebsite, 300) || 
          !checkStrLen(automationInterest, 100) || !checkStrLen(workflowDescription, 5000) || 
          !checkStrLen(urgency, 100) || !checkStrLen(subject, 200) || !checkStrLen(message, 5000)) {
        return new Response(JSON.stringify({ error: "A field exceeds its maximum allowed length." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (leadQuality !== undefined && leadQuality !== null && !['High', 'Medium', 'Low'].includes(leadQuality)) {
        return new Response(JSON.stringify({ error: "Invalid leadQuality value." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      if (flaggedLowQuality !== undefined && typeof flaggedLowQuality !== 'boolean') {
        return new Response(JSON.stringify({ error: "Invalid flaggedLowQuality value. Must be boolean." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Validation based on type
      if (type === 'website_enquiry') {
        if (!fullName || !safeEmail || !subject || !message) {
          return new Response(JSON.stringify({ error: "Missing required fields." }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
      } else if (type === 'automation' || !type) {
        if (!fullName || !safeEmail || !automationInterest || !workflowDescription) {
          return new Response(JSON.stringify({ error: "Missing required fields." }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
          });
        }
      } else {
        return new Response(JSON.stringify({ error: "Invalid enquiry type." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      
      // Escape all data before templating
      const eFullName = escapeHtml(fullName).substring(0, 100);
      const eEmail = escapeHtml(safeEmail);
      const eCompanyName = escapeHtml(companyName).substring(0, 150);
      const eCompanyWebsite = escapeHtml(companyWebsite).substring(0, 300);
      const eAutomationInterest = escapeHtml(automationInterest).substring(0, 100);
      const eWorkflowDescription = escapeHtml(workflowDescription).substring(0, 5000);
      const eUrgency = escapeHtml(urgency).substring(0, 100);
      const eSubject = escapeHtml(subject).substring(0, 200);
      const eMessage = escapeHtml(message).substring(0, 5000);

      const timestamp = new Date().toISOString();
      const senderAddr = "no-reply@fluxwebstudio.com";
      const internalRecipient = env.DESTINATION_EMAIL; // Configured in Wrangler/Dashboard
      
      if (!internalRecipient) {
        console.error('[Worker] Missing DESTINATION_EMAIL environment variable');
        return new Response(JSON.stringify({ error: "Server misconfiguration." }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }

      // 5. Select Template based on type
      const isWebsite = type === 'website_enquiry';
      
      // 5. Construct Branded HTML Internal Lead Email (A)
      const internalSubject = flaggedLowQuality
        ? `[Low Quality] New Lead: ${eFullName} (${eCompanyName || 'Lead'})`
        : `New Lead: ${eFullName} (${eCompanyName || 'Lead'})`;

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
        ? getWebsiteTemplate({ fullName: eFullName, email: eEmail, companyName: eCompanyName, website: eCompanyWebsite, budget: eUrgency, subject: eSubject, message: eMessage }, timestamp)
        : `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            .email-container { font-family: 'Inter', sans-serif; color: #1f2937; max-width: 600px; margin: 0 auto; line-height: 1.5; }
            .header { padding: 24px; background-color: #030712; color: #ffffff; border-radius: 8px 8px 0 0; }
            .content { padding: 32px; border: 1px solid #e5e7eb; border-top: none; }
            .footer { padding: 24px; text-align: center; font-size: 12px; color: #6b7280; }
            .field-label { font-weight: 600; color: #FF6B4A; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
            .field-value { margin-bottom: 24px; font-size: 16px; }
            .section-title { border-bottom: 1px solid #f3f4f6; padding-bottom: 8px; margin-bottom: 20px; font-weight: 700; }
            .btn { display: inline-block; padding: 12px 24px; background: #FF6B4A; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 10px; }
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
              <div class="field-value">${eFullName}</div>
              
              <div class="field-label">Email</div>
              <div class="field-value">${eEmail}</div>
              
              <div class="field-label">Company</div>
              <div class="field-value">${eCompanyName || 'Not provided'}${eCompanyWebsite ? ` &mdash; <a href="${eCompanyWebsite}" style="color:#0ea5e9;">${eCompanyWebsite}</a>` : ''}</div>

              <div class="section-title">Project Details</div>
              <div class="field-label">Automation Interest</div>
              <div class="field-value">${eAutomationInterest}</div>
              
              <div class="field-label">Workflow Description</div>
              <div class="field-value">${eWorkflowDescription.replace(/\n/g, '<br>')}</div>
              
              <div class="field-label">Urgency</div>
              <div class="field-value">${eUrgency || 'Standard'}</div>

              <a href="mailto:${eEmail}" class="btn">Reply to Lead</a>
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

      // 6. Dispatch
      let internalLeadSent = false;
      let dispatchError = null;

      try {
        console.log(`[Worker] Attempting send to internal destination...`);
        // Use HTML mime creator
        const probeMime = createHtmlMime(fromFormatted, internalRecipient, internalSubject, htmlBody, `Reply-To: ${eEmail}`);
        const probeMsg = new EmailMessage(senderAddr, internalRecipient, probeMime);
        
        await env.FWS_EMAIL.send(probeMsg);
        
        internalLeadSent = true;
        console.log(`[Worker] SUCCESS: Accepted for delivery.`);
      } catch (sendError) {
        console.error(`[Worker] SEND FAILED. Upstream provider or internal configuration error.`);
        dispatchError = "Provider Error";
      }

      // 7. Dispatch Customer Receipt (Disabled but logged as skipped)
      console.log(`[Worker] Customer receipt is currently DISABLED.`);

      // 8. Truthful Success Result
      const isActuallySuccessful = internalLeadSent === true;

      if (isActuallySuccessful) {
        console.log(`[Worker] Task complete. Internal lead confirmed. Returning success.`);
        return new Response(JSON.stringify({ 
          success: true
        }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } else {
        console.error(`[Worker] Dispatch failed.`);
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Failed to dispatch lead notification."
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }

    } catch (err) {
      console.error("Worker Execution Error:", err);
      return new Response(JSON.stringify({ error: "Internal Server Error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
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
        .lbl { font-weight: 700; color: #FF6B4A; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .val { margin-bottom: 24px; font-size: 16px; color: #374151; }
        .sec { border-bottom: 1px solid #f3f4f6; padding-bottom: 8px; margin-bottom: 20px; font-weight: 700; color: #111827; }
        .btn { display: inline-block; padding: 14px 28px; background: #FF6B4A; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; }
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
        .field-label { font-weight: 600; color: #FF6B4A; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .field-value { margin-bottom: 24px; font-size: 16px; }
        .section-title { border-bottom: 1px solid #f3f4f6; padding-bottom: 8px; margin-bottom: 20px; font-weight: 700; }
        .btn { display: inline-block; padding: 12px 24px; background: #FF6B4A; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 10px; }
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
