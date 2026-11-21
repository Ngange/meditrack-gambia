// A small in-memory request limiter, per client IP. Good enough for a single server; with several
// servers behind a load balancer the counts would need to live in a shared store.
//
// onlyFailures: count only requests that end in an error (4xx), so normal use is never slowed
// but someone guessing links gets blocked quickly.
function rateLimit({ windowMs, max, onlyFailures = false, message = 'Too many requests. Please wait a few minutes and try again.' }) {
  const hits = new Map(); // ip -> { count, resetAt }

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [ip, h] of hits) if (h.resetAt <= now) hits.delete(ip);
  }, windowMs);
  timer.unref();

  const current = (ip) => {
    const h = hits.get(ip);
    return h && h.resetAt > Date.now() ? h : null;
  };
  const bump = (ip) => {
    const h = current(ip) || { count: 0, resetAt: Date.now() + windowMs };
    h.count += 1;
    hits.set(ip, h);
  };

  return (req, res, next) => {
    const ip = req.ip;
    const h = current(ip);
    if (h && h.count >= max) {
      res.set('Retry-After', String(Math.ceil((h.resetAt - Date.now()) / 1000)));
      return res.status(429).json({ error: message });
    }
    if (onlyFailures) res.on('finish', () => res.statusCode >= 400 && bump(ip));
    else bump(ip);
    next();
  };
}

module.exports = rateLimit;
