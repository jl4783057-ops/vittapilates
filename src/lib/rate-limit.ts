
interface RateLimitRecord {
  count: number;
  resetAt: number;
  blockedUntil?: number;
}

// Armazenamento em memória por chave (ex: IP ou IP:ação)
const store = new Map<string, RateLimitRecord>();

// Limpeza periódica de chaves expiradas para evitar vazamento de memória
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetAt && (!record.blockedUntil || now > record.blockedUntil)) {
        store.delete(key);
      }
    }
  }, 60_000);
}

export interface RateLimitOptions {
  /** Quantidade máxima de requisições permitidas na janela */
  maxRequests: number;
  /** Duração da janela em segundos */
  windowSeconds: number;
  /** Tempo de bloqueio temporário em segundos após estourar o limite (opcional) */
  blockDurationSeconds?: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetSeconds: number;
  retryAfterSeconds?: number;
}

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const blockMs = (options.blockDurationSeconds ?? options.windowSeconds) * 1000;

  const record = store.get(key);

  if (!record || now > record.resetAt) {
    // Nova janela
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      success: true,
      remaining: options.maxRequests - 1,
      resetSeconds: options.windowSeconds,
    };
  }

  // Verifica se está temporariamente bloqueado
  if (record.blockedUntil && now < record.blockedUntil) {
    const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
    return {
      success: false,
      remaining: 0,
      resetSeconds: Math.ceil((record.resetAt - now) / 1000),
      retryAfterSeconds: retryAfter,
    };
  }

  record.count += 1;

  if (record.count > options.maxRequests) {
    record.blockedUntil = now + blockMs;
    const retryAfter = Math.ceil(blockMs / 1000);
    return {
      success: false,
      remaining: 0,
      resetSeconds: Math.ceil((record.resetAt - now) / 1000),
      retryAfterSeconds: retryAfter,
    };
  }

  return {
    success: true,
    remaining: Math.max(0, options.maxRequests - record.count),
    resetSeconds: Math.ceil((record.resetAt - now) / 1000),
  };
}

export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();
  return "127.0.0.1";
}
