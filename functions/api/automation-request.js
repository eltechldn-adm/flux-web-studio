export async function onRequestPost({ request }) {
  try {
    const formData = await request.formData();

    const fullName = formData.get('fullName');
    const email = formData.get('email');
    const companyName = formData.get('companyName') || 'N/A';
    const automationInterest = formData.get('automationInterest');
    const workflowDescription = formData.get('workflowDescription');
    const urgency = formData.get('urgency') || 'exploring';

    // Validate required fields
    if (!fullName || !email || !automationInterest || !workflowDescription) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Exact email format requested
    const msgText = `New Automation Request
Name: ${fullName}
Email: ${email}
Company: ${companyName}
Automation Needed: ${automationInterest}
Workflow Description:
${workflowDescription}
Urgency Level: ${urgency}`;

    // Cloudflare Pages integration using MailChannels API 
    // This allows sending emails natively without using the unsupported `send_email` wrangler binding
    const payload = {
      personalizations: [
        {
          to: [{ email: "hello@fluxwebstudio.com", name: "Flux Web Studio" }],
        },
      ],
      from: {
        email: "no-reply@fluxwebstudio.com",
        name: "Flux Web Studio System",
      },
      subject: `New Automation Request: ${fullName}`,
      content: [
        {
          type: "text/plain",
          value: msgText,
        },
      ],
    };

    const mailResponse = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!mailResponse.ok) {
      console.error("MailChannels Error:", mailResponse.status, await mailResponse.text());
      // Proceeding to redirect anyway so UX doesn't crash on email deliverability issues
    }

    // Redirect user to success state natively
    return Response.redirect(new URL('/automation-request?success=1', request.url), 303);

  } catch (error) {
    console.error("Error processing request:", error);
    return new Response('Server Error', { status: 500 });
  }
}
