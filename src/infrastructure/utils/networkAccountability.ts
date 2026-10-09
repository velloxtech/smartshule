import { Request } from 'express';
import fs from 'fs';
import { CreateSystemLogInput } from '../../application/system-logs/SystemLogUseCases';
import { AuthenticatedRequest } from '../http/middlewares/authMiddleware';

export interface NetworkIdentity {
  ipAddress: string;
  macAddress: string;
  deviceFingerprint?: string;
  userAgent?: string;
  isLocalLan: boolean;
}

/**
 * Strips IPv6-mapped IPv4 prefix (e.g. ::ffff:192.168.1.1) and normalizes loopbacks.
 */
function cleanIp(rawIp: string): string {
  let ip = rawIp.trim();
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  if (ip === '::1' || ip === '::') {
    return '127.0.0.1';
  }
  return ip;
}

/**
 * Resolves real client IP address from proxy headers (Cloudflare, AWS, Nginx, Render) or socket.
 */
export function getClientIp(req: Request): string {
  // 1. Cloudflare header
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp && typeof cfIp === 'string') {
    return cleanIp(cfIp);
  }

  // 2. Standard X-Forwarded-For (first entry is original client)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const list = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const client = list.split(',')[0].trim();
    if (client) {
      return cleanIp(client);
    }
  }

  // 3. X-Real-IP
  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') {
    return cleanIp(realIp);
  }

  // 4. Express req.ip or socket remote address
  const remote = req.ip || req.socket?.remoteAddress;
  if (remote) {
    return cleanIp(remote);
  }

  return '127.0.0.1';
}

/**
 * Tries to read the physical hardware MAC address from Linux kernel ARP cache (/proc/net/arp).
 * This works on local school LAN / intranet broadcast networks.
 */
function lookupArpMac(ip: string): string | null {
  try {
    if (!fs.existsSync('/proc/net/arp')) return null;
    const arpData = fs.readFileSync('/proc/net/arp', 'utf-8');
    const lines = arpData.split('\n');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      // Columns: IP address, HW type, Flags, HW address, Mask, Device
      const parts = line.split(/\s+/);
      if (parts.length >= 4) {
        const arpIp = parts[0];
        const hwAddr = parts[3];
        if (arpIp === ip && hwAddr && hwAddr !== '00:00:00:00:00:00') {
          return hwAddr.toUpperCase();
        }
      }
    }
  } catch {
    // Non-Linux or restricted environment
  }
  return null;
}

/**
 * Resolves the client MAC address or device hardware identity:
 * 1. Explicit MAC header sent by native/kiosk/mobile client (X-Client-MAC or X-Device-MAC)
 * 2. Local LAN ARP table (/proc/net/arp) on on-premise school network
 * 3. Client device fingerprint (X-Device-Fingerprint) from browser frontend
 * 4. Loopback (00:00:00:00:00:00 for localhost)
 * 5. Remote WAN (Router hop strips L2 MAC)
 */
export function getClientMacAddress(req: Request, clientIp?: string): string {
  const ip = clientIp || getClientIp(req);

  // 1. Explicit MAC header sent by client (e.g., Native / Kiosk / Electron / Mobile app)
  const headerMac = (
    req.headers['x-client-mac'] ||
    req.headers['x-device-mac'] ||
    req.headers['x-mac-address']
  );
  if (headerMac && typeof headerMac === 'string') {
    return headerMac.trim().toUpperCase();
  }

  // 2. Local LAN ARP lookup (if server & client are on the same local subnet)
  const arpMac = lookupArpMac(ip);
  if (arpMac) {
    return `${arpMac} (LAN-ARP)`;
  }

  // 3. Persistent Client Device Fingerprint header from frontend
  const deviceFp = req.headers['x-device-fingerprint'] || req.headers['x-client-device-id'];
  if (deviceFp && typeof deviceFp === 'string') {
    return `DEV-FP:${deviceFp.trim().substring(0, 32)}`;
  }

  // 4. Local loopback check
  if (ip === '127.0.0.1' || ip === 'localhost') {
    return '00:00:00:00:00:00 (Localhost Loopback)';
  }

  // 5. Remote WAN (Internet router hop strips L2 MAC)
  return 'REMOTE-WAN (Layer-3 Gateway Routed)';
}

/**
 * Resolves complete network accountability metadata from request
 */
export function resolveNetworkIdentity(req: Request): NetworkIdentity {
  const ipAddress = getClientIp(req);
  const macAddress = getClientMacAddress(req, ipAddress);
  const deviceFingerprint = (req.headers['x-device-fingerprint'] as string) || undefined;
  const userAgent = req.headers['user-agent'] || undefined;

  const isLocalLan =
    ipAddress === '127.0.0.1' ||
    ipAddress.startsWith('192.168.') ||
    ipAddress.startsWith('10.') ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ipAddress);

  return {
    ipAddress,
    macAddress,
    deviceFingerprint,
    userAgent,
    isLocalLan
  };
}

/**
 * Builds a CreateSystemLogInput with actor, IP, MAC address, and metadata extracted from the request.
 */
export function buildAuditLogFromRequest(
  req: AuthenticatedRequest,
  params: {
    category: CreateSystemLogInput['category'];
    action: string;
    details: string;
    level?: CreateSystemLogInput['level'];
    status?: CreateSystemLogInput['status'];
    metadata?: Record<string, any>;
    schoolId?: string;
  }
): CreateSystemLogInput {
  const identity = resolveNetworkIdentity(req);

  return {
    schoolId: params.schoolId || req.user?.schoolId || 'school-001',
    timestamp: new Date(),
    level: params.level || 'INFO',
    category: params.category,
    action: params.action,
    actorUserId: req.user?.userId,
    actorEmail: req.user?.email,
    actorRole: req.user?.role,
    ipAddress: identity.ipAddress,
    macAddress: identity.macAddress,
    status: params.status || 'SUCCESS',
    details: params.details,
    metadata: {
      ...(params.metadata || {}),
      userAgent: identity.userAgent,
      deviceFingerprint: identity.deviceFingerprint,
      isLocalLan: identity.isLocalLan
    }
  };
}
