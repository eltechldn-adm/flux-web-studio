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

    // Forward the payload to the dedicated Cloudflare Email Worker natively
    const workerUrl = "https://fws-email-worker.eltechldn.workers.dev";

    const payload = {
      fullName,
      email,
      companyName,
      businessType: formData.get('businessType') || 'N/A',
      automationInterest,
      workflowDescription,
      urgency
    };

    // Invoke the bound service safely via public ingress
    const workerResponse = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (workerResponse.ok) {
      // Success triggers the UI success state
      return Response.redirect(new URL('/automation-request?success=1', request.url), 303);
    } else {
      // Explicitly return a 500 block to prevent the false success redirect
      const errorData = await workerResponse.text();
      console.error("Email Worker Error:", workerResponse.status, errorData);
      return new Response('Internal Server Error: Failed to dispatch emails.', { status: 500 });
    }

  } catch (error) {
    console.error("Function Execution Error:", error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
