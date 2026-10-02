import { describe, expect, it } from 'vitest';
import { ActivationId, DeviceId, LicenseKey } from '../../domain/licensing/index.js';
import {
  buildActivationRequest,
  buildProbeRequest,
  buildValidationRequest,
} from './license-api-request.js';

describe('license API requests', () => {
  it('builds an activation request', () => {
    expect(
      buildActivationRequest(
        new LicenseKey('TEST-LICENSE-KEY-123'),
        new DeviceId('test-device-001'),
        'Test Device'
      )
    ).toEqual({
      license_key: 'TEST-LICENSE-KEY-123',
      device_id: 'test-device-001',
      device_label: 'Test Device',
    });
  });

  it('builds a validation request', () => {
    expect(
      buildValidationRequest(
        new LicenseKey('TEST-LICENSE-KEY-123'),
        new ActivationId('550e8400-e29b-41d4-a716-446655440000')
      )
    ).toEqual({
      license_key: 'TEST-LICENSE-KEY-123',
      activation_id: '550e8400-e29b-41d4-a716-446655440000',
    });
  });

  it('sends an empty license key and an empty activation id in the probe request', () => {
    expect(buildProbeRequest()).toEqual({ license_key: '', activation_id: '' });
  });
});
