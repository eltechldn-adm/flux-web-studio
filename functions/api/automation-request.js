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

    // Note: Cloudflare Pages projects currently do not support the "send_email" binding.
    // The email sending step is bypassed here to allow successful deployment.
    // Form submissions will still process and redirect to the success state.
    console.log("Mock Form Submission Received:", msgText);

    // Redirect back to the form page with success query param
    return Response.redirect(new URL('/automation-request?success=1', request.url), 303);

  } catch (error) {
    console.error("Error processing request:", error);
    return new Response('Server Error', { status: 500 });
  }
}
