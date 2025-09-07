import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface UserDeletionOptions {
  userId: string;
  deletedBy: string;
  reason?: string;
  forceDelete?: boolean; // Bypass safety checks
}

export interface DeletionCheckResult {
  canDelete: boolean;
  warnings: string[];
  errors: string[];
  relatedData: {
    activeSubscriptions: number;
    completedSubscriptions: number;
    payouts: number;
    referrals: number;
    nominees: number;
    auditLogs: number;
  };
}

/**
 * Comprehensive user deletion strategy with multiple approaches
 */
export class UserDeletionService {
  
  /**
   * Check if a user can be safely deleted
   */
  static async checkUserDeletion(userId: string): Promise<DeletionCheckResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    
    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: true,
        payouts: true,
        referrals: true,
        nominees: true,
        auditLogs: true,
      }
    });

    if (!user) {
      return {
        canDelete: false,
        warnings: [],
        errors: ['User not found'],
        relatedData: {
          activeSubscriptions: 0,
          completedSubscriptions: 0,
          payouts: 0,
          referrals: 0,
          nominees: 0,
          auditLogs: 0,
        }
      };
    }

    const activeSubscriptions = user.subscriptions.filter(sub => sub.status === 'ACTIVE');
    const completedSubscriptions = user.subscriptions.filter(sub => sub.status === 'COMPLETED');
    const paidPayouts = user.payouts.filter(payout => payout.status === 'PAID');

    // Check for blocking conditions
    if (activeSubscriptions.length > 0) {
      errors.push(`User has ${activeSubscriptions.length} active subscriptions`);
    }

    if (paidPayouts.length > 0) {
      errors.push(`User has ${paidPayouts.length} paid payouts (financial records)`);
    }

    // Check for warnings
    if (completedSubscriptions.length > 0) {
      warnings.push(`User has ${completedSubscriptions.length} completed subscriptions`);
    }

    if (user.referrals.length > 0) {
      warnings.push(`User has ${user.referrals.length} direct referrals`);
    }

    if (user.payouts.length > 0) {
      warnings.push(`User has ${user.payouts.length} total payouts`);
    }

    return {
      canDelete: errors.length === 0,
      warnings,
      errors,
      relatedData: {
        activeSubscriptions: activeSubscriptions.length,
        completedSubscriptions: completedSubscriptions.length,
        payouts: user.payouts.length,
        referrals: user.referrals.length,
        nominees: user.nominees.length,
        auditLogs: user.auditLogs.length,
      }
    };
  }

  /**
   * Soft delete a user (recommended approach)
   */
  static async softDeleteUser(options: UserDeletionOptions): Promise<void> {
    const { userId, deletedBy, reason } = options;

    await prisma.$transaction(async (tx) => {
      // 1. Mark user as deleted
      await tx.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          deletedAt: new Date(),
          deletedBy,
          deletionReason: reason,
        }
      });

      // 2. Deactivate active subscriptions
      await tx.chitSubscription.updateMany({
        where: {
          userId,
          status: 'ACTIVE',
        },
        data: {
          status: 'CANCELLED',
        }
      });

      // 3. Create audit log
      await tx.auditLog.create({
        data: {
          userId: deletedBy,
          action: 'USER_SOFT_DELETE',
          details: `Soft deleted user ${userId}. Reason: ${reason || 'No reason provided'}`,
        }
      });
    });
  }

  /**
   * Hard delete a user (use with extreme caution)
   */
  static async hardDeleteUser(options: UserDeletionOptions): Promise<void> {
    const { userId, deletedBy, reason, forceDelete } = options;

    // Safety check
    if (!forceDelete) {
      const checkResult = await this.checkUserDeletion(userId);
      if (!checkResult.canDelete) {
        throw new Error(`Cannot delete user: ${checkResult.errors.join(', ')}`);
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete in correct order to respect foreign key constraints
      
      // Delete payouts first (they reference subscriptions)
      await tx.payout.deleteMany({
        where: { userId }
      });

      // Delete subscriptions
      await tx.chitSubscription.deleteMany({
        where: { userId }
      });

      // Delete nominees (has CASCADE delete)
      await tx.nominee.deleteMany({
        where: { userId }
      });

      // Update referrals to remove referrer relationship
      await tx.user.updateMany({
        where: { referredBy: userId },
        data: { referredBy: null }
      });

      // Create audit log before deleting user
      await tx.auditLog.create({
        data: {
          userId: deletedBy,
          action: 'USER_HARD_DELETE',
          details: `Hard deleted user ${userId}. Reason: ${reason || 'No reason provided'}`,
        }
      });

      // Finally delete the user
      await tx.user.delete({
        where: { id: userId }
      });
    });
  }

  /**
   * Restore a soft-deleted user
   */
  static async restoreUser(userId: string, restoredBy: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Restore user
      await tx.user.update({
        where: { id: userId },
        data: {
          isActive: true,
          deletedAt: null,
          deletedBy: null,
          deletionReason: null,
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: restoredBy,
          action: 'USER_RESTORE',
          details: `Restored user ${userId}`,
        }
      });
    });
  }

  /**
   * Get deletion candidates (users that can be safely deleted)
   */
  static async getDeletionCandidates(): Promise<Array<{
    user: any;
    canDelete: boolean;
    warnings: string[];
    errors: string[];
  }>> {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      include: {
        subscriptions: true,
        payouts: true,
        referrals: true,
      }
    });

    const results = await Promise.all(
      users.map(async (user) => {
        const checkResult = await this.checkUserDeletion(user.id);
        return {
          user,
          canDelete: checkResult.canDelete,
          warnings: checkResult.warnings,
          errors: checkResult.errors,
        };
      })
    );

    return results;
  }
}

/**
 * Deletion strategies based on business rules
 */
export const DELETION_STRATEGIES = {
  // Conservative: Only allow deletion of users with no financial history
  CONSERVATIVE: {
    allowWithPayouts: false,
    allowWithSubscriptions: false,
    allowWithReferrals: false,
  },
  
  // Moderate: Allow deletion of users with completed subscriptions but no payouts
  MODERATE: {
    allowWithPayouts: false,
    allowWithSubscriptions: true, // Only completed ones
    allowWithReferrals: true,
  },
  
  // Aggressive: Allow deletion with warnings
  AGGRESSIVE: {
    allowWithPayouts: true,
    allowWithSubscriptions: true,
    allowWithReferrals: true,
  }
} as const;
