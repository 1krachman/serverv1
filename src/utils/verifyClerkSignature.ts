import crypto from 'crypto';

const CLERK_WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET!;

export function verifyClerkSignature(payload: string, signature: string): boolean {
  const hmac = crypto.createHmac('sha256', CLERK_WEBHOOK_SECRET);
  const digest = hmac.update(payload).digest('base64');
  return digest === signature;
}
