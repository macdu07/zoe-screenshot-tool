import crypto from 'node:crypto';
import { config } from '../config.js';

const COOKIE_NAME = 'zoe_client';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function sign(value) {
  return crypto.createHmac('sha256', config.clientIdSecret).update(value).digest('base64url');
}

function safeEqual(left, right) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function readCookie(header) {
  const pair = (header || '').split(';').map((item) => item.trim()).find((item) => item.startsWith(`${COOKIE_NAME}=`));
  if (!pair) return null;
  try { return decodeURIComponent(pair.slice(COOKIE_NAME.length + 1)); } catch { return null; }
}

export function resolveAnonymousClient(cookieHeader) {
  const token = readCookie(cookieHeader);
  if (token) {
    const separator = token.lastIndexOf('.');
    if (separator > 0) {
      const id = token.slice(0, separator);
      const signature = token.slice(separator + 1);
      if (/^[a-f0-9]{32}$/.test(id) && safeEqual(signature, sign(id))) return { id, token, isNew: false };
    }
  }
  const id = crypto.randomBytes(16).toString('hex');
  return { id, token: `${id}.${sign(id)}`, isNew: true };
}

export function anonymousClient(req, res, next) {
  const client = resolveAnonymousClient(req.headers.cookie);
  req.captureOwnerId = crypto.createHash('sha256').update(client.id).digest('hex');
  if (client.isNew) {
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.append('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(client.token)}; Max-Age=${MAX_AGE_SECONDS}; Path=/; HttpOnly; SameSite=Lax${secure}`);
  }
  next();
}
