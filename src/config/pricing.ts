import type { Plan } from '../lib/access'

// Launch prices in Indian rupees. Checkout links arrive with payments.
export const PLANS: { id: Plan; label: string; price: string; per: string; note: string; highlight?: boolean }[] = [
  { id: 'monthly', label: 'Monthly', price: '₹99', per: '/month', note: 'Cancel anytime' },
  { id: 'yearly', label: 'Yearly', price: '₹699', per: '/year', note: 'Save 41% vs monthly', highlight: true },
  { id: 'lifetime', label: 'Lifetime', price: '₹1,499', per: 'once', note: 'Pay once, keep forever' },
]
