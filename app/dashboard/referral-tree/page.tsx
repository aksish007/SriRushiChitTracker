'use client';

import { ReferralTree } from '@/components/dashboard/referral-tree';

export default function ReferralTreePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Referral Tree</h1>
          <p className="text-muted-foreground">
            Visualize the complete referral network and hierarchy
          </p>
        </div>
      </div>

      <ReferralTree />
    </div>
  );
}