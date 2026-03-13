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
        fullName,
        email,
        companyName,
        businessType,
        automationInterest,
        workflowDescription,
        urgency
      } = data;

      if (!fullName || !email || !automationInterest || !workflowDescription) {
        console.warn(`[Worker] Validation failed: missing fields.`);
        return new Response(JSON.stringify({ error: "Missing required fields." }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const timestamp = new Date().toISOString();
      const senderAddr = "no-reply@fluxwebstudio.com";
      const internalRecipient = "eltechldn@gmail.com"; // Verified destination inbox
      const publicAlias = "hello@fluxwebstudio.com";  // Public facing address

      // 4. Construct Internal Lead Email (A)
      console.log(`[Worker] Constructing internal MIME message for ${internalRecipient}...`);
      const internalSubject = `New Automation Request: ${fullName} at ${companyName || 'Unknown Company'}`;
      const internalBody = `
New Lead Notification

Name: ${fullName}
Email: ${email}
Company: ${companyName || 'Not provided'}
Business Type: ${businessType || 'Not provided'}
Automation Needed: ${automationInterest}
Workflow Description: 
${workflowDescription}

Urgency: ${urgency || 'Not provided'}
Submitted: ${timestamp}
      `.trim();

      const internalMimeMessage = createMimeMessage(
        senderAddr, 
        internalRecipient, 
        internalSubject, 
        internalBody,
        `Reply-To: ${email}` // So hitting reply responds to the lead
      );

      const msgA = new EmailMessage(senderAddr, internalRecipient, internalMimeMessage);


      // 5. Construct Customer Confirmation Email (B) - Logic remains but send is disabled
      const customerSubject = "Thanks for contacting Flux Web Studio";
      const customerBody = `
Hi ${fullName.split(' ')[0]},

Thank you for your automation request. We have received your submission and will review it shortly. A member of our team will get back to you soon.

Best,
The Flux Web Studio Team
https://fluxwebstudio.com
      `.trim();

      const customerMimeMessage = createMimeMessage(
        senderAddr,
        email,
        customerSubject,
        customerBody
      );

      const msgB = new EmailMessage(senderAddr, email, customerMimeMessage);


      // 6. Dispatch Results Tracking
      let internalLeadSent = false;
      let customerReceiptSent = false;
      let dispatchError = null;

      // 6. Dispatch Internal Alert via PROBER LOOP
      const candidates = [
        "hello@fluxwebstudio.com", 
        "eltechldn@gmail.com", 
        "elainamarriott@gmail.com"
      ];

      for (const recipient of candidates) {
        try {
          console.log(`[Worker] PROBE: Attempting send to ${recipient}...`);
          const probeMime = createMimeMessage(senderAddr, recipient, internalSubject, internalBody, `Reply-To: ${email}`);
          const probeMsg = new EmailMessage(senderAddr, recipient, probeMime);
          
          await env.FWS_EMAIL.send(probeMsg);
          
          internalLeadSent = true;
          const actualRecipientUsed = recipient; // Track the winner
          console.log(`[Worker] PROBE SUCCESS: Recipient ${recipient} accepted the message.`);
          break; // Stop at first success
        } catch (sendError) {
          console.error(`[Worker] PROBE FAILED for ${recipient}:`, sendError.message);
          dispatchError = sendError.message;
        }
      }

      // 7. Dispatch Customer Receipt (Disabled but logged as skipped)
      console.log(`[Worker] Customer receipt (msgB) is currently DISABLED to prevent destination restrictions.`);

      // 8. Truthful Success Result
      const isActuallySuccessful = internalLeadSent === true;

      if (isActuallySuccessful) {
        console.log(`[Worker] Task complete. Internal lead confirmed. Returning success.`);
        return new Response(JSON.stringify({ 
          success: true, 
          message: "Internal lead notification sent successfully.",
          internalLeadSent: true,
          customerReceiptSent: false
        }), {
          status: 200,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      } else {
        console.error(`[Worker] Dispatch failed. Internal lead notification was NOT sent.`);
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Failed to dispatch internal lead notification.",
          details: dispatchError,
          internalLeadSent: false,
          customerReceiptSent: false
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
 * Helper: Creates a standard RFC 822 MIME plain-text email string
 */
function createMimeMessage(from, to, subject, body, extraHeader = "") {
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
  msg += `Content-Type: text/plain; charset="utf-8"\r\n`;
  msg += `\r\n`;
  msg += `${body}\r\n`;
  return msg;
}
