export function validateOrigin(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  
  try {
    const originUrl = new URL(origin);
    return allowedOrigins.some(allowed => {
      const allowedUrl = new URL(allowed);
      return originUrl.hostname === allowedUrl.hostname;
    });
  } catch {
    return false;
  }
}