import { describe, it, expect } from 'vitest';
import { AIKitError, mapDashScopeError } from '@/lib/errors';

describe('mapDashScopeError', () => {
  it('maps InvalidApiKey → INVALID_KEY', () => {
    const err = mapDashScopeError({ code: 'InvalidApiKey', message: 'bad key' });
    expect(err).toBeInstanceOf(AIKitError);
    expect(err.code).toBe('INVALID_KEY');
  });

  it('maps DataInspectionFailed → CONTENT_POLICY', () => {
    const err = mapDashScopeError({ code: 'DataInspectionFailed', message: 'sensitive' });
    expect(err.code).toBe('CONTENT_POLICY');
  });

  it('maps IPInfringementSuspect → CONTENT_POLICY', () => {
    const err = mapDashScopeError({ code: 'IPInfringementSuspect', message: 'ip' });
    expect(err.code).toBe('CONTENT_POLICY');
  });

  it('maps Throttling.* → RATE_LIMITED', () => {
    const err = mapDashScopeError({ code: 'Throttling.RateQuota', message: 'slow down' });
    expect(err.code).toBe('RATE_LIMITED');
  });

  it('maps ECONNABORTED → NETWORK_ERROR', () => {
    const err = mapDashScopeError({ code: 'ECONNABORTED', message: 'timeout' });
    expect(err.code).toBe('NETWORK_ERROR');
  });

  it('falls back to UNKNOWN', () => {
    const err = mapDashScopeError({ message: 'weird' });
    expect(err.code).toBe('UNKNOWN');
  });
});
