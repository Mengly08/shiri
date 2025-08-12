import CryptoJS from 'crypto-js';

// Security configuration
const SECURITY_CONFIG = {
  requestTimeout: 30000, // 30 seconds
  maxRequestsPerMinute: 30,
  minRequestInterval: 1000, // 1 second
  proxyCheckEnabled: true,
  vpnCheckEnabled: true,
  signatureTimeout: 300000, // 5 minutes
  minPaymentAmount: 0.01, // Minimum payment amount in USD
  maxRetries: 3, // Maximum verification retries
  retryDelay: 2000, // Delay between retries in milliseconds
  maxFailedAttempts: 5, // Maximum failed attempts before IP block
  blockDuration: 3600000, // 1 hour block duration
  requestSignatureSecret: process.env.VITE_API_SECRET || 'default-secret-key'
};

// Request signature generation and validation
export function generateRequestSignature(data: any, timestamp: number): string {
  const payload = JSON.stringify({ ...data, timestamp });
  return CryptoJS.HmacSHA256(payload, SECURITY_CONFIG.requestSignatureSecret).toString();
}

export function validateRequestSignature(signature: string, data: any, timestamp: number): boolean {
  const now = Date.now();
  if (now - timestamp > SECURITY_CONFIG.signatureTimeout) {
    return false;
  }
  const expectedSignature = generateRequestSignature(data, timestamp);
  return signature === expectedSignature;
}

// Rate limiting with IP tracking
const requestHistory = new Map<string, number[]>();
const ipBlacklist = new Set<string>();

export function checkRateLimit(ip: string): boolean {
  // Check if IP is blacklisted
  if (ipBlacklist.has(ip)) {
    return false;
  }

  const now = Date.now();
  const history = requestHistory.get(ip) || [];
  
  // Clean old requests
  const recentHistory = history.filter(time => now - time < 60000);
  
  // Check rate limit
  if (recentHistory.length >= SECURITY_CONFIG.maxRequestsPerMinute) {
    // Add to blacklist if consistently hitting limit
    if (recentHistory.length >= SECURITY_CONFIG.maxRequestsPerMinute * 2) {
      ipBlacklist.add(ip);
      setTimeout(() => ipBlacklist.delete(ip), SECURITY_CONFIG.blockDuration);
    }
    return false;
  }
  
  // Check request interval
  if (recentHistory.length > 0 && 
      now - recentHistory[recentHistory.length - 1] < SECURITY_CONFIG.minRequestInterval) {
    return false;
  }
  
  // Update history
  recentHistory.push(now);
  requestHistory.set(ip, recentHistory);
  return true;
}

// Enhanced promo code validation
export function validatePromoCode(code: string, amount: number): boolean {
  // Minimum amount check
  if (amount < SECURITY_CONFIG.minPaymentAmount) {
    return false;
  }
  
  // Code format validation (only allow specific formats)
  const validFormat = /^[A-Z0-9]{6,12}$/;
  if (!validFormat.test(code)) {
    return false;
  }
  
  return true;
}

// Enhanced proxy detection
export async function detectProxy(ip: string): Promise<boolean> {
  if (!SECURITY_CONFIG.proxyCheckEnabled) return false;
  
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await response.json();
    
    // Check for proxy indicators
    const isProxy = data.proxy === true || 
                   data.hosting === true ||
                   data.type === 'vpn' ||
                   data.type === 'tor' ||
                   data.security?.vpn === true;

    if (isProxy) {
      ipBlacklist.add(ip);
    }

    return isProxy;
  } catch (error) {
    console.error('Proxy detection error:', error);
    return false;
  }
}

// Request validation with enhanced security
export function validateRequest(req: any): { valid: boolean; error?: string } {
  const timestamp = parseInt(req.headers['x-request-timestamp']);
  const signature = req.headers['x-request-signature'];
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0] || 'unknown';
  
  // Check timestamp
  if (!timestamp || Date.now() - timestamp > SECURITY_CONFIG.requestTimeout) {
    return { valid: false, error: 'Request expired' };
  }
  
  // Validate signature
  if (!signature || !validateRequestSignature(signature, req.body, timestamp)) {
    // Add to blacklist after multiple invalid signatures
    const invalidAttempts = requestHistory.get(clientIp)?.length || 0;
    if (invalidAttempts >= SECURITY_CONFIG.maxFailedAttempts) {
      ipBlacklist.add(clientIp);
    }
    return { valid: false, error: 'Invalid signature' };
  }
  
  // Check rate limit
  if (!checkRateLimit(clientIp)) {
    return { valid: false, error: 'Rate limit exceeded' };
  }
  
  return { valid: true };
}

// Order hash validation
const orderHashes = new Set<string>();

export function validateOrderHash(hash: string): boolean {
  if (orderHashes.has(hash)) {
    return false;
  }
  orderHashes.add(hash);
  // Clean up old hashes after 24 hours
  setTimeout(() => orderHashes.delete(hash), 86400000);
  return true;
}

// Payment verification with retry mechanism
export async function verifyPayment(md5: string, amount: number): Promise<boolean> {
  if (amount < SECURITY_CONFIG.minPaymentAmount) {
    return false;
  }

  for (let attempt = 0; attempt < SECURITY_CONFIG.maxRetries; attempt++) {
    try {
      const verificationToken = crypto.randomUUID();
      const timestamp = Date.now();
      
      const response = await fetch('/api/verify-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Request-Timestamp': timestamp.toString(),
          'X-Request-Signature': generateRequestSignature({ md5, amount }, timestamp),
          'X-Verification-Token': verificationToken
        },
        body: JSON.stringify({ md5, amount, verificationToken })
      });

      if (!response.ok) {
        throw new Error(`Verification failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Verify response token
      if (data.verificationToken !== verificationToken) {
        throw new Error('Response verification failed');
      }

      return data.success;
    } catch (error) {
      console.error(`Payment verification attempt ${attempt + 1} failed:`, error);
      if (attempt < SECURITY_CONFIG.maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, SECURITY_CONFIG.retryDelay));
      }
    }
  }

  return false;
}

// Security headers
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' https:; script-src 'self' 'unsafe-inline'; connect-src 'self' https://api-bakong.nbc.gov.kh https://ipapi.co; frame-ancestors 'none';",
  'X-Content-Security-Policy': "default-src 'self'",
  'X-WebKit-CSP': "default-src 'self'",
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin'
};
