export type AIKitErrorCode =
  | 'INVALID_KEY'
  | 'CONTENT_POLICY'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export class AIKitError extends Error {
  constructor(
    public readonly code: AIKitErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AIKitError';
  }

  toJSON() {
    return { code: this.code, message: this.message };
  }
}

export function mapDashScopeError(raw: unknown): AIKitError {
  const r = raw as Record<string, unknown> | null | undefined;
  if (r && typeof r === 'object') {
    const code = typeof r.code === 'string' ? r.code : undefined;
    const message = typeof r.message === 'string' ? r.message : 'unknown';
    if (code === 'InvalidApiKey') return new AIKitError('INVALID_KEY', message, raw);
    if (code === 'DataInspectionFailed' || code === 'IPInfringementSuspect')
      return new AIKitError('CONTENT_POLICY', message, raw);
    if (code && code.startsWith('Throttling'))
      return new AIKitError('RATE_LIMITED', message, raw);
    if (code === 'ECONNABORTED' || code === 'ENETUNREACH' || code === 'ETIMEDOUT')
      return new AIKitError('NETWORK_ERROR', message, raw);
    return new AIKitError('UNKNOWN', message, raw);
  }
  return new AIKitError('UNKNOWN', 'unknown', raw);
}

export function httpStatusForCode(code: AIKitErrorCode): number {
  switch (code) {
    case 'CONTENT_POLICY': return 400;
    case 'RATE_LIMITED':   return 429;
    case 'NETWORK_ERROR':  return 502;
    case 'INVALID_KEY':    return 500;
    case 'UNKNOWN':        return 500;
  }
}
