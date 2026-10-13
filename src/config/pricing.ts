import type { Plan } from '../lib/access'

// Prices are placeholders until they are set; checkout links arrive with payments on Day 5.
export const PLANS: { id: Plan; label: string; price: string; note: string; highlight?: boolean }[] = [
  { id: 'monthly', label: 'Monthly', price: '₹—', note: 'Cancel anytime' },
  { id: 'yearly', label: 'Yearly', price: '₹—', note: 'Best value', highlight: true },
  { id: 'lifetime', label: 'Lifetime', price: '₹—', note: 'Pay once, keep forever' },
]
