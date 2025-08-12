import CryptoJS from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';

// Encryption key (in production this should be an environment variable)
const ENCRYPTION_KEY = 'your-secure-encryption-key';

// Store used nonces to prevent replay attacks
const usedNonces = new Set<string>();
const nonceExpiry = new Map<string, number>();

// Rate limiting
const rateLimits = new Map<string, { count: number; resetTime: number }>();
const MAX_REQUESTS = 5; // Maximum requests per minute
const WINDOW_MS = 60000; // 1 minute window

// Clean up expired nonces periodically
setInterval(() => {
  const now = Date.now();
  for (const [nonce, expiry] of nonceExpiry.entries()) {
    if (now > expiry) {
      usedNonces.delete(nonce);
      nonceExpiry.delete(nonce);
    }
  }
}, 60000); // Clean up every minute

// Clean up rate limit data
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of rateLimits.entries()) {
    if (now > data.resetTime) {
      rateLimits.delete(ip);
    }
  }
}, 60000);

export interface SecurePayload {
  data: string;
  nonce: string;
  timestamp: number;
  signature: string;
}

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(ip) || { count: 0, resetTime: now + WINDOW_MS };

  if (now > limit.resetTime) {
    // Reset counter if window has expired
    limit.count = 1;
    limit.resetTime = now + WINDOW_MS;
  } else if (limit.count >= MAX_REQUESTS) {
    return false;
  } else {
    limit.count++;
  }

  rateLimits.set(ip, limit);
  return true;
}

export function encryptPayload(data: any): SecurePayload {
  const nonce = uuidv4();
  const timestamp = Date.now();
  
  // Store nonce with expiry
  usedNonces.add(nonce);
  nonceExpiry.set(nonce, timestamp + 300000); // 5 minute expiry
  
  // Convert data to string if it's an object
  const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
  
  // Create signature
  const signatureInput = `${dataStr}|${nonce}|${timestamp}|${ENCRYPTION_KEY}`;
  const signature = CryptoJS.HmacSHA256(signatureInput, ENCRYPTION_KEY).toString();
  
  // Encrypt the data
  const encryptedData = CryptoJS.AES.encrypt(dataStr, ENCRYPTION_KEY).toString();
  
  return {
    data: encryptedData,
    nonce,
    timestamp,
    signature
  };
}

export function decryptPayload(payload: SecurePayload): any {
  try {
    const { data, nonce, timestamp, signature } = payload;
    const now = Date.now();
    
    // Check timestamp (5 minute window)
    if (now - timestamp > 300000) {
      throw new Error('Request expired');
    }
    
    // Check for replay attack
    if (usedNonces.has(nonce)) {
      throw new Error('Invalid nonce');
    }
    
    // Decrypt data
    const decryptedBytes = CryptoJS.AES.decrypt(data, ENCRYPTION_KEY);
    const decryptedData = decryptedBytes.toString(CryptoJS.enc.Utf8);
    
    // Verify signature
    const signatureInput = `${decryptedData}|${nonce}|${timestamp}|${ENCRYPTION_KEY}`;
    const expectedSignature = CryptoJS.HmacSHA256(signatureInput, ENCRYPTION_KEY).toString();
    
    if (signature !== expectedSignature) {
      throw new Error('Invalid signature');
    }
    
    // Store nonce to prevent replay
    usedNonces.add(nonce);
    nonceExpiry.set(nonce, now + 300000);
    
    return JSON.parse(decryptedData);
  } catch (error) {
    console.error('Payload decryption failed:', error);
    throw new Error('Invalid payload');
  }
}

// Obfuscate error messages to prevent information leakage
export function getSecurityError(): string {
  return 'Invalid request';
}
