'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, token, handleAuthFailure } = useAuth();
  const router = useRouter();
  const validationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Set up periodic token validation
  useEffect(() => {
    if (user && token) {
      // Validate token every 5 minutes
      validationIntervalRef.current = setInterval(async () => {
        try {
          const response = await fetch('/api/auth/validate', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            console.log('Token validation failed during periodic check');
            await handleAuthFailure();
          }
        } catch (error) {
          console.log('Token validation error during periodic check:', error);
          await handleAuthFailure();
        }
      }, 5 * 60 * 1000); // 5 minutes
    }

    return () => {
      if (validationIntervalRef.current) {
        clearInterval(validationIntervalRef.current);
      }
    };
  }, [user, token, handleAuthFailure]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0" style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
        <Header />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden min-w-0" style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}