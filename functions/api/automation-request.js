import { EmailMessage } from "cloudflare:email";

export async function onRequestPost({ request, env }) {
  try {
    const formData = await request.formData();

    const fullName = formData.get('fullName');
    const email = formData.get('email');
    const companyName = formData.get('companyName') || 'N/A';
    const businessType = formData.get('businessType');
    const automationInterest = formData.get('automationInterest');
    const workflowDescription = formData.get('workflowDescription');
    const urgency = formData.get('urgency') || 'exploring';

    // Validate required fields
    if (!fullName || !email || !businessType || !automationInterest || !workflowDescription) {
      return new Response('Missing required fields', { status: 400 });
    }

    const msgText = `--- New Automation Request ---

Name: ${fullName}
Email: ${email}
Company: ${companyName}
Business Type: ${businessType}
Automation Interest: ${automationInterest}
Urgency: ${urgency}

Workflow Description:
${workflowDescription}
`;

    if (env.FWS_EMAIL) {
      const message = new EmailMessage(
        "no-reply@fluxwebstudio.com",
        "hello@fluxwebstudio.com",
        `New Automation Request: ${fullName}`,
        msgText
      );
      await env.FWS_EMAIL.send(message);
    } else {
      console.error("FWS_EMAIL binding is missing.");
    }

    // Redirect back to the form page with success query param
    return Response.redirect(new URL('/automation-request?success=1', request.url), 303);

  } catch (error) {
    console.error("Error processing request:", error);
    return new Response('Server Error', { status: 500 });
  }
}
