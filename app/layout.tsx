import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/contexts/auth-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { AuthInterceptorProvider } from '@/components/auth-interceptor-provider';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SRI RUSHI CHITS - Chit Fund Management System',
  description: 'Complete chit fund management system with user registration, referral tracking, and payout management.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <AuthInterceptorProvider>
            <AuthProvider>
              {children}
              <Toaster />
            </AuthProvider>
          </AuthInterceptorProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}