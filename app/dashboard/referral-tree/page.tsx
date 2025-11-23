'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReferralTreePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to v2
    router.replace('/dashboard/referral-tree-v2');
  }, [router]);

  return null;
}
