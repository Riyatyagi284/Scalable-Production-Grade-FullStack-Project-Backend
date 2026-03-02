export const CacheKeys = {
  // Idempotency keys
  idempotency: (key: string) => `idempotency:${key}`,
  
  // Order related
  order: (orderId: string) => `order:${orderId}`,
  customerOrders: (customerId: string) => `customer:${customerId}:orders`,
  tenantOrders: (tenantId: string) => `tenant:${tenantId}:orders`,
  
  // Product related(not used yet anywhere)
  product: (productId: string) => `product:${productId}`,
  products: (tenantId: string, category?: string) => 
    category ? `tenant:${tenantId}:products:${category}` : `tenant:${tenantId}:products`,
  
  // Customer related
  customer: (customerId: string) => `customer:${customerId}`,
  
  // Coupon related(not used yet anywhere)
  coupon: (code: string, tenantId: string) => `coupon:${tenantId}:${code}`,
  
  // Rate limiting
  rateLimit: (ip: string, endpoint: string) => `ratelimit:${endpoint}:${ip}`,
  
  // Locks
  lock: (resource: string) => `lock:${resource}`,
  
  // Pattern for clearing
  pattern: {
    customer: (customerId: string) => `customer:${customerId}:*`,
    tenant: (tenantId: string) => `tenant:${tenantId}:*`,
    all: () => '*'
  }
};