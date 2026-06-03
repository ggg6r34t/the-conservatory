import type { BillingPackage } from '../types';

function parseLocalizedPrice(priceString: string): number | null {
  const normalized = priceString
    .trim()
    .replace(/[^\d.,]/g, '')
    .replace(',', '.');

  if (!normalized) {
    return null;
  }

  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function computeAnnualSavingsPercent(
  monthly: BillingPackage | null,
  annual: BillingPackage | null,
): number | null {
  if (!monthly || !annual) {
    return null;
  }

  const monthlyPrice = parseLocalizedPrice(monthly.priceString);
  const annualPrice = parseLocalizedPrice(annual.priceString);

  if (!monthlyPrice || !annualPrice) {
    return null;
  }

  const monthlyAnnualized = monthlyPrice * 12;
  if (monthlyAnnualized <= annualPrice) {
    return null;
  }

  return Math.round((1 - annualPrice / monthlyAnnualized) * 100);
}

export function formatAnnualSavingsLabel(
  monthly: BillingPackage | null,
  annual: BillingPackage | null,
): string | null {
  const savingsPercent = computeAnnualSavingsPercent(monthly, annual);
  if (savingsPercent === null || savingsPercent <= 0) {
    return null;
  }

  return `Save ${savingsPercent}% vs monthly`;
}
