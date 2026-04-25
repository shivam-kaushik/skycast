import { Platform } from 'react-native'

const RC_API_KEY_IOS = process.env.EXPO_PUBLIC_RC_API_KEY_IOS ?? ''
const RC_API_KEY_ANDROID = process.env.EXPO_PUBLIC_RC_API_KEY_ANDROID ?? ''

let Purchases: typeof import('react-native-purchases').default | null = null

async function getModule() {
  if (Purchases) return Purchases
  try {
    const mod = await import('react-native-purchases')
    Purchases = mod.default
    return Purchases
  } catch {
    return null
  }
}

export async function initPurchases(): Promise<void> {
  const mod = await getModule()
  if (!mod) return
  const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID
  if (!apiKey) return
  await mod.configure({ apiKey })
}

export async function checkPremiumStatus(): Promise<boolean> {
  const mod = await getModule()
  if (!mod) return false
  try {
    const info = await mod.getCustomerInfo()
    return info.entitlements.active['premium'] !== undefined
  } catch {
    return false
  }
}

export async function purchasePremium(): Promise<boolean> {
  const mod = await getModule()
  if (!mod) return false
  try {
    const offerings = await mod.getOfferings()
    const monthly = offerings.current?.monthly
    if (!monthly) return false
    const result = await mod.purchasePackage(monthly)
    return result.customerInfo.entitlements.active['premium'] !== undefined
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'userCancelled' in e) return false
    throw e
  }
}

export async function restorePurchases(): Promise<boolean> {
  const mod = await getModule()
  if (!mod) return false
  try {
    const info = await mod.restorePurchases()
    return info.entitlements.active['premium'] !== undefined
  } catch {
    return false
  }
}
