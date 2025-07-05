const rateLimit = new Map();

export function checkRateLimit(identifier, maxRequests = 5, windowMs = 600000) { // 10 menit
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!rateLimit.has(identifier)) {
    rateLimit.set(identifier, []);
  }
  
  const requests = rateLimit.get(identifier).filter(time => time > windowStart);
  
  if (requests.length >= maxRequests) {
    return false;
  }
  
  requests.push(now);
  rateLimit.set(identifier, requests);
  return true;
} 