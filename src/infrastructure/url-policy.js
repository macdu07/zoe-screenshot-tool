import dns from 'node:dns/promises';
import net from 'node:net';
import { ForbiddenTargetError, ValidationError } from '../errors.js';

const BLOCKED_HOSTNAMES = new Set(['localhost', 'localhost.localdomain', 'metadata.google.internal']);

function ipv4ToNumber(address) {
  return address.split('.').reduce((value, octet) => (value * 256) + Number(octet), 0) >>> 0;
}

function inV4Range(address, base, bits) {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToNumber(address) & mask) === (ipv4ToNumber(base) & mask);
}

export function isPrivateAddress(address) {
  const version = net.isIP(address);
  if (version === 4) {
    return [
      ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
      ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
      ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
      ['224.0.0.0', 4], ['240.0.0.0', 4]
    ].some(([base, bits]) => inV4Range(address, base, bits));
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    return normalized === '::' || normalized === '::1' || normalized.startsWith('fc') ||
      normalized.startsWith('fd') || /^fe[89ab]/.test(normalized) || normalized.startsWith('ff') ||
      normalized.startsWith('2001:db8:') || normalized.startsWith('::ffff:127.') ||
      normalized.startsWith('::ffff:10.') || normalized.startsWith('::ffff:192.168.');
  }
  return true;
}

export function normalizeHttpUrl(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') throw new ValidationError('Please provide a valid website URL');
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(inputUrl.trim()) ? inputUrl.trim() : `https://${inputUrl.trim()}`;
  let parsed;
  try { parsed = new URL(candidate); } catch { throw new ValidationError(`Invalid URL format: "${inputUrl}"`); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new ForbiddenTargetError('Only HTTP and HTTPS URLs are allowed');
  if (parsed.username || parsed.password) throw new ForbiddenTargetError('URLs containing credentials are not allowed');
  return parsed.href;
}

export async function assertSafeUrl(inputUrl, { allowPrivate = false, lookup = dns.lookup } = {}) {
  const normalized = normalizeHttpUrl(inputUrl);
  const { hostname } = new URL(normalized);
  if (allowPrivate) return normalized;
  if (BLOCKED_HOSTNAMES.has(hostname.toLowerCase()) || hostname.toLowerCase().endsWith('.localhost')) {
    throw new ForbiddenTargetError();
  }
  let addresses;
  try { addresses = await lookup(hostname, { all: true, verbatim: true }); }
  catch (cause) { throw new ValidationError(`Could not resolve target hostname: ${hostname}`, 'DNS_FAILED'); }
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new ForbiddenTargetError();
  return normalized;
}
