import { describe, expect, it } from 'vitest';
import { LICENSE_REJECTION_REASONS } from '../../domain/licensing/index.js';
import {
  classifyLicenseApiResponse,
  parseActivationSuccess,
  parseValidationSuccess,
} from './license-api-response.js';

const VALID_VALIDATION_BODY = JSON.stringify({
  valid_until: '2026-12-31T00:00:00Z',
  subscription_status: 'active',
});

const VALID_ACTIVATION_BODY = JSON.stringify({
  activation_id: '550e8400-e29b-41d4-a716-446655440000',
  valid_until: '2026-12-31T00:00:00Z',
  devices_used: 2,
  devices_limit: 3,
  deactivated_device: null,
});

function classify(statusCode: number, bodyText: string) {
  return classifyLicenseApiResponse(statusCode, bodyText, parseValidationSuccess);
}

describe('classifyLicenseApiResponse', () => {
  describe('2xx', () => {
    it('is a success when the body parses into the expected shape', () => {
      expect(classify(200, VALID_VALIDATION_BODY)).toEqual({
        kind: 'success',
        data: { validUntil: new Date('2026-12-31T00:00:00Z'), subscriptionStatus: 'active' },
      });
    });

    it('is a success for an activation body', () => {
      const outcome = classifyLicenseApiResponse(
        200,
        VALID_ACTIVATION_BODY,
        parseActivationSuccess
      );

      expect(outcome.kind).toBe('success');
      if (outcome.kind === 'success') {
        expect(outcome.data.activationId.toString()).toBe('550e8400-e29b-41d4-a716-446655440000');
        expect(outcome.data.devicesUsed).toBe(2);
        expect(outcome.data.devicesLimit).toBe(3);
        expect(outcome.data.deactivatedDevice).toBeNull();
      }
    });

    it.each([
      ['an empty body', ''],
      ['a non-JSON body', '<html>OK</html>'],
      ['a JSON body that is not an object', '"ok"'],
      ['a body with missing fields', JSON.stringify({ subscription_status: 'active' })],
      [
        'a body with an unparsable date',
        JSON.stringify({ valid_until: 'not a date', subscription_status: 'active' }),
      ],
    ])('is no response for %s', (_label, body) => {
      expect(classify(200, body)).toEqual({ kind: 'no-response' });
    });

    it('is no response for an activation body with a malformed activation id', () => {
      const body = JSON.stringify({ ...JSON.parse(VALID_ACTIVATION_BODY), activation_id: 'x' });

      expect(classifyLicenseApiResponse(200, body, parseActivationSuccess)).toEqual({
        kind: 'no-response',
      });
    });
  });

  describe('4xx', () => {
    it.each(LICENSE_REJECTION_REASONS)('is rejected with %s', (reason) => {
      expect(classify(400, JSON.stringify({ type: reason }))).toEqual({
        kind: 'rejected',
        reason,
      });
    });

    it('is rejected for other 4xx status codes with a known type', () => {
      expect(classify(403, JSON.stringify({ type: 'LICENSE_EXPIRED' }))).toEqual({
        kind: 'rejected',
        reason: 'LICENSE_EXPIRED',
      });
    });

    it.each([404, 410])('is no response for %i whatever the body', (status) => {
      expect(classify(status, '')).toEqual({ kind: 'no-response' });
      expect(classify(status, '<html>Not Found</html>')).toEqual({ kind: 'no-response' });
      for (const reason of LICENSE_REJECTION_REASONS) {
        expect(classify(status, JSON.stringify({ type: reason }))).toEqual({
          kind: 'no-response',
        });
      }
    });

    it.each([
      ['no body', ''],
      ['a non-JSON body', '<html><body>Bad Request</body></html>'],
      ['an unknown type', JSON.stringify({ type: 'SOMETHING_ELSE' })],
      ['a non-string type', JSON.stringify({ type: 42 })],
      ['a JSON body without type', JSON.stringify({ message: 'bad request' })],
      ['a JSON array', JSON.stringify(['INVALID_LICENSE_KEY'])],
    ])('is no response for 400 with %s', (_label, body) => {
      expect(classify(400, body)).toEqual({ kind: 'no-response' });
    });
  });

  describe('other status codes', () => {
    it.each([500, 502, 503, 504])('is no response for %i', (status) => {
      expect(classify(status, JSON.stringify({ type: 'LICENSE_EXPIRED' }))).toEqual({
        kind: 'no-response',
      });
    });

    it('is no response for status 0 (transport failure)', () => {
      expect(classify(0, '')).toEqual({ kind: 'no-response' });
    });

    it.each([100, 301, 304])('is no response for %i', (status) => {
      expect(classify(status, VALID_VALIDATION_BODY)).toEqual({ kind: 'no-response' });
    });
  });
});
