/**
 * Robust Payout Calculation Service
 * Implements the stepwise payout calculation formula from PAYOUT_FORMULA.md
 */

export interface PayoutCalculationInput {
  clubBaseRate: number; // B - club base rate per head
  maxSteps?: number;    // Maximum steps to calculate (default: 9)
}

export interface StepPayout {
  step: number;
  downlineCount: number; // N_s = 3^s
  ratePerHead: number;   // R_s
  stepPayout: number;    // P_s
}

export interface PayoutCalculationResult {
  clubBaseRate: number;
  totalPayout: number;
  steps: StepPayout[];
  calculationDetails: {
    formula: string;
    totalSteps: number;
    calculatedAt: Date;
  };
}

export interface ClubTier {
  name: string;
  baseRate: number;
  description: string;
}

/**
 * Predefined club tiers based on the formula
 */
export const CLUB_TIERS: ClubTier[] = [
  { name: 'Executive', baseRate: 50, description: '₹50,000 chit for 20 & 25 months' },
  { name: 'Development', baseRate: 100, description: '₹1,00,000 chit for 20 & 25 months' },
  { name: 'Manager', baseRate: 200, description: '₹2,00,000 chit for 20 & 25 months' },
  { name: 'Regional', baseRate: 300, description: '₹3,00,000 chit for 20, 25 & 30 months' },
  { name: 'Chairman', baseRate: 500, description: '₹5,00,000 chit for 20, 25 & 40 months' },
  { name: 'Diamond', baseRate: 1000, description: '₹10,00,000 chit for 20, 25 & 40 months' },
];

/**
 * Core payout calculation service
 */
export class PayoutCalculator {
  /**
   * Calculate downline count for a given step
   * N_s = 3^s
   */
  static calculateDownlineCount(step: number): number {
    return Math.pow(3, step);
  }

  /**
   * Calculate rate per head for a given step and club base rate
   * If 1 <= s <= 5: R_s = B * (s + 1) / 2
   * If 6 <= s <= 9: R_s = B
   */
  static calculateRatePerHead(step: number, clubBaseRate: number): number {
    if (step >= 1 && step <= 5) {
      return clubBaseRate * (step + 1) / 2;
    } else if (step >= 6 && step <= 9) {
      return clubBaseRate;
    } else {
      throw new Error(`Invalid step: ${step}. Steps must be between 1 and 9.`);
    }
  }

  /**
   * Calculate step payout
   * P_s = R_s * N_s
   */
  static calculateStepPayout(step: number, clubBaseRate: number): number {
    const downlineCount = this.calculateDownlineCount(step);
    const ratePerHead = this.calculateRatePerHead(step, clubBaseRate);
    return ratePerHead * downlineCount;
  }

  /**
   * Calculate complete payout structure
   */
  static calculatePayout(input: PayoutCalculationInput): PayoutCalculationResult {
    const { clubBaseRate, maxSteps = 9 } = input;
    
    if (clubBaseRate <= 0) {
      throw new Error('Club base rate must be positive');
    }

    if (maxSteps < 1 || maxSteps > 9) {
      throw new Error('Max steps must be between 1 and 9');
    }

    const steps: StepPayout[] = [];
    let totalPayout = 0;

    for (let step = 1; step <= maxSteps; step++) {
      const downlineCount = this.calculateDownlineCount(step);
      const ratePerHead = this.calculateRatePerHead(step, clubBaseRate);
      const stepPayout = this.calculateStepPayout(step, clubBaseRate);

      steps.push({
        step,
        downlineCount,
        ratePerHead,
        stepPayout,
      });

      totalPayout += stepPayout;
    }

    return {
      clubBaseRate,
      totalPayout,
      steps,
      calculationDetails: {
        formula: this.getFormulaDescription(),
        totalSteps: maxSteps,
        calculatedAt: new Date(),
      },
    };
  }

  /**
   * Calculate payout based on actual referral counts
   */
  static calculatePayoutWithActualCounts(
    clubBaseRate: number,
    actualReferralCounts: number[]
  ): PayoutCalculationResult {
    if (clubBaseRate <= 0) {
      throw new Error('Club base rate must be positive');
    }

    if (actualReferralCounts.length === 0) {
      throw new Error('Actual referral counts array cannot be empty');
    }

    const steps: StepPayout[] = [];
    let totalPayout = 0;

    for (let step = 1; step <= actualReferralCounts.length; step++) {
      const actualCount = actualReferralCounts[step - 1];
      const ratePerHead = this.calculateRatePerHead(step, clubBaseRate);
      const stepPayout = ratePerHead * actualCount;

      steps.push({
        step,
        downlineCount: actualCount,
        ratePerHead,
        stepPayout,
      });

      totalPayout += stepPayout;
    }

    return {
      clubBaseRate,
      totalPayout,
      steps,
      calculationDetails: {
        formula: 'Actual referral counts based calculation',
        totalSteps: actualReferralCounts.length,
        calculatedAt: new Date(),
      },
    };
  }

  /**
   * Get formula description for documentation
   */
  static getFormulaDescription(): string {
    return `
      Stepwise Payout Formula:
      - N_s = 3^s (downline count at step s)
      - R_s = B * (s + 1) / 2 for steps 1-5, R_s = B for steps 6-9
      - P_s = R_s * N_s (step payout)
      - P_total = sum of all P_s
    `.trim();
  }

