import { Trade } from '@shared/schema';
import { MedalType } from '../types/user';

// Medal thresholds for positive trade percentages
export const MEDAL_THRESHOLDS = {
  diamond: 91,  // 91-100%
  platinum: 86, // 86-90%
  gold: 80,     // 80-85%
  silver: 70,   // 70-79%
  bronze: 60    // 60-69%
};

/**
 * Calculate the medal type based on a win rate percentage.
 * Assumes winRate is a percentage (e.g., 75 for 75%).
 * @param winRate Percentage of winning trades (0-100), or null/undefined if not applicable.
 * @returns The medal type or null if no medal is earned.
 */
export function calculateMedalTypeFromWinRate(winRate: number | null | undefined): MedalType | null {
  if (winRate === null || winRate === undefined || winRate < 0 || winRate > 100) {
    return null; // Invalid or insufficient data
  }

  if (winRate >= MEDAL_THRESHOLDS.diamond) {
    return 'diamond';
  }
  if (winRate >= MEDAL_THRESHOLDS.platinum) {
    return 'platinum';
  }
  if (winRate >= MEDAL_THRESHOLDS.gold) {
    return 'gold';
  }
  if (winRate >= MEDAL_THRESHOLDS.silver) {
    return 'silver';
  }
  if (winRate >= MEDAL_THRESHOLDS.bronze) {
    return 'bronze';
  }
  return null; // Below bronze threshold
}

/**
 * Calculate the medal type based on the user's trading performance using detailed trade data.
 * @param trades Array of user trades.
 * @returns The medal type or null if no medal is earned.
 */
export function calculateMedal(trades: Trade[]): MedalType | null {
  // Only award medals if there are at least 10 trades
  if (!trades || trades.length < 10) {
    return null;
  }

  // Count positive trades (where profitLoss > 0)
  const positiveTrades = trades.filter(trade => trade.profitLoss > 0);
  const positiveTradeCount = positiveTrades.length;
  const totalTradeCount = trades.length;
  
  // Calculate percentage of positive trades
  const positivePercentage = (positiveTradeCount / totalTradeCount) * 100;
  
  // Determine medal type based on percentage using the win rate function
  return calculateMedalTypeFromWinRate(positivePercentage);
}

/**
 * Get a human-readable description of a medal type
 * @param medalType The medal type
 * @returns A string description or an empty string if no medal
 */
export function getMedalDescription(medalType: MedalType): string {
  if (!medalType) return '';
  switch (medalType) {
    case 'bronze': return 'Bronze Trader - Consistent Performer';
    case 'silver': return 'Silver Trader - Skilled Achiever';
    case 'gold': return 'Gold Trader - Elite Strategist';
    case 'platinum': return 'Platinum Trader - Master Tactician';
    case 'diamond': return 'Diamond Trader - Legendary Investor';
    default: return '';
  }
}

/**
 * Get the icon component or path for a medal type
 * This is a placeholder. You'll need to replace this with actual icon components or paths.
 * @param medalType The medal type
 * @returns A string representing the icon (e.g., component name or SVG path)
 */
export function getMedalIcon(medalType: MedalType): string {
  if (!medalType) return 'NoMedalIcon'; // Placeholder for no medal
  switch (medalType) {
    case 'bronze': return 'BronzeMedalIcon';
    case 'silver': return 'SilverMedalIcon';
    case 'gold': return 'GoldMedalIcon';
    case 'platinum': return 'PlatinumMedalIcon';
    case 'diamond': return 'DiamondMedalIcon';
    default: return 'NoMedalIcon';
  }
}

export type { MedalType } from '../types/user';
