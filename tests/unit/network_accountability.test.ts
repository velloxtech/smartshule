import { getClientIp, getClientMacAddress, resolveNetworkIdentity, buildAuditLogFromRequest } from '../../src/infrastructure/utils/networkAccountability';
import { SystemLog } from '../../src/core/domain/system-log/SystemLog';

describe('Network Accountability & IP / MAC Tracking', () => {
  it('extracts real client IP from Cloudflare or X-Forwarded-For headers', () => {
    const mockReqCf: any = {
      headers: { 'cf-connecting-ip': '197.232.88.14' },
      socket: { remoteAddress: '127.0.0.1' }
    };
    expect(getClientIp(mockReqCf)).toBe('197.232.88.14');

    const mockReqForwarded: any = {
      headers: { 'x-forwarded-for': '105.160.22.18, 172.68.1.1' },
      socket: { remoteAddress: '127.0.0.1' }
    };
    expect(getClientIp(mockReqForwarded)).toBe('105.160.22.18');

    const mockReqIpv6Mapped: any = {
      headers: {},
      ip: '::ffff:192.168.1.55',
      socket: { remoteAddress: '::ffff:192.168.1.55' }
    };
    expect(getClientIp(mockReqIpv6Mapped)).toBe('192.168.1.55');

    const mockReqLoopback: any = {
      headers: {},
      ip: '::1',
      socket: { remoteAddress: '::1' }
    };
    expect(getClientIp(mockReqLoopback)).toBe('127.0.0.1');
  });

  it('captures client MAC or hardware device identity', () => {
    // 1. Explicit MAC header
    const mockReqHeader: any = {
      headers: { 'x-client-mac': '00:1A:2B:3C:4D:5E' },
      socket: { remoteAddress: '192.168.1.20' }
    };
    expect(getClientMacAddress(mockReqHeader)).toBe('00:1A:2B:3C:4D:5E');

    // 2. Loopback address
    const mockReqLoopback: any = {
      headers: {},
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' }
    };
    expect(getClientMacAddress(mockReqLoopback)).toContain('Localhost Loopback');

    // 3. Client device fingerprint
    const mockReqFp: any = {
      headers: { 'x-device-fingerprint': 'DEV-A9B8C7D6-9812' },
      ip: '197.232.1.1',
      socket: { remoteAddress: '197.232.1.1' }
    };
    expect(getClientMacAddress(mockReqFp)).toBe('DEV-FP:DEV-A9B8C7D6-9812');
  });

  it('resolves complete network identity and builds audit log input', () => {
    const mockReq: any = {
      headers: {
        'x-forwarded-for': '41.89.24.1',
        'x-device-fingerprint': 'DEV-UNIQUE-HASH-99',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      user: {
        userId: 'usr-admin-01',
        email: 'admin@smartshule.ac.ke',
        role: 'ADMIN',
        schoolId: 'school-001'
      }
    };

    const identity = resolveNetworkIdentity(mockReq);
    expect(identity.ipAddress).toBe('41.89.24.1');
    expect(identity.macAddress).toBe('DEV-FP:DEV-UNIQUE-HASH-99');
    expect(identity.userAgent).toContain('Windows');

    const logInput = buildAuditLogFromRequest(mockReq, {
      category: 'FINANCE',
      action: 'PAYMENT_RECORDED',
      details: 'Recorded fee payment of KES 15,000'
    });

    expect(logInput.ipAddress).toBe('41.89.24.1');
    expect(logInput.macAddress).toBe('DEV-FP:DEV-UNIQUE-HASH-99');
    expect(logInput.actorUserId).toBe('usr-admin-01');
    expect(logInput.actorEmail).toBe('admin@smartshule.ac.ke');
  });

  it('creates SystemLog with macAddress property and toJSON serializes it', () => {
    const log = SystemLog.create(
      {
        action: 'UPDATE_STUDENT_STATUS',
        details: 'Promoted student to Grade 4',
        ipAddress: '192.168.1.100',
        macAddress: 'CC:2D:21:12:1B:38',
        actorEmail: 'teacher@smartshule.ac.ke'
      },
      'log-test-1'
    );

    expect(log.macAddress).toBe('CC:2D:21:12:1B:38');
    expect(log.ipAddress).toBe('192.168.1.100');

    const json = log.toJSON();
    expect(json.macAddress).toBe('CC:2D:21:12:1B:38');
    expect(json.ipAddress).toBe('192.168.1.100');
  });
});
