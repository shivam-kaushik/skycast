import { loginUser } from '@/src/api/purchases'
import { usePremiumStore } from '@/src/store/premiumStore'

/**
 * After any sign-in (password, Google, Apple, email confirmation, password reset): link RevenueCat to
 * the Supabase user so premium follows them across devices, and refresh the local premium state.
 */
export async function syncPurchasesForUser(userId: string): Promise<void> {
  const isPremium = await loginUser(userId)
  const premium = usePremiumStore.getState()
  await premium.setPremium(isPremium)
  if (isPremium) await premium.loadQueryCount()
}
