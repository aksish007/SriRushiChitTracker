'use client';

import { useEffect } from 'react';
import '@/lib/auth-interceptor';

/**
 * This component initializes the global auth interceptor
 * It should be included early in the app to catch all 401 responses
 */
export function AuthInterceptorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // The auth interceptor is imported and initialized automatically
    console.log('Auth interceptor initialized');
  }, []);

  return <>{children}</>;
}
