import { Plan } from '@/types';

export const PLANS: Record<string, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    priceId: '',
    limits: {
      brands: 1,
      keywords: 5,
      scansPerMonth: 10,
      autoScan: false,
      csvExport: false,
    },
    features: [
      '1 brand tracked',
      '5 keywords per brand',
      '10 manual scans/month',
      'ChatGPT + Perplexity + Gemini',
      'Visibility score dashboard',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 49,
    priceId: process.env.STRIPE_PRO_PRICE_ID || '',
    limits: {
      brands: 5,
      keywords: 25,
      scansPerMonth: 150,
      autoScan: true,
      csvExport: false,
    },
    features: [
      '5 brands tracked',
      '25 keywords per brand',
      '150 scans/month',
      'Daily auto-scans',
      'Competitor comparison',
      'Email alerts',
      'All 3 LLMs',
    ],
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    price: 149,
    priceId: process.env.STRIPE_AGENCY_PRICE_ID || '',
    limits: {
      brands: 20,
      keywords: 100,
      scansPerMonth: 999999,
      autoScan: true,
      csvExport: true,
    },
    features: [
      '20 brands tracked',
      '100 keywords per brand',
      'Unlimited scans',
      'Daily auto-scans',
      'CSV export',
      'Competitor comparison',
      'Email alerts',
      'Priority support',
    ],
  },
};

// Alias for routes that reference stripePriceId
export function getStripePriceId(planId: string): string {
  return PLANS[planId]?.priceId ?? '';
}
