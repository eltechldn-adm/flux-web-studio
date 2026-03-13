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
    
    console.log(`[API] Attempting worker dispatch to: ${workerUrl}`);
    console.log(`[API] Payload:`, JSON.stringify(payload));

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

    console.log(`[API] Worker Response Status: ${workerResponse.status}`);
    
    if (workerResponse.ok) {
      const responseBody = await workerResponse.json();
      console.log(`[API] Worker Response Body:`, JSON.stringify(responseBody));

      if (responseBody.success === true) {
        console.log(`[API] Dispatch verified. Redirecting to success.`);
        return Response.redirect(new URL('/automation-request?success=1', request.url), 303);
      } else {
        console.error(`[API] Worker returned 200 but success=false:`, responseBody.error);
        return new Response(`Error: ${responseBody.error || 'Failed to dispatch email.'}`, { status: 500 });
      }
    } else {
      const errorText = await workerResponse.text();
      console.error(`[API] Worker failed with status ${workerResponse.status}:`, errorText);
      return new Response('Internal Server Error: Failed to dispatch emails.', { status: 500 });
    }

  } catch (error) {
    console.error("Function Execution Error:", error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
