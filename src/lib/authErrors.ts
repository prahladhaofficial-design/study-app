// Turns Supabase's sign-in errors into messages a student can act on.

export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many emails were sent in a short time. Please wait a few minutes and try again.'
  if (m.includes('invalid login credentials')) return "That email and password don't match. Check them or reset your password."
  if (m.includes('email not confirmed')) return 'Please confirm your email first. Look for our email in your inbox or spam folder.'
  if (m.includes('already registered') || m.includes('already been registered')) return 'This email already has an account. Sign in instead.'
  if (m.includes('should be different')) return 'Your new password must be different from the old one.'
  if (m.includes('password should be at least')) return 'Use at least 8 characters for your password.'
  if (m.includes('failed to fetch') || m.includes('network')) return "Can't reach the server. Check your internet connection and try again."
  return message
}