  /**
   * Calculate payout for a specific step range
   */
  static calculateStepRange(
    clubBaseRate: number,
    startStep: number,
    endStep: number
  ): StepPayout[] {
    if (startStep < 1 || endStep > 9 || startStep > endStep) {
      throw new Error('Invalid step range. Steps must be between 1-9 and start <= end.');
    }

    const steps: StepPayout[] = [];
    for (let step = startStep; step <= endStep; step++) {
      const downlineCount = this.calculateDownlineCount(step);
      const ratePerHead = this.calculateRatePerHead(step, clubBaseRate);
      const stepPayout = this.calculateStepPayout(step, clubBaseRate);

      steps.push({
        step,
        downlineCount,
        ratePerHead,
        stepPayout,
      });
    }

    return steps;
  }

  /**
   * Find the club tier that matches a given base rate
   */
  static findClubTier(baseRate: number): ClubTier | null {
    return CLUB_TIERS.find(tier => tier.baseRate === baseRate) || null;
  }

  /**
   * Get all available club tiers
   */
  static getClubTiers(): ClubTier[] {
    return [...CLUB_TIERS];
  }

  /**
   * Validate club base rate
   */
  static validateClubBaseRate(baseRate: number): { isValid: boolean; message?: string } {
    if (baseRate <= 0) {
      return { isValid: false, message: 'Club base rate must be positive' };
    }

    if (baseRate > 10000) {
      return { isValid: false, message: 'Club base rate seems unusually high' };
    }

    return { isValid: true };
  }

  /**
   * Calculate payout comparison between different club tiers
   */
  static compareClubTiers(baseRates: number[]): {
    [baseRate: number]: PayoutCalculationResult;
  } {
    const comparison: { [baseRate: number]: PayoutCalculationResult } = {};

    for (const baseRate of baseRates) {
      const validation = this.validateClubBaseRate(baseRate);
      if (validation.isValid) {
        comparison[baseRate] = this.calculatePayout({ clubBaseRate: baseRate });
      }
    }

    return comparison;
  }

  /**
   * Calculate cumulative payout up to a specific step
   */
  static calculateCumulativePayout(
    clubBaseRate: number,
    upToStep: number
  ): { step: number; cumulativePayout: number }[] {
    const result: { step: number; cumulativePayout: number }[] = [];
    let cumulativePayout = 0;

    for (let step = 1; step <= upToStep; step++) {
      const stepPayout = this.calculateStepPayout(step, clubBaseRate);
      cumulativePayout += stepPayout;
      result.push({ step, cumulativePayout });
    }

    return result;
  }

  /**
   * Calculate payout efficiency (payout per base rate unit)
   */
  static calculatePayoutEfficiency(clubBaseRate: number): {
    totalPayout: number;
    efficiency: number; // payout per base rate unit
    efficiencyRatio: number; // total payout / base rate
  } {
    const result = this.calculatePayout({ clubBaseRate });
    const efficiency = result.totalPayout / clubBaseRate;
    
    return {
      totalPayout: result.totalPayout,
      efficiency,
      efficiencyRatio: efficiency,
    };
  }
}

/**
 * Utility functions for payout calculations
 */
export class PayoutUtils {
  /**
   * Format currency for display
   */
  static formatCurrency(amount: number, currency: string = 'INR'): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Format number with commas
   */
  static formatNumber(number: number): string {
    return new Intl.NumberFormat('en-IN').format(number);
  }

  /**
   * Calculate percentage of total
   */
  static calculatePercentage(part: number, total: number): number {
    if (total === 0) return 0;
    return (part / total) * 100;
  }

  /**
   * Generate payout summary for display
   */
  static generatePayoutSummary(result: PayoutCalculationResult): {
    clubTier: ClubTier | null;
    formattedTotal: string;
    stepSummary: string;
    efficiency: number;
  } {
    const clubTier = PayoutCalculator.findClubTier(result.clubBaseRate);
    const formattedTotal = this.formatCurrency(result.totalPayout);
    const efficiency = PayoutCalculator.calculatePayoutEfficiency(result.clubBaseRate);
    
    const stepSummary = `Steps 1-${result.steps.length}: ${result.steps.length} levels`;
    
    return {
      clubTier,
      formattedTotal,
      stepSummary,
      efficiency: efficiency.efficiencyRatio,
    };
  }

  /**
   * Export payout data to CSV format
   */
  static exportToCSV(result: PayoutCalculationResult): string {
    const headers = ['Step', 'Downline Count', 'Rate per Head', 'Step Payout'];
    const rows = result.steps.map(step => [
      step.step.toString(),
      step.downlineCount.toString(),
      step.ratePerHead.toString(),
      step.stepPayout.toString(),
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n');

    return csvContent;
  }

  /**
   * Export payout data to JSON format
   */
  static exportToJSON(result: PayoutCalculationResult): string {
    return JSON.stringify(result, null, 2);
  }
}

/**
 * Payout calculation cache for performance optimization
 */
export class PayoutCache {
  private static cache = new Map<string, PayoutCalculationResult>();
  private static readonly CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

  /**
   * Generate cache key
   */
  private static generateKey(clubBaseRate: number, maxSteps: number): string {
    return `${clubBaseRate}-${maxSteps}`;
  }

  /**
   * Get cached result
   */
  static get(clubBaseRate: number, maxSteps: number = 9): PayoutCalculationResult | null {
    const key = this.generateKey(clubBaseRate, maxSteps);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.calculationDetails.calculatedAt.getTime() < this.CACHE_EXPIRY) {
      return cached;
    }
    
    return null;
  }

  /**
   * Set cached result
   */
  static set(clubBaseRate: number, result: PayoutCalculationResult): void {
    const key = this.generateKey(clubBaseRate, result.calculationDetails.totalSteps);
    this.cache.set(key, result);
  }

  /**
   * Clear cache
   */
  static clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  static getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
