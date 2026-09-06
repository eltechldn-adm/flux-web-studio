export const onRequest = async (context) => {
    // Pass through the request to the origin
    const response = await context.next();
    
    // Check if we are running in a Cloudflare Pages preview environment
    const url = new URL(context.request.url);
    if (url.hostname.endsWith('.pages.dev')) {
        // Create a new response to allow header mutation (if original response is immutable)
        const newResponse = new Response(response.body, response);
        // Explicitly set noindex, nofollow for preview environments
        newResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
        return newResponse;
    }
    
    return response;
};
