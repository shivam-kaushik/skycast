const Purchases = {
  configure: jest.fn(),
  getCustomerInfo: jest.fn().mockResolvedValue({ entitlements: { active: {} } }),
  getOfferings: jest.fn().mockResolvedValue({ current: null }),
  purchasePackage: jest.fn().mockResolvedValue({ customerInfo: { entitlements: { active: {} } } }),
  restorePurchases: jest.fn().mockResolvedValue({ entitlements: { active: {} } }),
}
export default Purchases
