/**
 * Global authentication interceptor to handle 401 responses
 * This ensures that any 401 response triggers an automatic logout
 */

let authFailureHandler: (() => void) | null = null;

export function setAuthFailureHandler(handler: () => void) {
  authFailureHandler = handler;
}

export function handleAuthFailure() {
  if (authFailureHandler) {
    authFailureHandler();
  }
}

// Override the global fetch function to intercept 401 responses
// Only run this on the client side
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await originalFetch(input, init);
    
    // Check for 401 responses and trigger auth failure handler
    if (response.status === 401) {
      console.log('401 response detected, triggering auth failure handler');
      handleAuthFailure();
    }
    
    return response;
  };
}
