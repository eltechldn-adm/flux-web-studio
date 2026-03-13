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
        return new Response(JSON.stringify({ error: "Missing required fields." }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      const timestamp = new Date().toISOString();
      const senderAddr = "no-reply@fluxwebstudio.com";
      const internalRecipient = "hello@fluxwebstudio.com";

      // 4. Construct Internal Lead Email (A)
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


      // 5. Construct Customer Confirmation Email (B)
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


      // 6. Dispatch Internal Alert via Native Binding
      try {
        await env.FWS_EMAIL.send(msgA);
        // await env.FWS_EMAIL.send(msgB); // Disabled: Cloudflare routing blocks unverified arbitrary outbound destinations
      } catch (sendError) {
        console.error("Cloudflare send_email binding failed:", sendError);
        return new Response(JSON.stringify({ error: "Failed to dispatch email via Cloudflare.", details: sendError.message }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
        });
      }

      // 7. Success
      return new Response(JSON.stringify({ success: true, message: "Emails dispatched successfully." }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" }
      });

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
